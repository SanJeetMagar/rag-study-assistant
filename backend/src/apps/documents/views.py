from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.courses.permissions import get_accessible_course
from services.ingestion import process_document_async

from .models import Document
from .serializers import (
    DocumentChunkSerializer,
    DocumentSerializer,
    DocumentStatusSerializer,
)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        """
        Documents from courses the user teaches or is enrolled in.

        Filtering by enrollment here is what stops a student reading another
        course's material by guessing a document id.
        """
        from django.db.models import Q

        user = self.request.user
        queryset = Document.objects.filter(
            Q(course__teacher=user) | Q(course__students=user)
        ).distinct().select_related('course', 'uploaded_by')

        course_id = self.request.query_params.get('course_id')
        if course_id:
            get_accessible_course(user, course_id)
            queryset = queryset.filter(course_id=course_id)
        return queryset

    def perform_create(self, serializer):
        """Save the upload, then hand it to the background ingestion thread."""
        document = serializer.save(uploaded_by=self.request.user)
        process_document_async(document)

    def perform_destroy(self, instance):
        if instance.course.teacher_id != self.request.user.id:
            raise PermissionDenied('Only the course teacher can delete documents.')
        instance.delete()  # chunks cascade

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Cheap endpoint the frontend polls while ingestion runs."""
        return Response(DocumentStatusSerializer(self.get_object()).data)

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """Re-run ingestion — useful after a transient failure."""
        document = self.get_object()
        if document.course.teacher_id != request.user.id:
            raise PermissionDenied('Only the course teacher can reprocess documents.')
        if document.status == Document.Status.PROCESSING:
            return Response(
                {'detail': 'This document is already being processed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        process_document_async(document)
        return Response(DocumentStatusSerializer(document).data)

    @action(detail=True, methods=['get'])
    def chunks(self, request, pk=None):
        """
        The stored chunks with a slice of each embedding.

        Exists so the vector store can be demonstrated live at the defense
        rather than described.
        """
        document = self.get_object()
        page_size = 20
        chunks = document.chunks.all()[:page_size]
        return Response({
            'document': document.title,
            'total_chunks': document.total_chunks,
            'showing': len(chunks),
            'chunks': DocumentChunkSerializer(chunks, many=True).data,
        })
