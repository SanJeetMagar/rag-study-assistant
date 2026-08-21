"""
Django settings for the RAG Study Assistant.

Runs locally only (capstone project). Secrets come from backend/.env,
which is gitignored -- see .env.example for the template.
"""

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

# src/config/settings.py -> src/config -> src -> backend/
SRC_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = SRC_DIR.parent

load_dotenv(BASE_DIR / '.env')


def env(key, default=None):
    return os.environ.get(key, default)


def env_bool(key, default=False):
    return env(key, str(default)).lower() in ('1', 'true', 'yes', 'on')


SECRET_KEY = env('DJANGO_SECRET_KEY', 'django-insecure-dev-only-do-not-use-in-production')
DEBUG = env_bool('DJANGO_DEBUG', True)
ALLOWED_HOSTS = env('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Required for the HNSW index on DocumentChunk.embedding.
    'django.contrib.postgres',

    'rest_framework',
    'corsheaders',
    # Generates the OpenAPI schema that Swagger UI reads.
    'drf_spectacular',

    'apps.users',
    'apps.courses',
    'apps.documents',
    'apps.chat',
    'apps.quizzes',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Host port is 5433, not the Postgres default: an unrelated container
# already occupies 5432 on this machine.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('POSTGRES_DB', 'studyai_db'),
        'USER': env('POSTGRES_USER', 'studyai'),
        'PASSWORD': env('POSTGRES_PASSWORD', 'studyai'),
        'HOST': env('POSTGRES_HOST', 'localhost'),
        'PORT': env('POSTGRES_PORT', '5433'),
    }
}

AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    # Without this, DRF falls back to its own older generator and the schema
    # comes out incomplete.
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ------------------------------------------------------------------- API docs
SPECTACULAR_SETTINGS = {
    'TITLE': 'RAG Study Assistant API',
    'DESCRIPTION': (
        'Teachers upload syllabus PDFs; students ask questions and receive '
        'answers drawn only from that material, with citations.\n\n'
        '**To try an endpoint:** call `/api/auth/login/` below, copy the '
        '`access` value from the response, press **Authorize** at the top '
        'right, and paste it. Every other endpoint needs it.'
    ),
    'VERSION': '1.0.0',
    # The schema is served at its own URL; don't repeat it inside itself.
    'SERVE_INCLUDE_SCHEMA': False,
    # Strip the leading /api/ so operations are grouped by resource name.
    'SCHEMA_PATH_PREFIX': '/api',
    'SWAGGER_UI_SETTINGS': {
        'persistAuthorization': True,  # survives a page refresh while demoing
        'displayRequestDuration': True,
    },
    # Two unrelated fields are both called "role" (a user's teacher/student
    # role, and a message's user/assistant role). Name them, or the generator
    # invents something like "Role9b8Enum".
    'ENUM_NAME_OVERRIDES': {
        'UserRoleEnum': 'apps.users.models.User.Role',
        'MessageRoleEnum': 'apps.chat.models.Message.Role',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
}

# Vite proxies /api to this server, so the browser sees one origin and CORS
# does not apply in normal development. These entries exist so the API can
# still be called directly from other tools.
CORS_ALLOWED_ORIGINS = env(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173',
).split(',')

# ---------------------------------------------------------------- RAG config

EMBEDDING_MODEL_NAME = env('EMBEDDING_MODEL_NAME', 'all-MiniLM-L6-v2')
EMBEDDING_DIMENSIONS = 384

CHUNK_SIZE_WORDS = int(env('CHUNK_SIZE_WORDS', '300'))
CHUNK_OVERLAP_WORDS = int(env('CHUNK_OVERLAP_WORDS', '50'))

# Chunks less similar than this are treated as irrelevant rather than fed to
# the model. Cosine distance: 0 is identical meaning, 1 is unrelated.
RETRIEVAL_TOP_K = int(env('RETRIEVAL_TOP_K', '4'))
RETRIEVAL_MAX_DISTANCE = float(env('RETRIEVAL_MAX_DISTANCE', '0.7'))

# Turns on the answer generator: 'gemini' (free tier), 'anthropic', or 'mock'.
# The test suite forces 'mock' so it needs no network and costs nothing.
LLM_PROVIDER = env('LLM_PROVIDER', 'gemini')
GEMINI_API_KEY = env('GEMINI_API_KEY', '')
# gemini-2.0-flash and 2.5-flash are retired / closed to new keys. Check with
#   client.models.list()  if this ever 404s.
GEMINI_MODEL = env('GEMINI_MODEL', 'gemini-3.7-flash')
ANTHROPIC_API_KEY = env('ANTHROPIC_API_KEY', '')
ANTHROPIC_MODEL = env('ANTHROPIC_MODEL', 'claude-opus-5')

MAX_UPLOAD_SIZE_MB = int(env('MAX_UPLOAD_SIZE_MB', '50'))
