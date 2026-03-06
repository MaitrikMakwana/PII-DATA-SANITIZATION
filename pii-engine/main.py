"""
Pii Sanitizer — PII Detection & Redaction Engine

FastAPI service that provides:
  POST /analyze  — detect PII entities in a file (PDF, DOCX, TXT, SQL)
  POST /sanitize — redact PII and return the sanitized file bytes
  GET  /health   — health check

Powered by Microsoft Presidio + spaCy.
"""

import io
import json
import logging
import re
import time
from collections import Counter
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer, RecognizerResult
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_analyzer.predefined_recognizers.country_specific.india import (
    InAadhaarRecognizer,
    InGstinRecognizer,
    InPanRecognizer,
    InPassportRecognizer,
    InVehicleRegistrationRecognizer,
    InVoterRecognizer,
)
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

import pdfplumber
import fitz  # PyMuPDF — for in-place PDF redaction
from docx import Document

from parsers import extract_text, get_image_ocr_cache
from PIL import Image, ImageDraw

# ─── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pii-engine")

# ─── Initialize engines ONCE at startup ──────────────────────────────────────

logger.info("Loading spaCy model (en_core_web_lg) ...")

nlp_config = {
    "nlp_engine_name": "spacy",
    "models": [{"lang_code": "en", "model_name": "en_core_web_lg"}],
}
nlp_engine = NlpEngineProvider(nlp_configuration=nlp_config).create_engine()

analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])

# ─── Custom recognizers ──────────────────────────────────────────────────────

# Indian phone number:  +91-XXXXXXXXXX, +91 XXXXXXXXXX, 0XX-XXXXXXXX, 10-digit mobile
indian_phone_recognizer = PatternRecognizer(
    supported_entity="PHONE_NUMBER",
    name="IndianPhoneRecognizer",
    patterns=[
        Pattern("IN_PHONE_INTL", r"(?:\+91[\-\s]?)?[6-9]\d{9}\b", 0.7),
        Pattern("IN_PHONE_LANDLINE", r"\b0\d{2,4}[\-\s]?\d{6,8}\b", 0.5),
    ],
    context=["phone", "mobile", "contact", "call", "tel", "number"],
    supported_language="en",
)

# Aadhaar — only match exactly 12 digits in 3 groups of 4 (not 4+ groups like credit cards)
aadhaar_recognizer = PatternRecognizer(
    supported_entity="IN_AADHAAR",
    name="EnhancedAadhaarRecognizer",
    patterns=[
        # Exactly 3 groups of 4 digits, NOT followed by another digit group
        Pattern("AADHAAR_FORMATTED", r"\b\d{4}[\s\-:]\d{4}[\s\-:]\d{4}\b(?![\s\-:]\d)", 0.6),
        Pattern("AADHAAR_PLAIN", r"\b\d{12}\b", 0.3),
    ],
    context=["aadhaar", "aadhar", "uid", "uidai", "unique identification"],
    supported_language="en",
)

# US SSN
us_ssn_recognizer = PatternRecognizer(
    supported_entity="US_SSN",
    name="UsSsnRecognizer",
    patterns=[
        Pattern("SSN_DASHES", r"\b\d{3}-\d{2}-\d{4}\b", 0.7),
        Pattern("SSN_SPACES", r"\b\d{3}\s\d{2}\s\d{4}\b", 0.5),
    ],
    context=["ssn", "social security", "social security number"],
    supported_language="en",
)

# Credit card — with Luhn validation
from presidio_analyzer import LocalRecognizer

