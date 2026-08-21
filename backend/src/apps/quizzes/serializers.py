from rest_framework import serializers

from .models import AttemptAnswer, Question, Quiz, QuizAttempt


class QuestionTakingSerializer(serializers.ModelSerializer):
    """
    A question as the student sees it while answering.

    `correct_index`, `expected_answer` and `explanation` are deliberately
    absent. The browser receives this payload, so anything in it is one
    devtools panel away from being read -- shipping the answer key to the
    person being tested would make the whole feature decorative.
    """

    class Meta:
        model = Question
        fields = ['id', 'order', 'kind', 'text', 'options']


class QuestionReviewSerializer(serializers.ModelSerializer):
    """A question after submission, when showing the answer is the point."""

    source_page = serializers.SerializerMethodField()
    source_document_id = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id', 'order', 'kind', 'text', 'options', 'correct_index',
            'expected_answer', 'explanation', 'source_page', 'source_document_id',
        ]

    def get_source_page(self, obj) -> int | None:
        return obj.source_chunk.page_number if obj.source_chunk else None

    def get_source_document_id(self, obj) -> int | None:
        return obj.source_chunk.document_id if obj.source_chunk else None


class QuizSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    document_title = serializers.CharField(source='document.title', read_only=True)
    best_score = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'document', 'document_title', 'title', 'created_at',
            'status', 'error_message', 'question_count', 'best_score',
        ]
        read_only_fields = ['id', 'created_at', 'status', 'error_message']

    def get_question_count(self, obj) -> int:
        return obj.questions.count()

    def get_best_score(self, obj) -> int | None:
        """The caller's best percentage so far, or null if never attempted."""
        request = self.context.get('request')
        if not request:
            return None
        attempts = obj.attempts.filter(student=request.user, completed_at__isnull=False)
        scores = [a.percentage for a in attempts]
        return max(scores) if scores else None


class QuizDetailSerializer(QuizSerializer):
    questions = QuestionTakingSerializer(many=True, read_only=True)

    class Meta(QuizSerializer.Meta):
        fields = QuizSerializer.Meta.fields + ['questions']


class QuizStatusSerializer(serializers.ModelSerializer):
    """Small payload for the polling loop while questions are being written."""

    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ['id', 'status', 'error_message', 'question_count']

    def get_question_count(self, obj) -> int:
        return obj.questions.count()


class SubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_index = serializers.IntegerField(required=False, allow_null=True)
    text_answer = serializers.CharField(required=False, allow_blank=True)


class SubmitSerializer(serializers.Serializer):
    answers = SubmitAnswerSerializer(many=True)


class AttemptAnswerSerializer(serializers.ModelSerializer):
    question = QuestionReviewSerializer(read_only=True)

    class Meta:
        model = AttemptAnswer
        fields = [
            'id', 'question', 'selected_index', 'text_answer',
            'is_correct', 'feedback',
        ]


class AttemptSerializer(serializers.ModelSerializer):
    answers = AttemptAnswerSerializer(many=True, read_only=True)
    percentage = serializers.IntegerField(read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'started_at', 'completed_at',
            'score', 'total', 'percentage', 'answers',
        ]
