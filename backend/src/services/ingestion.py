"""
The ingestion pipeline: uploaded PDF -> searchable chunks.

Runs in a background thread so upload returns immediately. The document's
status field is the progress signal the frontend polls.
"""

import logging
import threading

from django.conf import settings
from django.db import close_old_connections

from apps.documents.models import Document, DocumentChunk

from .embedder import embed_batch
from .pdf_processor import ExtractionError, extract_and_chunk

logger = logging.getLogger(__name__)


def process_document(document):
    """
    Extract, chunk, embed, and store one document. Runs synchronously.

    Chunks are embedded as a single batch rather than one call each — the
    model vectorises a batch far faster than the same text piecemeal.
    """
    document.status = Document.Status.PROCESSING
    document.error_message = ''
    document.save(update_fields=['status', 'error_message'])

    try:
        chunks = extract_and_chunk(
            document.file.path,
            chunk_size=settings.CHUNK_SIZE_WORDS,
            overlap=settings.CHUNK_OVERLAP_WORDS,
        )

        if not chunks:
            raise ExtractionError('No usable text was found in this PDF.')

        embeddings = embed_batch([chunk.text for chunk in chunks])

        # Replace wholesale so re-processing never leaves stale chunks behind.
        DocumentChunk.objects.filter(document=document).delete()
        DocumentChunk.objects.bulk_create([
            DocumentChunk(
                document=document,
                content=chunk.text,
                embedding=embedding,
                chunk_index=chunk.index,
                page_number=chunk.page_number,
            )
            for chunk, embedding in zip(chunks, embeddings)
        ])

        document.total_chunks = len(chunks)
        document.status = Document.Status.READY
        document.save(update_fields=['total_chunks', 'status'])
        logger.info('Ingested %s into %d chunks', document.title, len(chunks))
        return len(chunks)

    except ExtractionError as exc:
        _fail(document, str(exc))
        raise
    except Exception as exc:
        logger.exception('Ingestion failed for document %s', document.pk)
        _fail(document, f'Processing failed: {exc}')
        raise


def _fail(document, message):
    document.status = Document.Status.ERROR
    document.error_message = message
    document.save(update_fields=['status', 'error_message'])


def process_document_async(document):
    """
    Kick off ingestion in a background thread and return immediately.

    Deliberately not Celery: that would mean running Redis and a worker for a
    project that runs on one machine. The trade-off is that a server restart
    mid-ingestion strands a document in 'processing' — the
    `requeue_stuck_documents` management command clears those.
    """

    def run():
        # A thread gets its own DB connection; clean up stale ones first.
        close_old_connections()
        try:
            process_document(document)
        except Exception:
            pass  # process_document already recorded the failure on the model
        finally:
            close_old_connections()

    thread = threading.Thread(target=run, daemon=True, name=f'ingest-{document.pk}')
    thread.start()
    return thread
