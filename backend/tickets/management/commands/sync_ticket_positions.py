"""
Management command to sync TicketPosition records with their Ticket records.
This fixes any discrepancies between TicketPosition.column_id and Ticket.column_id.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from tickets.models import Ticket, TicketPosition


class Command(BaseCommand):
    help = 'Sync TicketPosition records with Ticket records (fix column_id mismatches)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only show what would be fixed without making changes',
        )
        parser.add_argument(
            '--create-missing',
            action='store_true',
            help='Create TicketPosition records for tickets that are missing them',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        create_missing = options['create_missing']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - no changes will be made'))
        
        # Find all tickets with position records
        tickets_with_positions = Ticket.objects.filter(
            position__isnull=False
        ).select_related('position', 'column')
        
        mismatched_count = 0
        fixed_count = 0
        
        self.stdout.write('Checking for mismatched TicketPosition records...\n')
        
        for ticket in tickets_with_positions:
            position = ticket.position
            
            if position.column_id != ticket.column_id or position.order != ticket.column_order:
                mismatched_count += 1
                self.stdout.write(
                    f'  Mismatch: Ticket #{ticket.id} ({ticket.ticket_key})\n'
                    f'    Position: column_id={position.column_id}, order={position.order}\n'
                    f'    Ticket:   column_id={ticket.column_id}, order={ticket.column_order}'
                )
                
                if not dry_run:
                    position.column_id = ticket.column_id
                    position.order = ticket.column_order or 0
                    position.save(update_fields=['column_id', 'order'])
                    fixed_count += 1
                    self.stdout.write(self.style.SUCCESS('    ✅ Fixed'))
                else:
                    self.stdout.write(self.style.WARNING('    (would be fixed)'))
        
        # Create missing positions if requested
        if create_missing:
            self.stdout.write('\nChecking for missing TicketPosition records...\n')
            
            tickets_without_positions = Ticket.objects.filter(
                position__isnull=True,
                column__isnull=False
            )
            
            missing_count = tickets_without_positions.count()
            
            if missing_count > 0:
                self.stdout.write(f'  Found {missing_count} tickets without positions')
                
                if not dry_run:
                    created_count = 0
                    with transaction.atomic():
                        for ticket in tickets_without_positions:
                            TicketPosition.objects.create(
                                ticket=ticket,
                                column_id=ticket.column_id,
                                order=ticket.column_order or 0
                            )
                            created_count += 1
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✅ Created {created_count} positions')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'  (would create {missing_count} positions)')
                    )
            else:
                self.stdout.write('  No missing positions found')
        
        # Summary
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(f'Total mismatched positions found: {mismatched_count}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Run without --dry-run to fix these issues'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Total positions fixed: {fixed_count}'))
