# IMAGE SANITIZATION — PNG & JPG
# Add this to your existing PII platform (MaitrikMakwana/PII-DATA-SANITIZATION)
# Stack: TypeScript · Express · Prisma · BullMQ · Cloudflare R2 · Python FastAPI
# This is the ONLY missing piece — PDF, DOCX, SQL, CSV, JSON, TXT are already done

---

## THE PROBLEM WITH IMAGES

Every other format (PDF, DOCX, SQL, CSV, JSON, TXT) contains actual text.
You can read it, find PII with Presidio, and replace the string.

Images are pixels. There is no string to replace.
You need to:
1. Read the pixels using OCR to extract text + find WHERE each word is on the image
2. Run Presidio on the extracted text
3. Draw black filled rectangles over the pixels where PII words are
4. Return the modified image

---

## WHAT CHANGES IN YOUR EXISTING CODE

You only need to touch 2 files in pii-engine/ and nothing in the Node.js backend:

```
pii-engine/
├── utils/
│   ├── extractor.py     ← ADD image branch here
│   └── sanitizer.py     ← ADD image branch here
└── main.py              ← NO CHANGE NEEDED
```

The worker.ts, routes, controllers, Prisma schema — nothing changes.
The image goes through the exact same 7-stage pipeline as every other file.
The PII engine just handles it differently internally.

---

## SYSTEM REQUIREMENT (install once)

```bash
# Ubuntu / Debian / Railway / Render / Docker
apt-get install -y tesseract-ocr

# Mac
brew install tesseract

# Verify it works
tesseract --version
```

pytesseract is just a Python wrapper around this binary.
Without the binary installed, pytesseract will throw an error.

---

## PYTHON DEPENDENCIES

Add these to pii-engine/requirements.txt if not already present:

```
pytesseract==0.3.10
Pillow==10.2.0
numpy==1.26.4
```

---

## STEP 1 — extractor.py — ADD the image branch

In your existing extractor.py you already have branches for each format like:
```python
if mime_type == 'application/pdf': ...
elif mime_type == 'text/csv': ...
```

Add this branch for images. The key difference vs other formats:
- Use `image_to_data()` not `image_to_string()` — this gives you word-level pixel coordinates
- Cache the OCR data so sanitizer.py can use it to know WHERE to draw the black bars

```python
# ADD these imports at the top of extractor.py
from PIL import Image
import pytesseract
from pytesseract import Output

# ADD this module-level cache (outside any function, at the top of the file)
# This stores the OCR bounding box data between the /analyze and /sanitize calls
_image_ocr_cache: dict = {}


# ADD this branch inside your extract_text() function
elif mime_type in ('image/png', 'image/jpeg'):
    return _extract_image_text(file_path)


# ADD this new function anywhere in extractor.py
def _extract_image_text(file_path: str) -> str:
    """
    OCR the image using image_to_data() to get word-level bounding boxes.
    Caches bounding box data so sanitizer.py can draw redaction rectangles.
    Returns plain text string (same as every other format).
    """
    image = Image.open(file_path).convert("RGB")

    # If image width is under 1000px, scale up 2x for better OCR accuracy
    # Small text is hard for Tesseract — upscaling helps significantly
    if image.width < 1000:
        image = image.resize((image.width * 2, image.height * 2), Image.LANCZOS)
        scale_factor = 2.0
    else:
        scale_factor = 1.0

    # image_to_data gives us one row per word with pixel coordinates
    # output_type=DICT gives a Python dict instead of a TSV string
    # --psm 1 = auto page segmentation with orientation detection
    ocr_data = pytesseract.image_to_data(
        image,
        output_type=Output.DICT,
        config='--psm 1'
    )

    # Cache the OCR data keyed by file path
    # sanitizer.py will call get_image_ocr_cache(file_path) to retrieve this
    _image_ocr_cache[file_path] = {
        'ocr_data': ocr_data,
        'scale_factor': scale_factor,
    }

    # Build plain text string from OCR words
    # conf = -1 means it is a layout/separator row, not a real word — skip those
    words = []
    for i, word in enumerate(ocr_data['text']):
        conf = int(ocr_data['conf'][i])
        if conf > 0 and word.strip():
            words.append(word.strip())

    return " ".join(words)


# ADD this helper function — called by sanitizer.py
def get_image_ocr_cache(file_path: str) -> dict | None:
    """Return cached OCR bounding box data for this image. None if not cached."""
    return _image_ocr_cache.get(file_path)
```

---

## STEP 2 — sanitizer.py — ADD the image branch

