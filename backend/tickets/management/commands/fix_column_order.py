"""
Management command to initialize column_order for existing tickets.
Sets order based on current created_at timestamps within each column.
"""
from django.core.management.base import BaseCommand
from tickets.models import Ticket, Column


class Command(BaseCommand):
    help = 'Initialize column_order for all tickets based on creation order'

    def handle(self, *args, **options):
        columns = Column.objects.all()
        total_updated = 0
        
        for column in columns:
            self.stdout.write(f'Processing column: {column.name} (Project: {column.project.name})')
            
            # Get all tickets in this column, ordered by created_at
            tickets = Ticket.objects.filter(
                column=column
            ).order_by('created_at')
            
            # Set column_order sequentially
            for index, ticket in enumerate(tickets):
                ticket.column_order = index
                ticket.save(update_fields=['column_order'])
                total_updated += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'  Updated {tickets.count()} tickets in {column.name}'
                )
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Successfully initialized column_order for {total_updated} tickets'
            )
        )
