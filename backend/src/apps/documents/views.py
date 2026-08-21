from django.http import FileResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.courses.permissions import (
    get_accessible_course,
    require_course_manager,
    viewable_courses,
)
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
    # Schema-generation placeholder; see the note in courses/views.py.
    queryset = Document.objects.none()

    def get_queryset(self):
        """
        Documents from courses the user teaches or is enrolled in.

        Filtering by enrollment here is what stops a student reading another
        course's material by guessing a document id -- including the PDF
        itself, since the file endpoint resolves through this queryset.
        """
        user = self.request.user
        queryset = Document.objects.filter(
            course__in=viewable_courses(user)
        ).select_related('course', 'uploaded_by')

        course_id = self.request.query_params.get('course_id')
        if course_id:
            # Raises 403 rather than silently returning nothing, so a student
            # poking at another course's id learns they were refused.
            get_accessible_course(user, course_id)
            queryset = queryset.filter(course_id=course_id)
        return queryset

    def perform_create(self, serializer):
        """Save the upload, then hand it to the background ingestion thread."""
        document = serializer.save(uploaded_by=self.request.user)
        process_document_async(document)

    def perform_update(self, serializer):
        require_course_manager(
            self.request.user, serializer.instance.course, 'rename documents'
        )
        serializer.save()

    def perform_destroy(self, instance):
        require_course_manager(self.request.user, instance.course, 'delete documents')
        instance.delete()  # chunks cascade

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Cheap endpoint the frontend polls while ingestion runs."""
        return Response(DocumentStatusSerializer(self.get_object()).data)

    @action(detail=True, methods=['get'])
    def file(self, request, pk=None):
        """
        Serve the PDF itself, enrollment checked.

        Django serves MEDIA_ROOT unprotected in development, so linking
        straight to /media/ would let anyone holding a URL read any course's
        material -- the same hole that was closed for retrieval. Going through
        the viewset means get_queryset() applies and a non-member gets a 404
        rather than the file.
        """
        document = self.get_object()
        try:
            handle = document.file.open('rb')
        except FileNotFoundError:
            raise NotFound('The file is missing from storage.')

        response = FileResponse(handle, content_type='application/pdf')
        # inline so the browser renders it instead of downloading.
        response['Content-Disposition'] = (
            f'inline; filename="{document.title}.pdf"'
        )
        return response

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """Re-run ingestion — useful after a transient failure."""
        document = self.get_object()
        require_course_manager(request.user, document.course, 'reprocess documents')
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
