from rest_framework import serializers

from .models import ChatSession, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at', 'chunks_used', 'citations']
        read_only_fields = fields


class ChatSessionSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = ChatSession
        fields = ['id', 'course', 'title', 'created_at', 'updated_at', 'message_count']
        read_only_fields = ['id', 'created_at', 'updated_at', 'message_count']


class AskSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=2000)
    course_id = serializers.IntegerField()
    session_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_question(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Ask a question first.')
        return value


class CitationSerializer(serializers.Serializer):
    """One retrieved chunk and how close it was. Documentation only."""

    chunk_id = serializers.IntegerField()
    document_title = serializers.CharField()
    page_number = serializers.IntegerField(allow_null=True)
    distance = serializers.FloatField(
        help_text='Cosine distance: 0 is identical meaning, 1 is unrelated.'
    )


class AskResponseSerializer(serializers.Serializer):
    """
    Shape of a successful /ask/ response.

    Declared so the OpenAPI schema can describe this endpoint; the view builds
    the payload itself rather than passing it through here.
    """

    session_id = serializers.IntegerField()
    answer = serializers.CharField()
    chunks_used = serializers.IntegerField()
    citations = CitationSerializer(many=True)
    message = MessageSerializer()
