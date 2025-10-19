# pi_monitoring/settings.py
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "dev-only"        
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "testserver"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "monitoring",  
    "rest_framework",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    # "django_celery_beat",  # Temporarily disabled due to Python 3.12 compatibility issue
    # "django_celery_results",  # Temporarily disabled
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "pi_monitoring.urls"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"],  
    "APP_DIRS": True,
    "OPTIONS": {
        "context_processors": [
            "django.template.context_processors.request",
            "django.contrib.auth.context_processors.auth",
            "django.contrib.messages.context_processors.messages",
        ],
    },
}]

WSGI_APPLICATION = "pi_monitoring.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "pi_monitoring",
        "USER": "ultra_user",
        "PASSWORD": "1234",
        "HOST": "localhost",
        "PORT": "5432",
    }
}

# ===== CONFIGURAÇÕES DE BACKUP =====
BACKUP_DIR = BASE_DIR / 'backups'

# ===== CONFIGURAÇÕES DE RATE LIMITING =====
RATELIMIT_ENABLE = True

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [
    BASE_DIR / "static",
]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "PI IV – Monitoramento (Demo)",
    "DESCRIPTION": "APIs do MVP (summary, series, violations). Dados sintéticos.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,  # schema não incluso no /api/docs em si
    "SWAGGER_UI_DIST": "SIDECAR",   # usa assets locais
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
}

# ===== CONFIGURAÇÕES DO SIMULADOR DE DADOS =====

# Ativar/desativar o simulador automático de dados
# Por padrão, ativo apenas em modo DEBUG
ENABLE_SIM_JOB = DEBUG

# Intervalo entre execuções do job de simulação (em segundos)
# Padrão: 60 segundos (1 minuto)
SIM_JOB_INTERVAL_SECONDS = 60

# Horários diários para geração de medições (formato "HH:MM")
# Padrão: 07:30 e 16:30 (2 medições por dia)
SIM_DAILY_TIMES = ["07:30", "16:30"]

# Número de dias para manter no banco (rolling window)
# Padrão: 365 dias (com 2 medições/dia = 730 registros máximo)
SIM_TARGET_DAYS = 365

# ===== CONFIGURAÇÕES DO CELERY =====
# Celery Configuration Options
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutos
CELERY_RESULT_BACKEND = 'django-db'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

# Configurações do Celery Beat (scheduler)
from celery.schedules import crontab  # type: ignore

CELERY_BEAT_SCHEDULE = {
    'simulate-environmental-data': {
        'task': 'monitoring.tasks.simulate_environmental_data',
        'schedule': crontab(minute='*/5'),  # A cada 5 minutos
    },
    'generate-daily-report': {
        'task': 'monitoring.tasks.generate_daily_report',
        'schedule': crontab(hour='6', minute='0'),  # Todos os dias às 6:00
    },
    'cleanup-old-data': {
        'task': 'monitoring.tasks.cleanup_old_data',
        'schedule': crontab(hour='2', minute='0'),  # Todos os dias às 2:00
    },
    'backup-database': {
        'task': 'monitoring.tasks.backup_database',
        'schedule': crontab(hour='3', minute='0'),  # Todos os dias às 3:00
    },
}

# Configuração de logging para o simulador
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'monitoring.tasks': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'monitoring.apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'monitoring': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
