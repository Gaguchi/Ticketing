#!/usr/bin/env python
"""
Manual script to backfill done_at and archive old tickets.
Run this directly in the Celery container or backend container:

    python manual_archive.py

Or with options:
    python manual_archive.py --dry-run          # See what would happen without making changes
    python manual_archive.py --backfill-only    # Only backfill done_at, don't archive
    python manual_archive.py --archive-only     # Only archive (skip backfill)
"""
import os
import sys
import argparse
from datetime import timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.utils import timezone
from django.conf import settings
from tickets.models import Ticket, Column


def backfill_done_at(dry_run=False):
    """Set done_at for tickets in Done columns that are missing it."""
    print("\n" + "="*60)
    print("BACKFILL DONE_AT")
    print("="*60)
    
    # Find all "Done" type columns
    done_column_names = ('done', 'completed', 'closed')
    done_columns = Column.objects.filter(
        name__iregex=r'^(' + '|'.join(done_column_names) + r')$'
    )
    
    print(f"\nFound {done_columns.count()} Done-type columns:")
    for col in done_columns:
        print(f"  - {col.project.key}/{col.name} (id={col.id})")

    if not done_columns.exists():
        print("WARNING: No Done columns found.")
        return 0

    # Find tickets in Done columns that don't have done_at set
    tickets_to_update = Ticket.objects.filter(
        column__in=done_columns,
        done_at__isnull=True,
        is_archived=False
    ).select_related('project', 'column')

    count = tickets_to_update.count()

    if count == 0:
        print("\n✅ All tickets in Done columns already have done_at set.")
        
        # Show stats
        total_in_done = Ticket.objects.filter(column__in=done_columns, is_archived=False).count()
        with_done_at = Ticket.objects.filter(column__in=done_columns, is_archived=False, done_at__isnull=False).count()
        print(f"Stats: {with_done_at}/{total_in_done} tickets in Done columns have done_at set")
        return 0

    print(f"\nFound {count} ticket(s) needing done_at:")
    for ticket in tickets_to_update[:20]:  # Show first 20
        print(f"  - {ticket.project.key}-{ticket.project_number}: {ticket.name[:40]}...")
    if count > 20:
        print(f"  ... and {count - 20} more")

    if dry_run:
        print(f"\n🔍 DRY RUN: Would set done_at for {count} ticket(s).")
        return count

    # Update tickets
    updated_count = 0
    for ticket in tickets_to_update:
        ticket.done_at = ticket.updated_at or timezone.now()
        ticket.save(update_fields=['done_at'])
        updated_count += 1

    print(f"\n✅ Set done_at for {updated_count} ticket(s).")
    return updated_count


def archive_old_tickets(dry_run=False):
    """Archive tickets that have been in Done for more than 24 hours."""
    print("\n" + "="*60)
    print("ARCHIVE OLD DONE TICKETS")
    print("="*60)
    
    hours = getattr(settings, 'TICKET_ARCHIVE_AFTER_HOURS', 24)
    cutoff = timezone.now() - timedelta(hours=hours)
    
    print(f"\nLooking for tickets done before: {cutoff}")
    print(f"Archive threshold: {hours} hours")

    # Find eligible tickets
    tickets_to_archive = Ticket.objects.filter(
        is_archived=False,
        done_at__isnull=False,
        done_at__lte=cutoff,
    ).select_related('project', 'column')

    # Stats
    total_non_archived = Ticket.objects.filter(is_archived=False).count()
    with_done_at = Ticket.objects.filter(is_archived=False, done_at__isnull=False).count()
    eligible_count = tickets_to_archive.count()

    print(f"\nStats:")
    print(f"  Total non-archived tickets: {total_non_archived}")
    print(f"  With done_at set: {with_done_at}")
    print(f"  Eligible for archiving: {eligible_count}")

    if eligible_count == 0:
        print("\n✅ No tickets eligible for archiving.")
        return 0

    print(f"\nTickets to archive:")
    for ticket in tickets_to_archive[:20]:
        age = timezone.now() - ticket.done_at
        print(f"  - {ticket.project.key}-{ticket.project_number}: {ticket.name[:30]}... (done {age.days}d {age.seconds//3600}h ago)")
    if eligible_count > 20:
        print(f"  ... and {eligible_count - 20} more")

    if dry_run:
        print(f"\n🔍 DRY RUN: Would archive {eligible_count} ticket(s).")
        return eligible_count

    # Archive tickets
    archived_count = 0
    for ticket in tickets_to_archive:
        ticket.is_archived = True
        ticket.archived_at = timezone.now()
        ticket.save(update_fields=['is_archived', 'archived_at'])
        archived_count += 1
        print(f"  ✓ Archived {ticket.project.key}-{ticket.project_number}")

    print(f"\n✅ Archived {archived_count} ticket(s).")
    return archived_count


def main():
    parser = argparse.ArgumentParser(description='Manually backfill done_at and archive old tickets')
    parser.add_argument('--dry-run', action='store_true', help='Show what would happen without making changes')
    parser.add_argument('--backfill-only', action='store_true', help='Only backfill done_at, skip archiving')
    parser.add_argument('--archive-only', action='store_true', help='Only archive, skip backfill')
    
    args = parser.parse_args()

    print("="*60)
    print("MANUAL TICKET ARCHIVE SCRIPT")
    print("="*60)
    print(f"Time: {timezone.now()}")
    if args.dry_run:
        print("Mode: DRY RUN (no changes will be made)")

    backfilled = 0
    archived = 0

    if not args.archive_only:
        backfilled = backfill_done_at(dry_run=args.dry_run)

    if not args.backfill_only:
        archived = archive_old_tickets(dry_run=args.dry_run)

    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Tickets with done_at set: {backfilled}")
    print(f"Tickets archived: {archived}")
    
    if args.dry_run:
        print("\n⚠️  This was a dry run. Run without --dry-run to apply changes.")


if __name__ == '__main__':
    main()
