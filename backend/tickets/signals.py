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
from .models import Ticket, Comment, Notification


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


def create_and_send_notification(user_id: int, notification_type: str, title: str, message: str, link: str = None, data: dict = None):
    """
    Create a notification in the database AND send it via WebSocket.
    
    Args:
        user_id: The user ID to send notification to
        notification_type: Type of notification (ticket_assigned, comment_added, etc.)
        title: Notification title
        message: Notification message
        link: Optional URL to navigate to
        data: Optional additional metadata
    """
    from django.contrib.auth.models import User
    
    try:
        user = User.objects.get(id=user_id)
        
        # Create notification in database
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link or '',
            data=data or {},
        )
        
        # Prepare notification data for WebSocket
        notification_data = {
            'id': notification.id,
            'type': notification_type,
            'title': title,
            'message': message,
            'link': link,
            'is_read': False,
            'data': data or {},
            'created_at': notification.created_at.isoformat(),
            'timestamp': timezone.now().isoformat(),
        }
        
        # Send via WebSocket
        send_notification(user_id, notification_data)
        
        return notification
    except User.DoesNotExist:
        print(f"❌ [Notification] User {user_id} not found")
        return None
    except Exception as e:
        print(f"❌ [Notification] Error creating notification: {e}")
        return None


@receiver(post_save, sender=Ticket)
def ticket_saved(sender, instance, created, **kwargs):
    """
    Broadcast ticket creation/update to all users in the project.
    Sends complete ticket data to avoid API fetch.
    """
    action = 'created' if created else 'updated'
    
    # Get ticket key using the model's property (uses project_number, not id)
    ticket_key = instance.ticket_key
    
    # Get priority name from choices
    priority_name = dict(Ticket.PRIORITY_CHOICES).get(instance.priority_id, 'Unknown')
    
    # Get status name from choices
    status_name = dict(Ticket.STATUS_CHOICES).get(instance.status, 'Unknown')
    
    # Get all assignees
    assignees_list = list(instance.assignees.all())
    assignee_ids = [a.id for a in assignees_list]
    
    # Get all tags
    tags_list = list(instance.tags.all())
    tag_names = [t.name for t in tags_list]
    
    # Get comments count
    comments_count = instance.comments.count()
    
    # Prepare complete ticket data matching TicketListSerializer format
    ticket_data = {
        'id': instance.id,
        'ticket_key': ticket_key,
        'project_key': instance.project.key,
        'project_number': instance.project_number,
        'name': instance.name,
        'description': instance.description or '',
        'type': instance.type,
        'status': instance.status,
        'priority_id': instance.priority_id,
        'urgency': instance.urgency,
        'column': instance.column_id,
        'column_order': instance.column_order,
        'project': instance.project_id,
        'company': instance.company_id,
        'reporter': instance.reporter_id,
        'assignee_ids': assignee_ids,
        'tag_names': tag_names,
        'comments_count': comments_count,
        'due_date': instance.due_date.isoformat() if instance.due_date else None,
        'created_at': instance.created_at.isoformat() if instance.created_at else None,
        'updated_at': instance.updated_at.isoformat() if instance.updated_at else None,
        'is_archived': instance.is_archived,
    }
    
    # Broadcast to project ticket channel
    project_group = f'project_{instance.project_id}_tickets'
    
    print(f"📡 Broadcasting {action} for {ticket_key}:")
    print(f"   column={instance.column_id}, column_order={instance.column_order}")
    print(f"   to group: {project_group}")
    
    send_to_channel_layer(
        project_group,
        'ticket_update',
        {
            'action': action,
            'data': ticket_data
        }
    )
    
    # Send notification to assignees if ticket was just created
    if created and assignee_ids:
        for assignee_id in assignee_ids:
            create_and_send_notification(
                user_id=assignee_id,
                notification_type='ticket_assigned',
                title='Ticket Assigned',
                message=f'You were assigned to {ticket_key}: {instance.name}',
                link=f'/tickets/{instance.id}',
                data={
                    'ticket_id': instance.id,
                    'ticket_key': ticket_key,
                    'project_id': instance.project_id,
                }
            )


@receiver(post_delete, sender=Ticket)
def ticket_deleted(sender, instance, **kwargs):
    """
    Broadcast ticket deletion to all users in the project.
    """
    # Use the model's property for consistent ticket_key
    ticket_key = instance.ticket_key
    
    project_group = f'project_{instance.project_id}_tickets'
    send_to_channel_layer(
        project_group,
        'ticket_update',
        {
            'action': 'deleted',
            'data': {
                'id': instance.id,
                'ticket_key': ticket_key,
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
        create_and_send_notification(
            user_id=assignee.id,
            notification_type='comment_added',
            title='New Comment',
            message=f'{instance.user.username} commented on {ticket_key}',
            link=f'/tickets/{instance.ticket.id}',
            data={
                'ticket_id': instance.ticket.id,
                'ticket_key': ticket_key,
                'comment_id': instance.id,
                'project_id': instance.ticket.project_id,
            }
        )
    
    # Notify ticket reporter (if not the commenter and different from assignee)
    if (instance.ticket.reporter and instance.user and
        instance.ticket.reporter.id != instance.user.id and
        (not assignee or instance.ticket.reporter.id != assignee.id)):
        create_and_send_notification(
            user_id=instance.ticket.reporter.id,
            notification_type='comment_added',
            title='New Comment',
            message=f'{instance.user.username} commented on {ticket_key}',
            link=f'/tickets/{instance.ticket.id}',
            data={
                'ticket_id': instance.ticket.id,
                'ticket_key': ticket_key,
                'comment_id': instance.id,
                'project_id': instance.ticket.project_id,
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
