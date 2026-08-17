from django.db import transaction
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.courses.permissions import get_accessible_course
from services.generation import GenerationError
from services.retriever import generate_answer

from .models import ChatSession, Message
from .serializers import (
    AskResponseSerializer,
    AskSerializer,
    ChatSessionSerializer,
    MessageSerializer,
)

# How many prior turns to replay so the assistant can follow "explain that
# further" without the whole transcript inflating every request.
HISTORY_TURNS = 6


class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer
    # Schema-generation placeholder; see the note in courses/views.py.
    queryset = ChatSession.objects.none()

    def get_queryset(self):
        return ChatSession.objects.filter(student=self.request.user).select_related('course')

    def perform_create(self, serializer):
        course = get_accessible_course(self.request.user, self.request.data.get('course'))
        serializer.save(student=self.request.user, course=course)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        course_id = request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        return self.get_paginated_response(serializer.data) if page is not None \
            else Response(serializer.data)


@extend_schema(
    responses=MessageSerializer(many=True),
    summary='Full transcript for one chat session',
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_messages(request, pk):
    """Full transcript for one session, oldest first."""
    try:
        session = ChatSession.objects.get(pk=pk, student=request.user)
    except ChatSession.DoesNotExist:
        return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(MessageSerializer(session.messages.all(), many=True).data)


@extend_schema(
    request=AskSerializer,
    responses={
        200: AskResponseSerializer,
        403: OpenApiResponse(description='You are not enrolled in this course.'),
        404: OpenApiResponse(description='Course or chat session not found.'),
        503: OpenApiResponse(
            description='The language model could not be reached, or the free '
            'tier is rate limiting. The message says which.'
        ),
    },
    summary='Ask a question about a course syllabus',
    description=(
        'Embeds the question, retrieves the closest passages from that '
        "course's documents by cosine distance, and answers from those alone. "
        'Returns the answer with the chunks it used and how close each was.'
    ),
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ask(request):
    """
    The main endpoint: a question in, a syllabus-grounded answer out.

    Retrieval, generation, and both message rows are wrapped so a failure
    part-way through cannot leave a question stored with no answer.
    """
    serializer = AskSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    course = get_accessible_course(request.user, data['course_id'])

    session = _resolve_session(request.user, course, data.get('session_id'))
    if session is None:
        return Response(
            {'detail': 'Chat session not found.'}, status=status.HTTP_404_NOT_FOUND
        )

    history = list(session.messages.order_by('-created_at')[:HISTORY_TURNS])[::-1]

    try:
        answer = generate_answer(data['question'], course.id, history=history)
    except GenerationError as exc:
        return Response(
            {'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    with transaction.atomic():
        Message.objects.create(
            session=session, role=Message.Role.USER, content=data['question']
        )
        assistant_message = Message.objects.create(
            session=session,
            role=Message.Role.ASSISTANT,
            content=answer.text,
            chunks_used=answer.chunks_used,
            citations=answer.citations,
        )
        if session.title == 'New Chat':
            session.title = data['question'][:60]
        session.save()

    return Response({
        'session_id': session.id,
        'answer': answer.text,
        'chunks_used': answer.chunks_used,
        'citations': answer.citations,
        'message': MessageSerializer(assistant_message).data,
    })


def _resolve_session(user, course, session_id):
    """Reuse the caller's session, or open a new one for this course."""
    if session_id:
        try:
            return ChatSession.objects.get(pk=session_id, student=user, course=course)
        except ChatSession.DoesNotExist:
            return None
    return ChatSession.objects.create(student=user, course=course)
