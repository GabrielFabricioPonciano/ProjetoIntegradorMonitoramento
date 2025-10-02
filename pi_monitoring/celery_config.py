from celery import Celery  # type: ignore
from celery.schedules import crontab  # type: ignore

# Configurações do Celery Beat
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

# Configurações gerais do Celery
CELERY_TIMEZONE = 'America/Sao_Paulo'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutos
CELERY_RESULT_BACKEND = 'django-db'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'