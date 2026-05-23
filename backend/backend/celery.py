"""
backend/celery.py — Celery application instance.
"""

import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ─── Beat schedule ─────────────────────────────────────────────
app.conf.beat_schedule = {
    'expire-boosts-every-15-min': {
        'task'    : 'core.tasks.expire_boosts',
        'schedule': crontab(minute='*/15'),
    },
    'expire-packages-hourly': {
        'task'    : 'core.tasks.expire_packages',
        'schedule': crontab(minute=0),
    },
    'expiry-reminders-daily': {
        'task'    : 'core.tasks.send_expiry_reminders',
        'schedule': crontab(hour=9, minute=0),
    },
}