"""
Management command to backfill done_at for tickets already in Done columns or with Done status.
This is needed for tickets that were moved to Done before the done_at tracking was added,
or tickets marked as Done via the new status system without done_at being set.
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from tickets.models import Ticket, Column, Status, StatusCategory


class Command(BaseCommand):
    help = 'Backfill done_at for tickets in Done columns or with Done status that are missing this field'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without actually updating'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Find all "Done" type columns
        done_column_names = ('done', 'completed', 'closed')
        done_columns = Column.objects.filter(
            name__iregex=r'^(' + '|'.join(done_column_names) + r')$'
        )
        
        self.stdout.write(f"Found {done_columns.count()} Done-type columns:")
        for col in done_columns:
            self.stdout.write(f"  - {col.project.key}/{col.name} (id={col.id})")

        # Find all "Done" category statuses (new Jira-style status system)
        done_statuses = Status.objects.filter(category=StatusCategory.DONE)
        
        self.stdout.write(f"\nFound {done_statuses.count()} Done-category statuses:")
        for status in done_statuses:
            self.stdout.write(f"  - {status.name} (key={status.key})")

        if not done_columns.exists() and not done_statuses.exists():
            self.stdout.write(self.style.WARNING("No Done columns or statuses found."))
            return

        # Find tickets that are "done" (in Done column OR have Done status) but don't have done_at set
        # A ticket is "done" if:
        # 1. It's in a Done column, OR
        # 2. It has a ticket_status with category='done'
        tickets_to_update = Ticket.objects.filter(
            Q(column__in=done_columns) | Q(ticket_status__in=done_statuses),
            done_at__isnull=True,
            is_archived=False
        ).select_related('project', 'column', 'ticket_status').distinct()

        count = tickets_to_update.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS(
                "All tickets in Done state already have done_at set."
            ))
            
            # Show stats
            total_in_done = Ticket.objects.filter(
                Q(column__in=done_columns) | Q(ticket_status__in=done_statuses),
                is_archived=False
            ).distinct().count()
            with_done_at = Ticket.objects.filter(
                Q(column__in=done_columns) | Q(ticket_status__in=done_statuses),
                is_archived=False,
                done_at__isnull=False
            ).distinct().count()
            self.stdout.write(f"\nStats: {with_done_at}/{total_in_done} tickets in Done state have done_at set")
            return

        self.stdout.write(f"\nFound {count} ticket(s) in Done state without done_at:")

        for ticket in tickets_to_update:
            status_info = f"status: {ticket.ticket_status.name}" if ticket.ticket_status else "no status"
            column_info = f"column: {ticket.column.name}" if ticket.column else "no column"
            self.stdout.write(
                f"  - {ticket.project.key}-{ticket.project_number}: {ticket.name} "
                f"({column_info}, {status_info}, updated: {ticket.updated_at})"
            )

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"\nDRY RUN: Would set done_at for {count} ticket(s). "
                f"Run without --dry-run to actually update."
            ))
            return

        # Update tickets - use their updated_at as a reasonable approximation of when they were done
        updated_count = 0
        for ticket in tickets_to_update:
            # Use updated_at as approximation, or now if that's not available
            ticket.done_at = ticket.updated_at or timezone.now()
            ticket.save(update_fields=['done_at'])
            updated_count += 1
            self.stdout.write(
                f"  Updated {ticket.project.key}-{ticket.project_number}: "
                f"done_at = {ticket.done_at}"
            )

        self.stdout.write(self.style.SUCCESS(
            f"\nSuccessfully set done_at for {updated_count} ticket(s)."
        ))
