from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Course


class CourseSerializer(serializers.ModelSerializer):
    teacher = UserSerializer(read_only=True)
    student_count = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'teacher', 'course_code',
            'created_at', 'is_active', 'student_count', 'document_count', 'my_role',
        ]
        # course_code is generated server-side so two courses can't collide.
        read_only_fields = ['id', 'teacher', 'course_code', 'created_at']

    # Return type hints are what let the schema generator document these as
    # integers rather than falling back to string.
    def get_student_count(self, obj) -> int:
        return obj.students.count()

    def get_document_count(self, obj) -> int:
        return obj.documents.count()

    def get_my_role(self, obj) -> str:
        user = self.context['request'].user
        return 'teacher' if obj.teacher_id == user.id else 'student'


class JoinCourseSerializer(serializers.Serializer):
    course_code = serializers.CharField(max_length=20)

    def validate_course_code(self, value):
        code = value.strip().upper()
        try:
            self.course = Course.objects.get(course_code=code, is_active=True)
        except Course.DoesNotExist:
            raise serializers.ValidationError(
                'No active course uses that code. Check it with your teacher.'
            )
        return code
