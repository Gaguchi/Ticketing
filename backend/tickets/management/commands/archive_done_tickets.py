"""
Management command to manually archive old done tickets.
Useful for testing or one-off runs without Celery.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta

from tickets.models import Ticket, Column


class Command(BaseCommand):
    help = 'Archive tickets that have been in the Done column for too long'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=None,
            help='Number of hours a ticket must be done before archiving (default: from settings or 24)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be archived without actually archiving'
        )
        parser.add_argument(
            '--project',
            type=str,
            default=None,
            help='Only archive tickets from a specific project (by project key)'
        )
        parser.add_argument(
            '--stats',
            action='store_true',
            help='Show statistics about tickets and done_at field'
        )

    def handle(self, *args, **options):
        hours_threshold = options['hours'] or getattr(settings, 'TICKET_ARCHIVE_AFTER_HOURS', 24)
        dry_run = options['dry_run']
        project_key = options['project']
        show_stats = options['stats']

        if show_stats:
            self._show_stats()
            return

        threshold_time = timezone.now() - timedelta(hours=hours_threshold)

        self.stdout.write(
            f"Looking for tickets done before {threshold_time} "
            f"({hours_threshold} hours ago)..."
        )

        # Build query
        queryset = Ticket.objects.filter(
            done_at__isnull=False,
            done_at__lte=threshold_time,
            is_archived=False
        )

        if project_key:
            queryset = queryset.filter(project__key=project_key)
            self.stdout.write(f"Filtering by project: {project_key}")

        tickets_to_archive = queryset.select_related('project')
        count = tickets_to_archive.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No tickets to archive."))
            self._show_stats()
            return

        self.stdout.write(f"Found {count} ticket(s) to archive:")

        for ticket in tickets_to_archive:
            time_done = timezone.now() - ticket.done_at
            hours_done = time_done.total_seconds() / 3600
            
            self.stdout.write(
                f"  - {ticket.project.key}-{ticket.project_number}: {ticket.name} "
                f"(done for {hours_done:.1f} hours)"
            )

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"\nDRY RUN: Would archive {count} ticket(s). "
                f"Run without --dry-run to actually archive."
            ))
            return

        # Actually archive
        now = timezone.now()
        archived_count = 0

        for ticket in tickets_to_archive:
            ticket.is_archived = True
            ticket.archived_at = now
            ticket.archived_reason = f'Auto-archived: Done for more than {hours_threshold} hours'
            ticket.save(update_fields=['is_archived', 'archived_at', 'archived_reason'])
            archived_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nSuccessfully archived {archived_count} ticket(s)."
        ))

    def _show_stats(self):
        """Show statistics about tickets and done_at field"""
        self.stdout.write("\n--- Ticket Statistics ---")
        
        # Total tickets
        total = Ticket.objects.count()
        archived = Ticket.objects.filter(is_archived=True).count()
        active = Ticket.objects.filter(is_archived=False).count()
        
        self.stdout.write(f"Total tickets: {total}")
        self.stdout.write(f"  - Archived: {archived}")
        self.stdout.write(f"  - Active: {active}")
        
        # Done columns
        done_column_names = ('done', 'completed', 'closed')
        done_columns = Column.objects.filter(
            name__iregex=r'^(' + '|'.join(done_column_names) + r')$'
        )
        
        self.stdout.write(f"\nDone-type columns: {done_columns.count()}")
        
        # Tickets in done columns
        in_done_columns = Ticket.objects.filter(
            column__in=done_columns,
            is_archived=False
        ).count()
        
        with_done_at = Ticket.objects.filter(
            is_archived=False,
            done_at__isnull=False
        ).count()
        
        without_done_at_in_done = Ticket.objects.filter(
            column__in=done_columns,
            is_archived=False,
            done_at__isnull=True
        ).count()
        
        self.stdout.write(f"\nActive tickets in Done columns: {in_done_columns}")
        self.stdout.write(f"Active tickets with done_at set: {with_done_at}")
        self.stdout.write(f"Tickets in Done columns WITHOUT done_at: {without_done_at_in_done}")
        
        if without_done_at_in_done > 0:
            self.stdout.write(self.style.WARNING(
                f"\n⚠️  Run 'python manage.py backfill_done_at' to fix missing done_at values"
            ))
