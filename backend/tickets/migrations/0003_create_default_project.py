# Generated data migration to create default project

from django.db import migrations


def create_default_project(apps, schema_editor):
    """
    Create a default project for the system.
    This ensures all existing columns and tickets have a valid project.
    """
    Project = apps.get_model('tickets', 'Project')
    
    # Create default project if it doesn't exist
    if not Project.objects.filter(key='DEFAULT').exists():
        Project.objects.create(
            key='DEFAULT',
            name='Default Project',
            description='Default project created during migration. You can rename or delete this after creating your own projects.',
            lead_username=''
        )
        print("✓ Created default project: DEFAULT")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration - delete the default project.
    """
    Project = apps.get_model('tickets', 'Project')
    Project.objects.filter(key='DEFAULT').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0002_project_remove_ticket_customer_alter_column_options_and_more'),
    ]

    operations = [
        migrations.RunPython(create_default_project, reverse_migration),
    ]