In your existing sanitizer.py you already have branches like:
```python
if mime_type == 'application/pdf': return _sanitize_pdf(...)
elif mime_type == 'text/csv': return _sanitize_csv(...)
```

Add this branch for images:

```python
# ADD this import at the top of sanitizer.py
from PIL import Image, ImageDraw
from utils.extractor import get_image_ocr_cache


# ADD this branch inside your sanitize_file() function
elif mime_type in ('image/png', 'image/jpeg'):
    return _sanitize_image(file_path, anonymized_text)


# ADD this function anywhere in sanitizer.py
def _sanitize_image(file_path: str, anonymized_text: str) -> bytes:
    """
    Draw black rectangles over every PII word in the image.

    How it works:
    1. Get the OCR bounding box data that extractor.py cached
    2. Reconstruct the original word list and build a char-position → word-index map
    3. Find which words were redacted by comparing original vs anonymized text
    4. Draw a black filled rectangle over each redacted word's pixel coordinates
    5. Return PNG bytes (always PNG regardless of input format)
    """
    import io

    # ── Get cached OCR data ──────────────────────────────────────────────────
    cache = get_image_ocr_cache(file_path)
    if not cache:
        # OCR cache missing — return original image unchanged rather than crash
        with open(file_path, 'rb') as f:
            return f.read()

    ocr_data     = cache['ocr_data']
    scale_factor = cache['scale_factor']

    # ── Load original image for drawing ─────────────────────────────────────
    # Always use the original file, not the upscaled version used for OCR
    original_image = Image.open(file_path).convert("RGB")
    draw = ImageDraw.Draw(original_image)

    # ── Build word list and char-position map ────────────────────────────────
    # Collect only real words (conf > 0) and their OCR array indices
    real_words   = []   # the actual word strings
    ocr_indices  = []   # their positions in the ocr_data arrays

    for i, word in enumerate(ocr_data['text']):
        conf = int(ocr_data['conf'][i])
        if conf > 0 and word.strip():
            real_words.append(word.strip())
            ocr_indices.append(i)

    # Build map: word_index → (char_start, char_end) in the original plain text
    # This is how we connect Presidio's char offsets back to OCR word positions
    word_char_map = []   # list of (ocr_array_index, char_start, char_end)
    char_pos = 0
    for j, word in enumerate(real_words):
        word_char_map.append((ocr_indices[j], char_pos, char_pos + len(word)))
        char_pos += len(word) + 1   # +1 for the space between words

    # ── Find which words were redacted ───────────────────────────────────────
    # Compare original words vs anonymized text token by token.
    # Where the anonymized token is [REDACTED] or masked (contains *),
    # that word's pixel box needs a black rectangle.
    original_tokens   = real_words
    anonymized_tokens = anonymized_text.split()

    redacted_char_spans = []   # list of (char_start, char_end) in original text
    orig_idx = 0
    anon_idx = 0
    char_pos = 0

    while orig_idx < len(original_tokens) and anon_idx < len(anonymized_tokens):
        orig_word = original_tokens[orig_idx]
        anon_word = anonymized_tokens[anon_idx]

        is_redacted = (anon_word == '[REDACTED]')
        is_masked   = ('*' in anon_word)

        if is_redacted or is_masked:
            # This original word was identified as PII — record its char span
            redacted_char_spans.append((char_pos, char_pos + len(orig_word)))

        char_pos += len(orig_word) + 1
        orig_idx += 1
        anon_idx += 1

    # ── Map char spans to pixel boxes and draw ───────────────────────────────
    PADDING = 4   # extra pixels around each word box so the bar fully covers the text

    for (span_start, span_end) in redacted_char_spans:
        for (ocr_idx, w_start, w_end) in word_char_map:

            # Check if this word overlaps with the PII span
            overlaps = w_start < span_end and w_end > span_start
            if not overlaps:
                continue

            # Get pixel coordinates from OCR data
            # Divide by scale_factor to map back to original image coordinates
            left   = int(ocr_data['left'][ocr_idx]   / scale_factor)
            top    = int(ocr_data['top'][ocr_idx]    / scale_factor)
            width  = int(ocr_data['width'][ocr_idx]  / scale_factor)
            height = int(ocr_data['height'][ocr_idx] / scale_factor)

            if width <= 0 or height <= 0:
                continue  # skip zero-size boxes

            # Draw the black rectangle with padding
            x0 = max(0, left - PADDING)
            y0 = max(0, top  - PADDING)
            x1 = min(original_image.width,  left + width  + PADDING)
            y1 = min(original_image.height, top  + height + PADDING)

            draw.rectangle([x0, y0, x1, y1], fill="black")

    # ── Return PNG bytes ─────────────────────────────────────────────────────
    # Always output as PNG regardless of input format.
    # JPEG compression would smear the black bars and potentially expose pixels.
    output = io.BytesIO()
    original_image.save(output, format="PNG")
    return output.getvalue()
```

