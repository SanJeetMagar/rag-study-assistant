"""Root URL configuration. Every API route lives under /api/."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/courses/', include('apps.courses.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/chat/', include('apps.chat.urls')),

    # API documentation. The schema is the machine-readable OpenAPI file; the
    # other two are human interfaces onto it. Swagger UI can send live
    # requests, ReDoc is read-only but easier to read.
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path(
        '',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='swagger-ui',
    ),
    path(
        'api/redoc/',
        SpectacularRedocView.as_view(url_name='schema'),
        name='redoc',
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
