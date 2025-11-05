"""
WebSocket URL Routing
Maps WebSocket URLs to consumers
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # User notifications stream
    # ws://localhost:8000/ws/notifications/?token=<jwt_token>
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
    
    # Project-specific ticket updates
    # ws://localhost:8000/ws/projects/123/tickets/?token=<jwt_token>
    re_path(r'ws/projects/(?P<project_id>\d+)/tickets/$', consumers.TicketConsumer.as_asgi()),
    
    # Project presence/activity tracking
    # ws://localhost:8000/ws/projects/123/presence/?token=<jwt_token>
    re_path(r'ws/projects/(?P<project_id>\d+)/presence/$', consumers.PresenceConsumer.as_asgi()),
]
