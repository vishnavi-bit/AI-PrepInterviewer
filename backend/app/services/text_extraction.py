"""Text extraction for PDF and DOCX resumes. A file with no readable text is unreadable, not empty."""

from __future__ import annotations

import io

from docx import Document
from pypdf import PdfReader


class UnreadableResume(Exception):
    """The file could not be parsed, or it contains no selectable text (for example a scanned PDF)."""


def extract_text(kind: str, data: bytes) -> str:
    try:
        if kind == "pdf":
            reader = PdfReader(io.BytesIO(data))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        elif kind == "docx":
            document = Document(io.BytesIO(data))
            text = "\n".join(paragraph.text for paragraph in document.paragraphs)
        else:
            raise UnreadableResume(f"Unsupported kind: {kind}")
    except UnreadableResume:
        raise
    except Exception as exc:  # parsers raise many error types for corrupt input
        raise UnreadableResume(str(exc)) from exc

    text = text.strip()
    if not text:
        raise UnreadableResume("No readable text.")
    return text
