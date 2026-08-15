"""
PDF text extraction, cleaning and chunking.

Pure functions -- nothing here imports Django or touches the database, so it
can all be tested without a test database or a running Postgres.
"""

import re
from collections import Counter
from dataclasses import dataclass

import pdfplumber
from pypdf import PdfReader


@dataclass(frozen=True)
class Page:
    number: int  # 1-based, as a human would cite it
    text: str


@dataclass(frozen=True)
class Chunk:
    text: str
    index: int
    # The page most of this chunk's text came from. Chunks routinely straddle a
    # page break, and citing the page it merely *started* on sends the student
    # to the wrong page when the bulk of the content is overleaf.
    page_number: int


class ExtractionError(Exception):
    """Raised when a PDF yields no usable text."""


def extract_pages(file_path):
    """
    Pull text out of a PDF, one entry per page.

    pdfplumber handles layout and tables better, so it is tried first; pypdf
    is the fallback. Page numbers are preserved here because chunking cannot
    recover them later -- once pages are concatenated into one string, the
    boundaries are gone for good.
    """
    pages = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ''
                pages.append(Page(number=i, text=text))
    except Exception:
        pages = []

    if not any(p.text.strip() for p in pages):
        try:
            reader = PdfReader(file_path)
            pages = [
                Page(number=i, text=page.extract_text() or '')
                for i, page in enumerate(reader.pages, start=1)
            ]
        except Exception as exc:
            raise ExtractionError(f'Could not read the PDF: {exc}') from exc

    if not any(p.text.strip() for p in pages):
        raise ExtractionError(
            'This PDF has no extractable text. It is most likely a scan of '
            'printed pages, which needs OCR that this project does not support. '
            'Please upload a text-based PDF.'
        )

    return pages


def clean_text(text):
    """
    Strip the furniture that repeats on every page.

    Page numbers and running headers appear in every chunk otherwise, which
    dilutes the embedding: two chunks about completely different topics look
    artificially similar because they share the same boilerplate.
    """
    # Standalone page numbers, e.g. a line containing just "23" or "- 23 -"
    text = re.sub(r'^\s*[-–—]?\s*\d{1,4}\s*[-–—]?\s*$', '', text, flags=re.MULTILINE)
    # "Page 23", "Page 23 of 100"
    text = re.sub(r'(?im)^\s*page\s+\d+\s*(of\s+\d+)?\s*$', '', text)
    # Collapse runs of blank lines and stray whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _dominant_page(window):
    """
    The page contributing the most words to this chunk.

    Ties go to the earlier page, which is where a reader would start looking.
    """
    counts = Counter(page for _, page in window)
    best = max(counts.values())
    return min(page for page, count in counts.items() if count == best)


def split_into_chunks(pages, chunk_size=300, overlap=50, min_tail_words=25):
    """
    Split pages into overlapping word chunks that remember where they came from.

    Overlap exists so a concept spanning a boundary still lands whole in at
    least one chunk. With chunk_size=5, overlap=2 the stride is 3:

        words:   [A B C D E F G H]
        chunk 1: [A B C D E]
        chunk 2:       [D E F G H]   <- D,E repeated to preserve continuity

    The tail is kept when it carries meaningful text. Dropping every short
    final chunk -- as a naive `break` does -- silently loses the end of every
    single document.
    """
    if chunk_size <= 0:
        raise ValueError('chunk_size must be positive')
    if not 0 <= overlap < chunk_size:
        raise ValueError('overlap must be >= 0 and smaller than chunk_size')

    # Flatten to (word, page_number) so each chunk can report its origin.
    words = []
    for page in pages:
        cleaned = clean_text(page.text)
        words.extend((word, page.number) for word in cleaned.split())

    if not words:
        return []

    stride = chunk_size - overlap
    chunks = []
    position = 0

    while position < len(words):
        window = words[position:position + chunk_size]

        # A short window can only be the tail. Keep it when it still carries
        # content, but never when the previous chunk's overlap already
        # contains all of it.
        is_tail = position + chunk_size >= len(words)
        if is_tail and chunks and len(window) < min_tail_words:
            break

        chunks.append(
            Chunk(
                text=' '.join(word for word, _ in window),
                index=len(chunks),
                page_number=_dominant_page(window),
            )
        )

        if is_tail:
            break
        position += stride

    return chunks


def extract_and_chunk(file_path, chunk_size=300, overlap=50):
    """Convenience wrapper: file on disk -> list of Chunk."""
    return split_into_chunks(extract_pages(file_path), chunk_size, overlap)
