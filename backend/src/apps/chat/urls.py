from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ChatSessionViewSet, ask, session_messages

router = DefaultRouter()
router.register('sessions', ChatSessionViewSet, basename='chatsession')

urlpatterns = [
    path('ask/', ask, name='chat-ask'),
    path('sessions/<int:pk>/messages/', session_messages, name='session-messages'),
    *router.urls,
]
