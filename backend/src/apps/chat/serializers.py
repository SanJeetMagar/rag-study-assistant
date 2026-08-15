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
