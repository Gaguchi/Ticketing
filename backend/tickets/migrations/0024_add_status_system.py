# Generated migration for Jira-style Status system

from django.db import migrations, models
import django.db.models.deletion


DEFAULT_STATUSES = [
    {'key': 'open', 'name': 'Open', 'category': 'todo', 'order': 1, 'is_default': True},
    {'key': 'todo', 'name': 'To Do', 'category': 'todo', 'order': 2, 'is_default': True},
    {'key': 'in_progress', 'name': 'In Progress', 'category': 'in_progress', 'order': 3, 'is_default': True},
    {'key': 'in_review', 'name': 'In Review', 'category': 'in_progress', 'order': 4, 'is_default': True},
    {'key': 'blocked', 'name': 'Blocked', 'category': 'in_progress', 'order': 5, 'is_default': True},
    {'key': 'done', 'name': 'Done', 'category': 'done', 'order': 6, 'is_default': True},
    {'key': 'closed', 'name': 'Closed', 'category': 'done', 'order': 7, 'is_default': True},
]

DEFAULT_BOARD_COLUMNS = [
    {'name': 'To Do', 'order': 1, 'statuses': ['open', 'todo']},
    {'name': 'In Progress', 'order': 2, 'statuses': ['in_progress', 'blocked']},
    {'name': 'Review', 'order': 3, 'statuses': ['in_review']},
    {'name': 'Done', 'order': 4, 'statuses': ['done', 'closed']},
]


def create_default_statuses(apps, schema_editor):
    """Create the default global statuses"""
    Status = apps.get_model('tickets', 'Status')
    
    for status_data in DEFAULT_STATUSES:
        Status.objects.get_or_create(
            key=status_data['key'],
            defaults=status_data
        )


def create_board_columns_for_projects(apps, schema_editor):
    """Create default board columns for all existing projects"""
    Project = apps.get_model('tickets', 'Project')
    BoardColumn = apps.get_model('tickets', 'BoardColumn')
    Status = apps.get_model('tickets', 'Status')
    
    for project in Project.objects.all():
        for col_data in DEFAULT_BOARD_COLUMNS:
            column, created = BoardColumn.objects.get_or_create(
                project=project,
                name=col_data['name'],
                defaults={'order': col_data['order']}
            )
            if created:
                # Map statuses to column
                statuses = Status.objects.filter(key__in=col_data['statuses'])
                column.statuses.set(statuses)


def migrate_tickets_to_status(apps, schema_editor):
    """Migrate existing tickets from column to status"""
    Ticket = apps.get_model('tickets', 'Ticket')
    Status = apps.get_model('tickets', 'Status')
    Column = apps.get_model('tickets', 'Column')
    
    # Map column names to status keys
    column_to_status = {
        'to do': 'todo',
        'todo': 'todo', 
        'backlog': 'open',
        'open': 'open',
        'in progress': 'in_progress',
        'in_progress': 'in_progress',
        'doing': 'in_progress',
        'review': 'in_review',
        'in review': 'in_review',
        'testing': 'in_review',
        'blocked': 'blocked',
        'done': 'done',
        'completed': 'done',
        'closed': 'closed',
        'resolved': 'done',
    }
    
    # Get default status
    default_status = Status.objects.filter(key='todo').first()
    if not default_status:
        print("⚠️ No default status found, skipping ticket migration")
        return
    
    for ticket in Ticket.objects.select_related('column').all():
        if not ticket.column:
            ticket.ticket_status = default_status
        else:
            column_name = ticket.column.name.lower().strip()
            status_key = column_to_status.get(column_name, 'todo')
            status = Status.objects.filter(key=status_key).first()
            ticket.ticket_status = status if status else default_status
        
        # Set initial rank based on old column_order
        # Convert integer to letter-based rank: 0->"an", 1->"bn", 2->"cn", etc.
        order = ticket.column_order or 0
        # Use lowercase letters and add 'n' suffix for initial spacing
        letter_index = min(order, 25)  # Cap at 'z'
        ticket.rank = chr(ord('a') + letter_index) + 'n'
        
        ticket.save(update_fields=['ticket_status', 'rank'])
    
    print(f"✅ Migrated {Ticket.objects.count()} tickets to new status system")


def reverse_migrate_tickets(apps, schema_editor):
    """Reverse migration - clear ticket_status and rank"""
    Ticket = apps.get_model('tickets', 'Ticket')
    Ticket.objects.all().update(ticket_status=None, rank='n')


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0023_add_resolution_fields'),
    ]

    operations = [
        # 1. Create Status model
        migrations.CreateModel(
            name='Status',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.SlugField(help_text='Unique identifier: "open", "in_progress", "done"', max_length=50, unique=True)),
                ('name', models.CharField(help_text='Display name: "Open", "In Progress", "Done"', max_length=100)),
                ('description', models.TextField(blank=True, help_text='Optional description of when to use this status')),
                ('category', models.CharField(choices=[('todo', 'To Do'), ('in_progress', 'In Progress'), ('done', 'Done')], db_index=True, default='todo', help_text='Category determines color and reporting group', max_length=20)),
                ('color', models.CharField(blank=True, help_text='Optional hex color override. If empty, uses category color.', max_length=7)),
                ('icon', models.CharField(blank=True, help_text='Optional icon identifier', max_length=50)),
                ('order', models.IntegerField(default=0, help_text='Default display order')),
                ('is_default', models.BooleanField(default=False, help_text='System status that cannot be deleted')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Status',
                'verbose_name_plural': 'Statuses',
                'ordering': ['order', 'name'],
            },
        ),
        
        # 2. Create BoardColumn model
        migrations.CreateModel(
            name='BoardColumn',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Display name on the board (can differ from status name)', max_length=100)),
                ('order', models.IntegerField(default=0, help_text='Column position on board (left to right)')),
                ('min_limit', models.PositiveIntegerField(blank=True, help_text='Minimum tickets warning threshold', null=True)),
                ('max_limit', models.PositiveIntegerField(blank=True, help_text='Maximum tickets (WIP limit) - column turns red if exceeded', null=True)),
                ('is_collapsed', models.BooleanField(default=False, help_text='Whether column is collapsed by default')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='board_columns', to='tickets.project')),
                ('statuses', models.ManyToManyField(help_text='Statuses that appear in this column', related_name='board_columns', to='tickets.status')),
            ],
            options={
                'verbose_name': 'Board Column',
                'verbose_name_plural': 'Board Columns',
                'ordering': ['project', 'order'],
                'unique_together': {('project', 'name')},
            },
        ),
        
        # 3. Add ticket_status and rank fields to Ticket
        migrations.AddField(
            model_name='ticket',
            name='ticket_status',
            field=models.ForeignKey(
                blank=True,
                help_text='Current status (e.g., "in_progress", "done")',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='tickets',
                to='tickets.status'
            ),
        ),
        migrations.AddField(
            model_name='ticket',
            name='rank',
            field=models.CharField(db_index=True, default='n', help_text='LexoRank for ordering within status group', max_length=50),
        ),
        
        # 4. Populate default statuses
        migrations.RunPython(create_default_statuses, migrations.RunPython.noop),
        
        # 5. Create board columns for existing projects
        migrations.RunPython(create_board_columns_for_projects, migrations.RunPython.noop),
        
        # 6. Migrate tickets to new status system
        migrations.RunPython(migrate_tickets_to_status, reverse_migrate_tickets),
    ]
