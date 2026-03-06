"""
File parsers — extract plain text from PDF, DOCX, TXT, and SQL files.

Each parser returns a single string of the full text content.
The /analyze endpoint runs PII detection on this string.
The /sanitize endpoint uses character offsets into this same string.
"""

import io
import pdfplumber
from docx import Document


def parse_pdf(data: bytes) -> str:
    """Extract all text from a PDF file."""
    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


def parse_docx(data: bytes) -> str:
    """Extract all text from a DOCX file (paragraphs + tables)."""
    doc = Document(io.BytesIO(data))

    parts: list[str] = []

    # Paragraphs
    for para in doc.paragraphs:
        if para.text.strip():
            parts.append(para.text)

    # Tables
    for table in doc.tables:
        for row in table.rows:
            row_text = "\t".join(cell.text.strip() for cell in row.cells)
            if row_text.strip():
                parts.append(row_text)

    return "\n".join(parts)


def parse_txt(data: bytes) -> str:
    """Decode plain text (UTF-8 with fallback to latin-1)."""
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1")


def parse_sql(data: bytes) -> str:
    """
    Parse SQL files — treat as plain text.
    SQL may contain PII in INSERT/UPDATE values, comments, etc.
    """
    return parse_txt(data)


# ─── Dispatcher ──────────────────────────────────────────────────────────────

MIME_PARSERS = {
    "application/pdf": parse_pdf,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": parse_docx,
    "text/plain": parse_txt,
    "text/csv": parse_txt,
    "application/json": parse_txt,
    "text/xml": parse_txt,
    "application/xml": parse_txt,
    "text/sql": parse_sql,
    "application/sql": parse_sql,
    "application/x-sql": parse_sql,
}

# Fallback: detect by file extension
EXT_PARSERS = {
    ".pdf": parse_pdf,
    ".docx": parse_docx,
    ".txt": parse_txt,
    ".sql": parse_sql,
    ".csv": parse_txt,
    ".log": parse_txt,
    ".json": parse_txt,
    ".xml": parse_txt,
}


def extract_text(data: bytes, content_type: str, filename: str) -> str:
    """
    Extract text from file bytes using MIME type or extension fallback.
    Raises ValueError for unsupported file types.
    """
    # Try by MIME type first
    parser = MIME_PARSERS.get(content_type)

    # Fallback: try by extension
    if parser is None:
        ext = ""
        if "." in filename:
            ext = "." + filename.rsplit(".", 1)[-1].lower()
        parser = EXT_PARSERS.get(ext)

    if parser is None:
        raise ValueError(
            f"Unsupported file type: {content_type} ({filename}). "
            f"Supported: PDF, DOCX, TXT, SQL"
        )

    text = parser(data)
    if not text or not text.strip():
        raise ValueError("Could not extract any text from the file.")

    return text