class CreditCardPatternRecognizer(LocalRecognizer):
    """Detect credit card numbers in various formats with Luhn checksum."""

    PATTERNS = [
        Pattern("CC_DASHES", r"(?<![0-9])\d{4}-\d{4}-\d{4}-\d{4}(?![0-9])", 0.5),
        Pattern("CC_SPACES", r"(?<![0-9])\d{4}\s\d{4}\s\d{4}\s\d{4}(?![0-9])", 0.5),
        Pattern("CC_PLAIN", r"\b\d{13,19}\b", 0.1),
    ]

    def __init__(self):
        super().__init__(
            supported_entities=["CREDIT_CARD"],
            supported_language="en",
            name="CustomCreditCardRecognizer",
        )

    @staticmethod
    def _luhn_check(number: str) -> bool:
        digits = [int(d) for d in number if d.isdigit()]
        if len(digits) < 13 or len(digits) > 19:
            return False
        checksum = 0
        reverse_digits = digits[::-1]
        for i, d in enumerate(reverse_digits):
            if i % 2 == 1:
                d *= 2
                if d > 9:
                    d -= 9
            checksum += d
        return checksum % 10 == 0

    def load(self):
        pass

    def analyze(self, text, entities, nlp_artifacts):
        import re
        results = []
        for pattern in self.PATTERNS:
            for match in re.finditer(pattern.regex, text):
                raw = match.group()
                if self._luhn_check(raw):
                    score = 1.0  # Luhn-valid = high confidence
                else:
                    score = max(pattern.score, 0.4)  # format match = moderate confidence
                results.append(
                    RecognizerResult(
                        entity_type="CREDIT_CARD",
                        start=match.start(),
                        end=match.end(),
                        score=score,
                    )
                )
        return results

credit_card_recognizer = CreditCardPatternRecognizer()

# Register India-specific recognizers (built-in)
india_recognizers = [
    InAadhaarRecognizer(),
    InPanRecognizer(),
    InGstinRecognizer(),
    InPassportRecognizer(),
    InVehicleRegistrationRecognizer(),
    InVoterRecognizer(),
]
for rec in india_recognizers:
    analyzer.registry.add_recognizer(rec)

# Register custom recognizers
analyzer.registry.add_recognizer(indian_phone_recognizer)
analyzer.registry.add_recognizer(aadhaar_recognizer)
analyzer.registry.add_recognizer(us_ssn_recognizer)
analyzer.registry.add_recognizer(credit_card_recognizer)

anonymizer = AnonymizerEngine()

logger.info("Engines ready. Supported entities: %s", analyzer.get_supported_entities())

# ─── FastAPI app ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Pii Sanitizer Engine",
    version="1.0.0",
    description="PII detection and redaction for PDF, DOCX, TXT, and SQL files.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Minimum confidence threshold ────────────────────────────────────────────

SCORE_THRESHOLD = 0.35

# ─── Helper: deduplicate / merge overlapping results ─────────────────────────

# Higher priority types win when spans overlap (higher number = higher priority)
ENTITY_PRIORITY = {
    "CREDIT_CARD": 12,
    "IN_GSTIN": 11,
    "US_SSN": 10,
    "PHONE_NUMBER": 9,
    "EMAIL_ADDRESS": 9,
    "IP_ADDRESS": 9,
    "IN_PAN": 8,
    "IN_VEHICLE_REGISTRATION": 8,
    "IN_PASSPORT": 7,
    "IN_AADHAAR": 6,
    "IN_VOTER": 6,
    "PERSON": 5,
    "LOCATION": 4,
    "ORGANIZATION": 3,
    "DATE_TIME": 2,
    "NRP": 1,
}


def _rank(r: RecognizerResult) -> tuple:
    """Rank a result: prefer type priority, then score, then longer span."""
    span_len = r.end - r.start
    priority = ENTITY_PRIORITY.get(r.entity_type, 0)
    return (priority, r.score, span_len)


def deduplicate(results: list[RecognizerResult]) -> list[RecognizerResult]:
    """Remove overlapping detections — keep longer, higher-priority match."""
    if not results:
        return []
    sorted_results = sorted(results, key=lambda r: r.start)
    merged: list[RecognizerResult] = [sorted_results[0]]
    for current in sorted_results[1:]:
        prev = merged[-1]
        if current.start < prev.end:
            # Overlap — keep the one that ranks higher
            if _rank(current) > _rank(prev):
                merged[-1] = current
        else:
            merged.append(current)
    return merged


