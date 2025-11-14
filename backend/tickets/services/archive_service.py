from datetime import timedelta
from typing import Optional

from django.utils import timezone

from ..models import Ticket

AUTO_ARCHIVE_AGE_DAYS = 3


def auto_archive_completed_tickets(project_id: Optional[int] = None) -> int:
    """
    Automatically archive tickets that have been in the Done column for longer than
    AUTO_ARCHIVE_AGE_DAYS. Returns the number of tickets archived.
    """
    cutoff = timezone.now() - timedelta(days=AUTO_ARCHIVE_AGE_DAYS)

    queryset = Ticket.objects.filter(
        is_archived=False,
        done_at__isnull=False,
        done_at__lte=cutoff,
    )

    if project_id:
        queryset = queryset.filter(project_id=project_id)

    archived_count = 0
    for ticket in queryset.select_related("project"):
        archived = ticket.archive(auto=True)
        if archived:
            archived_count += 1

    return archived_count