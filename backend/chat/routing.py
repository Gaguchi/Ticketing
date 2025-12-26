from django.urls import path
from .consumers import ChatConsumer, ChatProjectConsumer

websocket_urlpatterns = [
    path('ws/chat/<int:room_id>/', ChatConsumer.as_asgi()),
    path('ws/chat/project/<int:project_id>/', ChatProjectConsumer.as_asgi()),
]
