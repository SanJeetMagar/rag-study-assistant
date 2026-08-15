from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Course
from .permissions import IsCourseTeacher
from .serializers import CourseSerializer, JoinCourseSerializer


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = viewsets.ModelViewSet.permission_classes + [IsCourseTeacher]

    def get_queryset(self):
        """Courses the user teaches, plus those they're enrolled in."""
        user = self.request.user
        return (
            Course.objects.filter(Q(teacher=user) | Q(students=user))
            .distinct()
            .select_related('teacher')
        )

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    @action(detail=False, methods=['post'])
    def join(self, request):
        """Enrol the caller in a course using the code their teacher shared."""
        serializer = JoinCourseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = serializer.course

        if course.teacher_id == request.user.id:
            return Response(
                {'detail': 'You teach this course — you already have access.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if course.students.filter(pk=request.user.pk).exists():
            return Response(
                {'detail': 'You are already enrolled in this course.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        course.students.add(request.user)
        return Response(
            CourseSerializer(course, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        course = self.get_object()
        if course.teacher_id == request.user.id:
            return Response(
                {'detail': 'A teacher cannot leave their own course.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        course.students.remove(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
