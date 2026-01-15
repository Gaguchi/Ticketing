"""
Utility functions for the chat system.
"""
from django.contrib.auth.models import User
from .models import ChatRoom, ChatMessage
from .serializers import ChatMessageSerializer
import logging

logger = logging.getLogger(__name__)


def broadcast_chat_message(chat_room, message_data: dict):
    """
    Broadcast a chat message to all connected WebSocket clients.
    
    Args:
        chat_room: The ChatRoom instance
        message_data: Serialized message data to broadcast
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning("Channel layer not available, skipping WebSocket broadcast")
            return
        
        room_group_name = f'chat_{chat_room.id}'
        
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'message_new',
                'message': message_data
            }
        )
        
        # Also broadcast room update to project group
        project_group_name = f'chat_project_{chat_room.project_id}'
        room_data = {
            'id': chat_room.id,
            'project_id': chat_room.project_id,
            'type': chat_room.type,
            'name': chat_room.name,
            'last_message': message_data,
            'updated_at': chat_room.updated_at.isoformat() if chat_room.updated_at else None,
        }
        
        async_to_sync(channel_layer.group_send)(
            project_group_name,
            {
                'type': 'room_updated',
                'room': room_data,
                'message': message_data
            }
        )
        
        logger.debug(f"Broadcasted system message to chat room {chat_room.id}")
        
    except Exception as e:
        logger.error(f"Failed to broadcast chat message: {e}")


def post_ticket_system_message(ticket, user: User, message: str) -> ChatMessage | None:
    """
    Post a system message to a ticket's chat room.
    
    This is used to log ticket changes (like status or assignment changes)
    directly in the chat, similar to how history tracking works but visible
    in the chat timeline.
    
    Args:
        ticket: The Ticket instance
        user: The User who made the change
        message: The message content (e.g., "Status changed from Open to In Progress")
    
    Returns:
        The created ChatMessage, or None if the ticket has no chat room
    """
    try:
        # Check if ticket has a chat room
        chat_room = getattr(ticket, 'chat_room', None)
        if not chat_room:
            # Ticket doesn't have a chat room yet, that's fine
            logger.debug(f"Ticket {ticket.ticket_key} has no chat room, skipping system message")
            return None
        
        # Create the system message
        system_message = ChatMessage.objects.create(
            room=chat_room,
            user=user,
            content=message,
            type='system',
            is_system=True
        )
        
        logger.info(f"Posted system message to ticket {ticket.ticket_key} chat: {message}")
        
        # Broadcast via WebSocket for real-time updates
        message_data = ChatMessageSerializer(system_message).data
        broadcast_chat_message(chat_room, message_data)
        
        return system_message
    
    except Exception as e:
        logger.error(f"Failed to post system message for ticket {ticket.ticket_key}: {e}")
        return None


def post_status_change_message(ticket, user: User, old_status: str, new_status: str) -> ChatMessage | None:
    """
    Post a system message when a ticket's status changes.
    
    Args:
        ticket: The Ticket instance
        user: The User who changed the status
        old_status: The previous status display name
        new_status: The new status display name
    
    Returns:
        The created ChatMessage, or None if no chat room exists
    """
    message = f"📋 Status changed: {old_status} → {new_status}"
    return post_ticket_system_message(ticket, user, message)


def post_assignment_change_message(ticket, user: User, old_assignees: list[str], new_assignees: list[str]) -> ChatMessage | None:
    """
    Post a system message when a ticket's assignees change.
    
    Args:
        ticket: The Ticket instance
        user: The User who changed the assignment
        old_assignees: List of previous assignee usernames
        new_assignees: List of new assignee usernames
    
    Returns:
        The created ChatMessage, or None if no chat room exists
    """
    old_set = set(old_assignees)
    new_set = set(new_assignees)
    
    added = new_set - old_set
    removed = old_set - new_set
    
    messages = []
    
    if added:
        added_names = ", ".join(sorted(added))
        messages.append(f"👤 Assigned to: {added_names}")
    
    if removed:
        removed_names = ", ".join(sorted(removed))
        messages.append(f"👤 Unassigned: {removed_names}")
    
    if not messages:
        return None  # No actual change
    
    message = " | ".join(messages)
    return post_ticket_system_message(ticket, user, message)


def post_column_change_message(ticket, user: User, old_column: str, new_column: str) -> ChatMessage | None:
    """
    Post a system message when a ticket moves to a different column.
    
    Args:
        ticket: The Ticket instance
        user: The User who moved the ticket
        old_column: The previous column name
        new_column: The new column name
    
    Returns:
        The created ChatMessage, or None if no chat room exists
    """
    message = f"📊 Moved: {old_column} → {new_column}"
    return post_ticket_system_message(ticket, user, message)
