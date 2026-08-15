from django.conf import settings
from django.db import models
from pgvector.django import HnswIndex, VectorField

from apps.courses.models import Course


class Document(models.Model):
    """A single uploaded PDF. One course can hold many."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        READY = 'ready', 'Ready'
        ERROR = 'error', 'Error'

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='documents/')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # Ingestion runs in a background thread, so upload returns before the
    # document is queryable. The frontend polls this field.
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    total_chunks = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.title} ({self.course.title})'


class DocumentChunk(models.Model):
    """
    One ~300-word slice of a document plus its 384-dimension embedding.

    This is the table similarity search runs against. A 100-page syllabus
    lands roughly 130 rows here.
    """

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    content = models.TextField()
    embedding = VectorField(dimensions=settings.EMBEDDING_DIMENSIONS)
    chunk_index = models.IntegerField()
    page_number = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['chunk_index']
        indexes = [
            models.Index(fields=['document', 'chunk_index']),
            # HNSW rather than IVFFlat: IVFFlat trains its clusters on the rows
            # present when the index is built, so building it in a migration
            # trains it on an empty table and recall stays poor until rebuilt.
            # HNSW needs no training data and handles incremental inserts.
            HnswIndex(
                name='chunk_embedding_hnsw',
                fields=['embedding'],
                m=16,
                ef_construction=64,
                opclasses=['vector_cosine_ops'],
            ),
        ]

    def __str__(self):
        return f'{self.document.title} #{self.chunk_index}'
