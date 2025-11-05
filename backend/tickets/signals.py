"""
WebSocket Broadcasting Signals

This module contains Django signals that broadcast real-time updates
via WebSocket channels when tickets, comments, and other models are created/updated.
"""

from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from .models import Ticket, Comment


def send_to_channel_layer(group_name: str, message_type: str, data: dict):
    """
    Helper function to send messages to channel layer.
    
    Args:
        group_name: The channel group name (e.g., 'project_123_tickets')
        message_type: The consumer method name (e.g., 'ticket_update')
        data: Dictionary of data to send
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': message_type,
                    **data
                }
            )
    except Exception as e:
        # Log error but don't break the request
        print(f"❌ [WebSocket] Error sending to channel {group_name}: {e}")


def send_notification(user_id: int, notification_data: dict):
    """
    Send notification to a specific user.
    
    Args:
        user_id: The user ID to send notification to
        notification_data: Dictionary containing notification details
    """
    group_name = f'user_{user_id}_notifications'
    send_to_channel_layer(
        group_name,
        'notification_message',
        {'data': notification_data}
    )


@receiver(post_save, sender=Ticket)
def ticket_saved(sender, instance, created, **kwargs):
    """
    Broadcast ticket creation/update to all users in the project.
    """
    action = 'created' if created else 'updated'
    
    # Get ticket key (project prefix + ticket id)
    ticket_key = f"{instance.project.key}-{instance.id}"
    
    # Get priority name from choices
    priority_name = dict(Ticket.PRIORITY_CHOICES).get(instance.priority_id, 'Unknown')
    
    # Get status name from choices
    status_name = dict(Ticket.STATUS_CHOICES).get(instance.status, 'Unknown')
    
    # Get first assignee if any
    assignee = instance.assignees.first() if instance.assignees.exists() else None
    
    # Prepare ticket data
    ticket_data = {
        'ticket_id': instance.id,
        'key': ticket_key,
        'name': instance.name,
        'description': instance.description or '',
        'status': status_name,
        'priority': priority_name,
        'type': instance.type,
        'assignee': {
            'id': assignee.id,
            'username': assignee.username,
            'email': assignee.email,
        } if assignee else None,
        'reporter': {
            'id': instance.reporter.id,
            'username': instance.reporter.username,
        } if instance.reporter else None,
        'created_at': instance.created_at.isoformat() if instance.created_at else None,
        'updated_at': instance.updated_at.isoformat() if instance.updated_at else None,
    }
    
    # Broadcast to project ticket channel
    project_group = f'project_{instance.project_id}_tickets'
    send_to_channel_layer(
        project_group,
        'ticket_update',
        {
            'action': action,
            'data': ticket_data
        }
    )
    
    # Send notification to first assignee if ticket was just created and has assignees
    if created and assignee:
        send_notification(
            assignee.id,
            {
                'id': f'ticket_{instance.id}_assigned',
                'notification_type': 'ticket_assigned',
                'title': 'Ticket Assigned',
                'message': f'You were assigned to {ticket_key}: {instance.name}',
                'ticket_id': instance.id,
                'ticket_key': ticket_key,
                'timestamp': timezone.now().isoformat(),
            }
        )


@receiver(post_delete, sender=Ticket)
def ticket_deleted(sender, instance, **kwargs):
    """
    Broadcast ticket deletion to all users in the project.
    """
    ticket_key = f"{instance.project.key}-{instance.id}"
    
    project_group = f'project_{instance.project_id}_tickets'
    send_to_channel_layer(
        project_group,
        'ticket_update',
        {
            'action': 'deleted',
            'data': {
                'ticket_id': instance.id,
                'key': ticket_key,
            }
        }
    )


@receiver(post_save, sender=Comment)
def comment_saved(sender, instance, created, **kwargs):
    """
    Broadcast new comment to all users viewing the ticket/project.
    """
    if not created:
        return  # Only broadcast new comments, not edits
    
    ticket_key = f"{instance.ticket.project.key}-{instance.ticket.id}"
    
    comment_data = {
        'comment_id': instance.id,
        'ticket_id': instance.ticket.id,
        'ticket_key': ticket_key,
        'content': instance.content,
        'author': {
            'id': instance.user.id,
            'username': instance.user.username,
        } if instance.user else None,
        'created_at': instance.created_at.isoformat() if instance.created_at else None,
    }
    
    # Broadcast to project ticket channel
    project_group = f'project_{instance.ticket.project_id}_tickets'
    send_to_channel_layer(
        project_group,
        'comment_added',
        {
            'data': comment_data
        }
    )
    
    # Get first assignee if any
    assignee = instance.ticket.assignees.first() if instance.ticket.assignees.exists() else None
    
    # Notify ticket assignee (if not the commenter)
    if assignee and instance.user and assignee.id != instance.user.id:
        send_notification(
            assignee.id,
            {
                'id': f'comment_{instance.id}_added',
                'notification_type': 'comment_added',
                'title': 'New Comment',
                'message': f'{instance.user.username} commented on {ticket_key}',
                'ticket_id': instance.ticket.id,
                'ticket_key': ticket_key,
                'comment_id': instance.id,
                'timestamp': timezone.now().isoformat(),
            }
        )
    
    # Notify ticket reporter (if not the commenter and different from assignee)
    if (instance.ticket.reporter and instance.user and
        instance.ticket.reporter.id != instance.user.id and
        (not assignee or instance.ticket.reporter.id != assignee.id)):
        send_notification(
            instance.ticket.reporter.id,
            {
                'id': f'comment_{instance.id}_added',
                'notification_type': 'comment_added',
                'title': 'New Comment',
                'message': f'{instance.user.username} commented on {ticket_key}',
                'ticket_id': instance.ticket.id,
                'ticket_key': ticket_key,
                'comment_id': instance.id,
                'timestamp': timezone.now().isoformat(),
            }
        )


# Additional signal for mentions in comments
# This would require parsing comment content for @mentions
# For now, it's a placeholder for future implementation

def send_mention_notifications(comment_instance):
    """
    Parse comment content for @mentions and send notifications.
    
    Example: "@john please review this" would notify user 'john'
    
    This is a placeholder - implement based on your needs.
    """
    # TODO: Parse comment.content for @username patterns
    # TODO: Look up mentioned users
    # TODO: Send mention notifications via send_notification()
    pass
