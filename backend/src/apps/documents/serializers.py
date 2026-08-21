from django.conf import settings
from rest_framework import serializers

from apps.courses.models import Course

from .models import Document, DocumentChunk


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.EmailField(source='uploaded_by.email', read_only=True)
    # Required on create, absent on a rename -- PATCH sends only the title.
    file = serializers.FileField(required=False)

    class Meta:
        model = Document
        fields = [
            'id', 'course', 'title', 'file', 'uploaded_by_email', 'uploaded_at',
            'status', 'total_chunks', 'error_message',
        ]
        # Status and chunk count are set by the ingestion pipeline, not the client.
        read_only_fields = [
            'id', 'uploaded_by_email', 'uploaded_at', 'status',
            'total_chunks', 'error_message',
        ]

    def validate_file(self, value):
        if not value.name.lower().endswith('.pdf'):
            raise serializers.ValidationError('Only PDF files can be uploaded.')

        limit = settings.MAX_UPLOAD_SIZE_MB
        if value.size > limit * 1024 * 1024:
            actual = value.size / (1024 * 1024)
            raise serializers.ValidationError(
                f'This file is {actual:.1f} MB; the limit is {limit} MB.'
            )
        return value

    def validate_course(self, value):
        user = self.context['request'].user
        if value.teacher_id != user.id:
            raise serializers.ValidationError(
                'Only the teacher who owns this course can upload documents to it.'
            )
        return value

    def validate(self, attrs):
        """
        `file` is optional at field level so a rename can PATCH just the title.
        On create it is still mandatory -- a document row with no file would
        fail ingestion with a confusing error instead of a clear one here.
        """
        if self.instance is None and not attrs.get('file'):
            raise serializers.ValidationError({'file': 'A PDF file is required.'})
        return attrs


class DocumentStatusSerializer(serializers.ModelSerializer):
    """Small payload for the polling loop — no file URL, no course object."""

    class Meta:
        model = Document
        fields = ['id', 'status', 'total_chunks', 'error_message']


class DocumentChunkSerializer(serializers.ModelSerializer):
    """Used by the defense view to show what is actually stored per chunk."""

    embedding_preview = serializers.SerializerMethodField()
    embedding_dimensions = serializers.SerializerMethodField()

    class Meta:
        model = DocumentChunk
        fields = [
            'id', 'chunk_index', 'page_number', 'content',
            'embedding_preview', 'embedding_dimensions',
        ]

    def get_embedding_preview(self, obj):
        return [round(float(v), 5) for v in list(obj.embedding)[:8]]

    def get_embedding_dimensions(self, obj):
        return len(obj.embedding)
