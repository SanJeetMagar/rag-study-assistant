from rest_framework.routers import DefaultRouter

from .views import CourseViewSet

router = DefaultRouter()
router.register('', CourseViewSet, basename='course')

urlpatterns = router.urls
