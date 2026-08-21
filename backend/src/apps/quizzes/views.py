from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.courses.permissions import (
    get_accessible_course,
    require_course_manager,
    viewable_courses,
)
from apps.documents.models import Document
from services.quiz import generate_quiz_async, grade_multiple_choice, grade_short_answer

from .models import AttemptAnswer, Question, Quiz, QuizAttempt
from .serializers import (
    AttemptSerializer,
    QuizDetailSerializer,
    QuizSerializer,
    QuizStatusSerializer,
    SubmitSerializer,
)


class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer
    # Schema-generation placeholder; see the note in courses/views.py.
    queryset = Quiz.objects.none()

    def get_queryset(self):
        """Quizzes on documents in courses the caller belongs to."""
        return Quiz.objects.filter(
            document__course__in=viewable_courses(self.request.user)
        ).select_related('document', 'document__course')

    def get_serializer_class(self):
        # The detail view carries the questions; the list view does not need
        # them, and sending them would be a large payload for nothing.
        return QuizDetailSerializer if self.action == 'retrieve' else QuizSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        document_id = request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        return (
            self.get_paginated_response(serializer.data)
            if page is not None
            else Response(serializer.data)
        )

    def perform_create(self, serializer):
        """
        Create the quiz, then write its questions in the background.

        Only a course's teacher may create one: generation costs an API call,
        so letting any enrolled student trigger it would hand every student a
        button that spends the course's quota.
        """
        document = serializer.validated_data['document']
        get_accessible_course(self.request.user, document.course_id)
        require_course_manager(self.request.user, document.course, 'create quizzes')

        if document.status != Document.Status.READY:
            raise ValidationError(
                {'document': 'This document is still being processed. Wait until it is ready.'}
            )

        quiz = serializer.save(created_by=self.request.user)
        generate_quiz_async(quiz)

    def perform_destroy(self, instance):
        require_course_manager(self.request.user, instance.document.course, 'delete quizzes')
        instance.delete()

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Polled while the questions are being written."""
        return Response(QuizStatusSerializer(self.get_object()).data)

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        quiz = self.get_object()
        require_course_manager(request.user, quiz.document.course, 'regenerate quizzes')
        if quiz.status == Quiz.Status.GENERATING:
            return Response(
                {'detail': 'This quiz is already being generated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        generate_quiz_async(quiz)
        return Response(QuizStatusSerializer(quiz).data)

    @extend_schema(request=SubmitSerializer, responses=AttemptSerializer)
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Mark a completed attempt.

        Multiple choice is compared against the stored key; short answers go
        to the model, which is the only part that needs judgement. Marking
        happens here rather than in the browser for the obvious reason.
        """
        quiz = self.get_object()
        if quiz.status != Quiz.Status.READY:
            return Response(
                {'detail': 'This quiz is not ready yet.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submitted = {a['question_id']: a for a in serializer.validated_data['answers']}

        questions = list(quiz.questions.select_related('source_chunk'))
        if not questions:
            return Response(
                {'detail': 'This quiz has no questions.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        graded = []
        score = 0
        for question in questions:
            answer = submitted.get(question.id, {})
            if question.kind == Question.Kind.SHORT:
                correct, feedback = grade_short_answer(
                    question, answer.get('text_answer', '')
                )
            else:
                correct, feedback = grade_multiple_choice(
                    question, answer.get('selected_index')
                )
            score += int(correct)
            graded.append((question, answer, correct, feedback))

        with transaction.atomic():
            attempt = QuizAttempt.objects.create(
                quiz=quiz,
                student=request.user,
                completed_at=timezone.now(),
                score=score,
                total=len(questions),
            )
            AttemptAnswer.objects.bulk_create([
                AttemptAnswer(
                    attempt=attempt,
                    question=question,
                    selected_index=answer.get('selected_index'),
                    text_answer=answer.get('text_answer', ''),
                    is_correct=correct,
                    feedback=feedback,
                )
                for question, answer, correct, feedback in graded
            ])

        attempt = QuizAttempt.objects.prefetch_related(
            'answers__question__source_chunk'
        ).get(pk=attempt.pk)
        return Response(AttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def attempts(self, request, pk=None):
        """The caller's own attempts at this quiz, most recent first."""
        quiz = self.get_object()
        attempts = quiz.attempts.filter(student=request.user).prefetch_related(
            'answers__question__source_chunk'
        )
        return Response(AttemptSerializer(attempts, many=True).data)
