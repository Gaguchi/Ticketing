"""
ASGI config for ticketing system.
Supports both HTTP and WebSocket protocols.
"""

import os
from django.core.asgi import get_asgi_application

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from tickets.middleware import JWTAuthMiddleware
from tickets.routing import websocket_urlpatterns as tickets_websocket_urlpatterns
from chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns

# Combine all WebSocket URL patterns
websocket_urlpatterns = tickets_websocket_urlpatterns + chat_websocket_urlpatterns

# WebSocket application with JWT auth (no AllowedHostsOriginValidator to allow Traefik domains)
# ALLOWED_HOSTS in settings.py will handle host validation
application = ProtocolTypeRouter({
    # Django's ASGI application to handle traditional HTTP requests
    "http": django_asgi_app,
    
    # WebSocket handler with JWT authentication
    # Note: Removed AllowedHostsOriginValidator because it's too strict for Traefik.me domains
    # Use ALLOWED_HOSTS in settings.py instead
    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
