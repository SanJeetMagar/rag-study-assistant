from django.contrib import admin

from .models import Document, DocumentChunk


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'status', 'total_chunks', 'uploaded_at']
    list_filter = ['status', 'course']


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ['document', 'chunk_index', 'page_number']
    list_filter = ['document']
    # The embedding column is 384 floats -- unreadable and slow in a form.
    exclude = ['embedding']