# ═════════════════════════════════════════════════════════════════════════════
#  POST /analyze
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    Detect PII entities in the uploaded file.

    Returns:
        {
          "entities": [ { "type", "text", "start", "end", "score" }, ... ],
          "stats": { "total": N, "by_type": { "EMAIL_ADDRESS": 2, ... } }
        }
    """
    start_time = time.time()

    # Read file
    data = await file.read()
    filename = file.filename or "unknown"
    content_type = file.content_type or "application/octet-stream"

    logger.info("Analyze request — file=%s, type=%s, size=%d bytes", filename, content_type, len(data))

    # Extract text
    try:
        text = extract_text(data, content_type, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    logger.info("Extracted %d characters of text", len(text))

    # Run Presidio analyzer
    raw_results = analyzer.analyze(
        text=text,
        language="en",
        score_threshold=SCORE_THRESHOLD,
    )

    results = deduplicate(raw_results)

    # Build response
    entities = []
    for r in results:
        entities.append({
            "type": r.entity_type,
            "text": text[r.start : r.end],
            "start": r.start,
            "end": r.end,
            "score": round(r.score, 4),
        })

    by_type: dict[str, int] = dict(Counter(e["type"] for e in entities))

    elapsed = round(time.time() - start_time, 3)
    logger.info(
        "Analyze complete — %d entities found in %.3fs (types: %s)",
        len(entities), elapsed, by_type,
    )

    return {
        "entities": entities,
        "stats": {
            "total": len(entities),
            "by_type": by_type,
        },
    }


# ═════════════════════════════════════════════════════════════════════════════
#  POST /sanitize
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/sanitize")
async def sanitize(
    file: UploadFile = File(...),
    entities: str = Form(...),
):
    """
    Redact PII from the uploaded file and return the sanitized version.

    Expects:
      - file: the original file
      - entities: JSON string — the entities array from /analyze

    Returns: file bytes (same format as input) with PII replaced by [ENTITY_TYPE]
    """
    start_time = time.time()

    data = await file.read()
    filename = file.filename or "unknown"
    content_type = file.content_type or "application/octet-stream"

    logger.info("Sanitize request — file=%s, type=%s", filename, content_type)

    # Parse entities
    try:
        entity_list = json.loads(entities)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid entities JSON")

    ext = ""
    if "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()

    output_bytes: bytes
    output_mime: str

    if content_type == "application/pdf" or ext == "pdf":
        output_bytes = _sanitize_pdf_inplace(data, entity_list)
        output_mime = "application/pdf"

    elif (
        content_type
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        or ext == "docx"
    ):
        output_bytes = _sanitize_docx_inplace(data, entity_list)
        output_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    elif content_type in ("image/png", "image/jpeg") or ext in ("png", "jpg", "jpeg"):
        output_bytes = _sanitize_image(data, entity_list)
        output_mime = "image/png"

    else:
        # Text-based formats (SQL, TXT, CSV, etc.) — use Presidio anonymizer
        try:
            text = extract_text(data, content_type, filename)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        recognizer_results = []
        for ent in entity_list:
            recognizer_results.append(
                RecognizerResult(
                    entity_type=ent["type"],
                    start=ent["start"],
                    end=ent["end"],
                    score=ent.get("score", 1.0),
                )
            )

        operators = {"DEFAULT": OperatorConfig("replace", {"new_value": "[REDACTED]"})}
        for ent in entity_list:
            entity_type = ent["type"]
            if entity_type not in operators:
                operators[entity_type] = OperatorConfig(
                    "replace", {"new_value": f"[{entity_type}]"}
                )

        anonymized = anonymizer.anonymize(
            text=text,
            analyzer_results=recognizer_results,
            operators=operators,
        )
        redacted_text = anonymized.text

        if ext == "sql" or content_type in ("text/sql", "application/sql", "application/x-sql"):
            output_bytes = redacted_text.encode("utf-8")
            output_mime = "text/sql"
        else:
            output_bytes = redacted_text.encode("utf-8")
            output_mime = "text/plain"

    elapsed = round(time.time() - start_time, 3)
    logger.info(
        "Sanitize complete — %d entities redacted in %.3fs, output %d bytes",
        len(entity_list), elapsed, len(output_bytes),
    )

    # Fix filename extension for image outputs
    out_filename = filename
    if output_mime == "image/png" and not filename.lower().endswith(".png"):
        out_filename = filename.rsplit(".", 1)[0] + ".png" if "." in filename else filename + ".png"

    return Response(
        content=output_bytes,
        media_type=output_mime,
        headers={
            "Content-Disposition": f'attachment; filename="sanitized_{out_filename}"',
        },
    )


# ═════════════════════════════════════════════════════════════════════════════
#  POST /analyze-and-sanitize  (convenience: one call does both)
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/analyze-and-sanitize")
async def analyze_and_sanitize(file: UploadFile = File(...)):
    """
    Combined endpoint: analyze + sanitize in one round trip.
    Returns JSON with stats AND the sanitized text (base64 for binary formats).
    """
    import base64

    data = await file.read()
    filename = file.filename or "unknown"
    content_type = file.content_type or "application/octet-stream"

    try:
        text = extract_text(data, content_type, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    raw_results = analyzer.analyze(text=text, language="en", score_threshold=SCORE_THRESHOLD)
    results = deduplicate(raw_results)

    entities = []
    recognizer_results = []
    for r in results:
        entities.append({
            "type": r.entity_type,
            "text": text[r.start : r.end],
            "start": r.start,
            "end": r.end,
            "score": round(r.score, 4),
        })
        recognizer_results.append(r)

    operators = {"DEFAULT": OperatorConfig("replace", {"new_value": "[REDACTED]"})}
    for r in results:
        if r.entity_type not in operators:
            operators[r.entity_type] = OperatorConfig("replace", {"new_value": f"[{r.entity_type}]"})

    anonymized = anonymizer.anonymize(text=text, analyzer_results=recognizer_results, operators=operators)

    by_type = dict(Counter(e["type"] for e in entities))

    return {
        "entities": entities,
        "stats": {"total": len(entities), "by_type": by_type},
        "sanitized_text": anonymized.text,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  GET /health
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {"status": "ok", "entities_supported": analyzer.get_supported_entities()}


# ═════════════════════════════════════════════════════════════════════════════
#  In-place DOCX sanitisation (preserves formatting)
# ═════════════════════════════════════════════════════════════════════════════

def _replace_text_preserving_format(paragraph, old_text: str, new_text: str):
    """
    Replace every occurrence of *old_text* with *new_text* across the
    paragraph's runs, keeping all run-level formatting (bold, italic,
    colour, font, size …).  The replacement inherits the style of the
    first run it touches.
    """
    while True:
        runs = paragraph.runs
        if not runs:
            break

        # Build a character → (run_index, char_index) map
        combined = ""
        char_map: list[tuple[int, int]] = []
        for i, run in enumerate(runs):
            for j in range(len(run.text)):
                char_map.append((i, j))
            combined += run.text

        idx = combined.find(old_text)
        if idx == -1:
            break

        end_idx = idx + len(old_text)
        if end_idx > len(char_map):
            break

        first_run_idx, first_char = char_map[idx]
        last_run_idx,  last_char  = char_map[end_idx - 1]

        if first_run_idx == last_run_idx:
            r = runs[first_run_idx]
            r.text = r.text[:first_char] + new_text + r.text[last_char + 1:]
        else:
            # First run: keep text before entity + insert replacement
            runs[first_run_idx].text = (
                runs[first_run_idx].text[:first_char] + new_text
            )
            # Middle runs: clear
            for mid in range(first_run_idx + 1, last_run_idx):
                runs[mid].text = ""
            # Last run: keep text after entity
            runs[last_run_idx].text = runs[last_run_idx].text[last_char + 1:]


def _sanitize_docx_inplace(data: bytes, entity_list: list) -> bytes:
    """
    Open the original DOCX, walk every paragraph/table-cell/header/footer,
    and replace PII text directly inside the existing XML runs so that
    bold, italic, colour, font, size and all other formatting is kept.

    Uses a two-phase approach (entity→placeholder→tag) so that replacement
    tags like [US_SSN] are never corrupted by shorter entity matches.
    """
    doc = Document(io.BytesIO(data))

    # Phase 1 map: entity text → unique placeholder (PUA Unicode)
    # Phase 2 map: placeholder → final [TYPE] tag
    replacement_map: dict[str, str] = {}
    placeholder_to_tag: dict[str, str] = {}
    idx = 0
    for ent in entity_list:
        txt = ent.get("text", "")
        if txt and txt not in replacement_map:
            placeholder = f"\uE000{idx}\uE001"
            replacement_map[txt] = placeholder
            placeholder_to_tag[placeholder] = f'[{ent["type"]}]'
            idx += 1

    sorted_phase1 = sorted(
        replacement_map.items(), key=lambda x: len(x[0]), reverse=True
    )
    sorted_phase2 = sorted(
        placeholder_to_tag.items(), key=lambda x: len(x[0]), reverse=True
    )

    def _process_paragraphs(paragraphs):
        for para in paragraphs:
            # Phase 1: entity text → placeholder
            for original, placeholder in sorted_phase1:
                if original in para.text:
                    _replace_text_preserving_format(para, original, placeholder)
            # Phase 2: placeholder → [TYPE] tag
            for placeholder, tag in sorted_phase2:
                if placeholder in para.text:
                    _replace_text_preserving_format(para, placeholder, tag)

    def _process_table(table):
        for row in table.rows:
            for cell in row.cells:
                _process_paragraphs(cell.paragraphs)
                for nested in cell.tables:
                    _process_table(nested)

    # Body paragraphs
    _process_paragraphs(doc.paragraphs)

    # Body tables
    for table in doc.tables:
        _process_table(table)

    # Headers & footers (all section variants)
    for section in doc.sections:
        for hf in (section.header, section.footer,
                   section.first_page_header, section.first_page_footer,
                   section.even_page_header, section.even_page_footer):
            if hf is None:
                continue
            _process_paragraphs(hf.paragraphs)
            for table in hf.tables:
                _process_table(table)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ═════════════════════════════════════════════════════════════════════════════
#  In-place PDF sanitisation (preserves layout / fonts / images)
# ═════════════════════════════════════════════════════════════════════════════

def _sanitize_pdf_inplace(data: bytes, entity_list: list) -> bytes:
    """
    Open the original PDF with PyMuPDF, search for each PII text on every
    page, add a redaction annotation with the replacement tag, then apply
    all redactions.  Layout, images, headers, and colours are preserved.
    """
    pdf = fitz.open(stream=data, filetype="pdf")

    # Unique replacement map (longer first)
    replacement_map: dict[str, str] = {}
    for ent in entity_list:
        txt = ent.get("text", "")
        if txt and txt not in replacement_map:
            replacement_map[txt] = f'[{ent["type"]}]'

    sorted_items = sorted(
        replacement_map.items(), key=lambda x: len(x[0]), reverse=True
    )

    for page in pdf:
        for original, replacement in sorted_items:
            hits = page.search_for(original)
            for rect in hits:
                page.add_redact_annot(
                    rect,
                    text=replacement,
                    fontsize=0,           # auto-fit to rect
                    text_color=(0, 0, 0), # black text
                    fill=(1, 1, 1),       # white background
                )
        page.apply_redactions()

    buf = io.BytesIO()
    pdf.save(buf, garbage=4, deflate=True)
    pdf.close()
    return buf.getvalue()


# ═════════════════════════════════════════════════════════════════════════════
#  In-place Image sanitisation (black bars over PII words)
# ═════════════════════════════════════════════════════════════════════════════

# Entity types that are NOT personal PII on identity documents
# (e.g., "Income Tax Department", "Government of India" = card headers)
_IMAGE_SKIP_TYPES = {"ORGANIZATION", "NRP"}

# Regex patterns for PII that Presidio might miss on noisy OCR text
_IMAGE_PII_PATTERNS = [
    r'[A-Z]{5}\d{4}[A-Z]',                              # Indian PAN
    r'\d{4}\s\d{4}\s\d{4}(?!\s\d)',                     # Aadhaar (12 digits)
    r'\d{4}\s\d{4}\s\d{4}\s\d{4}',                      # VID (16 digits)
    r'(?:\+91[\s\-]?)?[6-9]\d{9}\b',                    # Indian phone
    r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}',  # Email
]


def _sanitize_image(data: bytes, entity_list: list) -> bytes:
    """
    Open the image, use cached OCR bounding boxes with character offsets
    to map entity spans to pixel regions, plus regex fallback for PII
    patterns Presidio may miss.  Draw black rectangles over PII words.
    Always outputs PNG.
    """
    img = Image.open(io.BytesIO(data)).convert("RGB")

    # Upscale — must match parse_image() formula exactly
    w, h = img.size
    scale = 1
    if w < 2000:
        scale = max(2, (2000 // w) + 1)
        img = img.resize((w * scale, h * scale), Image.LANCZOS)

    # Get cached OCR word data (with char_start / char_end offsets)
    ocr_words = get_image_ocr_cache(data)
    if not ocr_words:
        logger.warning("No cached OCR data found for image — re-running OCR")
        from parsers import parse_image as _parse_img
        _parse_img(data)
        ocr_words = get_image_ocr_cache(data)

    # ── 1. Offset-based matching from Presidio entities ──────────────────
    #    Skip ORGANIZATION / NRP which are card headers, not personal PII
    words_to_redact: set[int] = set()
    for ent in entity_list:
        if ent.get("type") in _IMAGE_SKIP_TYPES:
            continue
        ent_start = ent["start"]
        ent_end = ent["end"]
        for idx, w in enumerate(ocr_words):
            w_start = w.get("char_start", -1)
            w_end = w.get("char_end", -1)
            if w_start < ent_end and w_end > ent_start:
                words_to_redact.add(idx)

    # ── 2. Regex fallback — catch PAN / Aadhaar / phone / email that ─────
    #    Presidio may have missed due to noisy OCR text
    ocr_text = " ".join(w["text"] for w in ocr_words)
    for pattern in _IMAGE_PII_PATTERNS:
        for m in re.finditer(pattern, ocr_text):
            ms, me = m.start(), m.end()
            for idx, w in enumerate(ocr_words):
                ws = w.get("char_start", -1)
                we = w.get("char_end", -1)
                if ws < me and we > ms:
                    words_to_redact.add(idx)

    # ── 3. Draw black rectangles ─────────────────────────────────────────
    draw = ImageDraw.Draw(img)
    img_w, img_h = img.size
    padding = 4

    for idx in words_to_redact:
        word_info = ocr_words[idx]
        left = max(0, word_info["left"] - padding)
        top = max(0, word_info["top"] - padding)
        right = min(img_w, word_info["left"] + word_info["width"] + padding)
        bottom = min(img_h, word_info["top"] + word_info["height"] + padding)
        if right > left and bottom > top:
            draw.rectangle([left, top, right, bottom], fill="black")

    logger.info("Image redaction: %d words blacked out of %d OCR words", len(words_to_redact), len(ocr_words))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ═════════════════════════════════════════════════════════════════════════════
#  Run (for local testing: python main.py)
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