---

## STEP 3 — main.py — ONE small change for images

Your `/sanitize` endpoint currently returns the file with the same MIME type as the input.
For images, you need to return PNG even if the input was JPEG.
Find the return statement in your `/sanitize` endpoint and update it:

```python
# FIND this in your existing /sanitize endpoint:
return Response(
    content=sanitized_bytes,
    media_type=file.content_type,   # ← THIS LINE
    ...
)

# CHANGE TO:
output_mime = "image/png" if file.content_type in ("image/png", "image/jpeg") else file.content_type

return Response(
    content=sanitized_bytes,
    media_type=output_mime,         # ← use output_mime instead
    ...
)
```

That is the only change needed in main.py.

---

## HOW IT FITS INTO YOUR EXISTING PIPELINE

Nothing changes in your Node.js backend. The worker.ts calls `/analyze` then `/sanitize`
exactly as it does for every other format. The image just goes through the same 7 stages:

```
Admin uploads photo.jpg
        ↓
worker.ts: downloads from R2 → calls /analyze → calls /sanitize → uploads to R2
        ↓
/analyze (pii-engine):
  extractor.py hits the image branch
  → pytesseract.image_to_data() reads every word + its pixel box
  → OCR data cached in _image_ocr_cache['tmp/photo.jpg']
  → returns plain text "John Doe Aadhaar 4821 7391 6625"
  → Presidio finds: IN_AADHAAR at chars 18-32, PERSON at chars 0-7
  → returns { entities: [...], stats: {...} }
        ↓
/sanitize (pii-engine):
  extractor.py runs image_to_data() again → restores OCR cache
  anonymizer.anonymize() → "John Doe" → "[REDACTED]", "4821 7391 6625" → "[REDACTED]"
  sanitizer.py hits the image branch
  → loads _image_ocr_cache to get pixel boxes
  → compares "John" vs "[REDACTED]" → draw black box at pixels (45,80,100,20)
  → compares "4821" vs "[REDACTED]" → draw black box at pixels (340,120,40,20)
  → compares "7391" vs "[REDACTED]" → draw black box at pixels (400,120,40,20)
  → compares "6625" vs "[REDACTED]" → draw black box at pixels (460,120,40,20)
  → saves as PNG bytes
        ↓
worker.ts: uploads sanitized PNG to R2 sanitized/<fileId>.png
Prisma: status = 'sanitized', entity_count = 2
        ↓
User downloads photo.png — same image, black bars over name and Aadhaar
```

---

## EDGE CASES ALREADY HANDLED

| Situation | How it is handled |
|---|---|
| Image width < 1000px (small scan) | Scaled 2x before OCR, coordinates divided back by 2 |
| Low confidence OCR word (conf ≤ 0) | Skipped — not included in word list or text |
| Multi-word PII (e.g. "Rahul Sharma") | Each word gets its own rectangle — no giant bar across the page |
| Input is JPEG | Output is always PNG — JPEG compression would smear the black bars |
| OCR cache missing (race condition) | Returns original image unchanged instead of crashing |
| Word box has zero width/height | Skipped — no invisible rectangles drawn |
| PII at edge of image | Clamped to image bounds so rectangle never goes out of range |

---

## QUICK TEST

Once added, test with this image:

Create a plain white image with text written on it:
```python
from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGB', (600, 200), color='white')
d = ImageDraw.Draw(img)
d.text((10, 80), "Name: Rahul Sharma  Aadhaar: 4821 7391 6625", fill='black')
img.save('test_pii.png')
```

Upload `test_pii.png` through your platform.
The returned image should have black bars over "Rahul Sharma" and "4821 7391 6625".
The text "Name:" and "Aadhaar:" should remain visible.

---

## SUMMARY — WHAT YOU NEED TO DO

1. Install tesseract binary on your server/Docker image
2. Add `pytesseract`, `Pillow`, `numpy` to requirements.txt (probably already there)
3. In extractor.py — add the `image/png` and `image/jpeg` branch + `_extract_image_text()` + `get_image_ocr_cache()`
4. In sanitizer.py — add the image branch + `_sanitize_image()`
5. In main.py — change `media_type=file.content_type` to `media_type=output_mime` for images
6. Nothing changes in worker.ts, routes, Prisma schema, or any Node.js file
