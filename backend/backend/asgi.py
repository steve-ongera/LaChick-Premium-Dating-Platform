"""
lachick/asgi.py — ASGI config with Django Channels WebSocket support.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import re_path
from core.consumers import ChatConsumer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django_asgi_app = get_asgi_application()

websocket_urlpatterns = [
    re_path(r'^ws/chat/(?P<room_id>[0-9a-f-]+)/$', ChatConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    'http'     : django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        URLRouter(websocket_urlpatterns)
    ),
})