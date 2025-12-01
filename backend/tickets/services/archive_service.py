from datetime import timedelta
from typing import Optional
import logging

from django.utils import timezone
from django.conf import settings

from ..models import Ticket

logger = logging.getLogger(__name__)

# Use settings value or default to 24 hours (1 day)
AUTO_ARCHIVE_AGE_HOURS = getattr(settings, 'TICKET_ARCHIVE_AFTER_HOURS', 24)


def auto_archive_completed_tickets(project_id: Optional[int] = None) -> int:
    """
    Automatically archive tickets that have been in the Done column for longer than
    AUTO_ARCHIVE_AGE_HOURS. Returns the number of tickets archived.
    """
    cutoff = timezone.now() - timedelta(hours=AUTO_ARCHIVE_AGE_HOURS)
    
    logger.info(f"Auto-archive: Looking for tickets done before {cutoff} (threshold: {AUTO_ARCHIVE_AGE_HOURS} hours)")

    queryset = Ticket.objects.filter(
        is_archived=False,
        done_at__isnull=False,
        done_at__lte=cutoff,
    )

    if project_id:
        queryset = queryset.filter(project_id=project_id)
        logger.info(f"Auto-archive: Filtering by project_id={project_id}")

    # Log query details
    total_tickets = Ticket.objects.filter(is_archived=False).count()
    tickets_with_done_at = Ticket.objects.filter(is_archived=False, done_at__isnull=False).count()
    eligible_count = queryset.count()
    
    logger.info(f"Auto-archive stats: Total non-archived={total_tickets}, with done_at={tickets_with_done_at}, eligible={eligible_count}")

    archived_count = 0
    for ticket in queryset.select_related("project"):
        logger.info(f"Archiving ticket: {ticket.project.key}-{ticket.project_number} (done_at={ticket.done_at})")
        archived = ticket.archive(auto=True)
        if archived:
            archived_count += 1

    logger.info(f"Auto-archive complete: {archived_count} tickets archived")
    return archived_count