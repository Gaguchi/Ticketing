from django.core.management.base import BaseCommand
from tickets.models import Column


class Command(BaseCommand):
    help = 'Rename "New" columns to "To Do"'

    def handle(self, *args, **options):
        columns = Column.objects.filter(name='New')
        count = columns.count()
        
        if count == 0:
            self.stdout.write(self.style.WARNING('No columns named "New" found'))
            return
        
        self.stdout.write(f'Found {count} column(s) named "New"')
        
        for col in columns:
            old_name = col.name
            col.name = 'To Do'
            col.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Renamed column ID {col.id} in project "{col.project.key}" from "{old_name}" to "{col.name}"'
                )
            )
        
        self.stdout.write(self.style.SUCCESS(f'Successfully renamed {count} column(s)'))
