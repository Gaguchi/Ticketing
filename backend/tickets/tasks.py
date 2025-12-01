"""
Celery tasks for the tickets app.
"""
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def archive_old_done_tickets(self):
    """
    Archive tickets that have been in the Done column for more than the configured time.
    
    Default: Archive tickets that have been done for more than 24 hours.
    This can be configured via TICKET_ARCHIVE_AFTER_HOURS environment variable.
    """
    from tickets.models import Ticket
    
    try:
        # Get the threshold time
        hours_threshold = getattr(settings, 'TICKET_ARCHIVE_AFTER_HOURS', 24)
        threshold_time = timezone.now() - timedelta(hours=hours_threshold)
        
        # Find tickets that:
        # 1. Are in a Done column (done_at is set)
        # 2. Have been done for longer than the threshold
        # 3. Are not already archived
        tickets_to_archive = Ticket.objects.filter(
            done_at__isnull=False,
            done_at__lte=threshold_time,
            is_archived=False
        )
        
        count = tickets_to_archive.count()
        
        if count == 0:
            logger.info("No tickets to archive.")
            return {'archived': 0, 'message': 'No tickets to archive'}
        
        # Archive the tickets
        now = timezone.now()
        archived_tickets = []
        
        for ticket in tickets_to_archive:
            ticket.is_archived = True
            ticket.archived_at = now
            ticket.archived_reason = f'Auto-archived: Done for more than {hours_threshold} hours'
            ticket.save(update_fields=['is_archived', 'archived_at', 'archived_reason'])
            archived_tickets.append({
                'id': ticket.id,
                'name': ticket.name,
                'project': ticket.project.key if ticket.project else None,
                'done_at': ticket.done_at.isoformat() if ticket.done_at else None
            })
            logger.info(f"Archived ticket: {ticket.project.key}-{ticket.project_number} - {ticket.name}")
        
        logger.info(f"Successfully archived {count} tickets.")
        
        return {
            'archived': count,
            'threshold_hours': hours_threshold,
            'tickets': archived_tickets
        }
        
    except Exception as e:
        logger.error(f"Error archiving tickets: {str(e)}")
        # Retry the task
        raise self.retry(exc=e, countdown=60)  # Retry after 1 minute


@shared_task
def archive_ticket(ticket_id: int, reason: str = None):
    """
    Archive a specific ticket.
    
    Args:
        ticket_id: The ID of the ticket to archive
        reason: Optional reason for archiving
    """
    from tickets.models import Ticket
    
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        
        if ticket.is_archived:
            logger.info(f"Ticket {ticket_id} is already archived.")
            return {'success': False, 'message': 'Ticket already archived'}
        
        ticket.is_archived = True
        ticket.archived_at = timezone.now()
        ticket.archived_reason = reason or 'Manually archived via task'
        ticket.save(update_fields=['is_archived', 'archived_at', 'archived_reason'])
        
        logger.info(f"Archived ticket {ticket_id}: {ticket.name}")
        
        return {
            'success': True,
            'ticket_id': ticket_id,
            'name': ticket.name
        }
        
    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found.")
        return {'success': False, 'message': 'Ticket not found'}
    except Exception as e:
        logger.error(f"Error archiving ticket {ticket_id}: {str(e)}")
        return {'success': False, 'message': str(e)}


@shared_task
def unarchive_ticket(ticket_id: int):
    """
    Unarchive a specific ticket.
    
    Args:
        ticket_id: The ID of the ticket to unarchive
    """
    from tickets.models import Ticket
    
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        
        if not ticket.is_archived:
            logger.info(f"Ticket {ticket_id} is not archived.")
            return {'success': False, 'message': 'Ticket is not archived'}
        
        ticket.is_archived = False
        ticket.archived_at = None
        ticket.archived_by = None
        ticket.archived_reason = None
        ticket.save(update_fields=['is_archived', 'archived_at', 'archived_by', 'archived_reason'])
        
        logger.info(f"Unarchived ticket {ticket_id}: {ticket.name}")
        
        return {
            'success': True,
            'ticket_id': ticket_id,
            'name': ticket.name
        }
        
    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found.")
        return {'success': False, 'message': 'Ticket not found'}
    except Exception as e:
        logger.error(f"Error unarchiving ticket {ticket_id}: {str(e)}")
        return {'success': False, 'message': str(e)}
