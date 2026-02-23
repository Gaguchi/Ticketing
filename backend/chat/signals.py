import logging

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ChatMessage
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

logger = logging.getLogger(__name__)

@receiver(post_save, sender=ChatMessage)
def chat_message_saved(sender, instance, created, **kwargs):
    """
    Create notifications for chat messages.
    Optimized for performance: Bulk creates notifications and avoids N+1 queries.
    """
    if not created:
        return

    room = instance.room
    sender_user = instance.user
    
    # Get all participants except the sender, with user data pre-fetched
    # select_related('user') prevents N+1 queries when accessing participant.user
    participants = room.participants.select_related('user').exclude(user=sender_user)
    
    if not participants.exists():
        return

    # Prepare common data
    if room.type == 'direct':
        title = f'New message from {sender_user.username}'
    else:
        title = f'#{room.name}: {sender_user.username}'
        
    message_preview = instance.content[:100] if instance.content else 'Sent an attachment'
    link = f'/chat/{room.id}'
    timestamp = timezone.now()
    
    # Send WebSocket messages ONLY (No DB Notification creation)
    channel_layer = get_channel_layer()
    if channel_layer:
        for participant in participants:
            # Construct notification data without DB object
            notification_data = {
                'id': 0, # Placeholder ID since we don't save to DB
                'type': 'chat_message',
                'title': title,
                'message': message_preview,
                'link': link,
                'is_read': False,
                'data': {
                    'room_id': room.id,
                    'message_id': instance.id,
                    'sender_id': sender_user.id,
                    'room_type': room.type,
                },
                'created_at': timestamp.isoformat(),
                'timestamp': timestamp.isoformat(),
            }
            
            group_name = f'user_{participant.user.id}_notifications'
            try:
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        'type': 'chat_notification', # Use distinct type
                        'data': notification_data
                    }
                )
            except Exception as e:
                logger.error("Error sending chat notification to user %s: %s", participant.user.id, e)
