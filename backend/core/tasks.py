"""
core/tasks.py — Celery background tasks for LaChick.
Run with: celery -A lachick worker -l info --beat
"""

import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def expire_boosts():
    """
    Runs every 15 minutes.
    Finds profiles whose boost has expired and resets the boost flag.
    """
    from .models import Profile
    now = timezone.now()
    expired = Profile.objects.filter(is_boosted=True, boost_expires_at__lte=now)
    count   = expired.count()
    expired.update(is_boosted=False, boost_expires_at=None)
    if count:
        logger.info(f'expire_boosts: cleared {count} expired boosts.')
    return count


@shared_task
def expire_packages():
    """
    Runs every hour.
    Downgrades profiles whose subscription has expired back to FREE.
    """
    from .models import Profile, PackageTier
    now = timezone.now()
    expired = Profile.objects.exclude(
        package_tier=PackageTier.FREE
    ).filter(
        package_expires_at__lte=now
    )
    count = expired.count()
    expired.update(package_tier=PackageTier.FREE, package_expires_at=None)
    if count:
        logger.info(f'expire_packages: downgraded {count} expired subscriptions.')
    return count


@shared_task
def send_expiry_reminders():
    """
    Runs daily.
    Notifies users whose package expires within 2 days.
    """
    from .models import Profile, Notification, PackageTier
    from datetime import timedelta
    now      = timezone.now()
    two_days = now + timedelta(days=2)

    expiring = Profile.objects.exclude(
        package_tier=PackageTier.FREE
    ).filter(
        package_expires_at__gte=now,
        package_expires_at__lte=two_days,
    ).select_related('user')

    for profile in expiring:
        # Avoid spamming — only notify once per day
        recent = Notification.objects.filter(
            user=profile.user,
            notif_type=Notification.NotifType.BOOST_EXPIRE,
            created_at__gte=now - timedelta(hours=20),
        ).exists()

        if not recent:
            Notification.objects.create(
                user       = profile.user,
                notif_type = Notification.NotifType.BOOST_EXPIRE,
                message    = (
                    f'⚠️ Your {profile.get_package_tier_display()} package expires on '
                    f'{profile.package_expires_at.strftime("%d %b %Y")}. '
                    'Renew now to keep your visibility!'
                ),
            )
    logger.info(f'send_expiry_reminders: notified {expiring.count()} users.')
    return expiring.count()


# ─── Celery Beat Schedule ──────────────────────────────────────
# Add to settings.py:
#
# from celery.schedules import crontab
# CELERY_BEAT_SCHEDULE = {
#     'expire-boosts-every-15-min': {
#         'task'    : 'core.tasks.expire_boosts',
#         'schedule': crontab(minute='*/15'),
#     },
#     'expire-packages-hourly': {
#         'task'    : 'core.tasks.expire_packages',
#         'schedule': crontab(minute=0),
#     },
#     'expiry-reminders-daily': {
#         'task'    : 'core.tasks.send_expiry_reminders',
#         'schedule': crontab(hour=9, minute=0),
#     },
# }