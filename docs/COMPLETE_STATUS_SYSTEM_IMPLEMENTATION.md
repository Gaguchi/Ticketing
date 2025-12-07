# Complete Ticket & Status System Implementation

## Overview

This document provides a complete implementation plan that:

1. Implements Jira-style Status system (global statuses, per-project board columns)
2. Eliminates current complexity (TicketPosition dual-source-of-truth)
3. Optimizes PostgreSQL, Redis, and WebSocket usage
4. Uses LexoRank for ordering (no integer shifting)

---

## Current vs New Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CURRENT SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Ticket                    TicketPosition           Column                   │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     │
│  │ id               │     │ ticket (1:1 FK)  │     │ id               │     │
│  │ column (FK) ─────┼─────┼─►column (FK) ────┼────►│ name             │     │
│  │ column_order ────┼─────┼─►order           │     │ project (FK)     │     │
│  │ (30+ fields)     │     │                  │     │ order            │     │
│  └──────────────────┘     └──────────────────┘     └──────────────────┘     │
│                                                                              │
│  PROBLEMS:                                                                   │
│  • Dual source of truth (Ticket.column_order AND TicketPosition.order)      │
│  • Integer shifting on every move (O(n) updates)                            │
│  • Deadlock risk with row locks                                             │
│  • Column IDs are meaningless numbers (id=98 tells nothing)                 │
│  • No cross-project reporting (each project has own columns)                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ▼

┌─────────────────────────────────────────────────────────────────────────────┐
│                            NEW JIRA-STYLE SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Status (GLOBAL)           BoardColumn (per-project)    Ticket              │
│  ┌──────────────────┐     ┌──────────────────┐         ┌──────────────────┐ │
│  │ key (unique)     │◄────┤ statuses (M2M)   │         │ id               │ │
│  │ name             │     │ project (FK)     │         │ status (FK) ─────┼─┤
│  │ category         │     │ name             │         │ rank (LexoRank)  │ │
│  │ color            │     │ order            │         │ project (FK)     │ │
│  │ order            │     │ wip_limit        │         │ (30+ fields)     │ │
│  └──────────────────┘     └──────────────────┘         └──────────────────┘ │
│                                                                              │
│  BENEFITS:                                                                   │
│  • Single source of truth (Ticket.status + Ticket.rank)                     │
│  • LexoRank = O(1) updates, no shifting                                     │
│  • No locks needed for moves                                                │
│  • Status keys are semantic ("done" not 98)                                 │
│  • Cross-project reporting (same statuses everywhere)                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Models

```python
# backend/tickets/models.py

class StatusCategory(models.TextChoices):
    """
    Fixed categories - determines color and reporting group.
    These CANNOT be changed by users - they're fundamental to Kanban.
    """
    TODO = 'todo', 'To Do'           # Gray - work not started
    IN_PROGRESS = 'in_progress', 'In Progress'  # Blue - work in progress
    DONE = 'done', 'Done'            # Green - work completed


class Status(models.Model):
    """
    Global status definitions - shared across ALL projects.
    Only site admins can create/edit statuses.

    Examples:
      - key="open", name="Open", category=TODO
      - key="in_progress", name="In Progress", category=IN_PROGRESS
      - key="in_review", name="In Review", category=IN_PROGRESS
      - key="done", name="Done", category=DONE
    """
    key = models.SlugField(
        max_length=50,
        unique=True,
        help_text='Unique identifier: "open", "in_progress", "done"'
    )
    name = models.CharField(
        max_length=100,
        help_text='Display name: "Open", "In Progress", "Done"'
    )
    description = models.TextField(
        blank=True,
        help_text='Optional description of when to use this status'
    )
    category = models.CharField(
        max_length=20,
        choices=StatusCategory.choices,
        default=StatusCategory.TODO,
        db_index=True,
        help_text='Category determines color and reporting group'
    )
    color = models.CharField(
        max_length=7,
        blank=True,
        help_text='Optional hex color override. If empty, uses category color.'
    )
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text='Optional icon identifier'
    )
    order = models.IntegerField(
        default=0,
        help_text='Default display order'
    )
    is_default = models.BooleanField(
        default=False,
        help_text='System status that cannot be deleted'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Status'
        verbose_name_plural = 'Statuses'

    def __str__(self):
        return f"{self.name} ({self.category})"

    @property
    def category_color(self):
        """Return color based on category if no custom color set"""
        if self.color:
            return self.color
        return {
            StatusCategory.TODO: '#6B778C',        # Gray
            StatusCategory.IN_PROGRESS: '#0052CC', # Blue
            StatusCategory.DONE: '#36B37E',        # Green
        }.get(self.category, '#6B778C')

    def save(self, *args, **kwargs):
        # Auto-generate key from name if not provided
        if not self.key:
            from django.utils.text import slugify
            self.key = slugify(self.name).replace('-', '_')
        super().save(*args, **kwargs)


class BoardColumn(models.Model):
    """
    Per-project board column configuration.
    Maps one or more statuses to a visual column on the Kanban board.

    This is the VIEW layer - it doesn't store any ticket data.
    Tickets store their STATUS, and columns display tickets by status.
    """
    project = models.ForeignKey(
        'Project',
        on_delete=models.CASCADE,
        related_name='board_columns'
    )
    name = models.CharField(
        max_length=100,
        help_text='Display name on the board (can differ from status name)'
    )
    statuses = models.ManyToManyField(
        Status,
        related_name='board_columns',
        help_text='Statuses that appear in this column'
    )
    order = models.IntegerField(
        default=0,
        help_text='Column position on board (left to right)'
    )
    min_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Minimum tickets warning threshold'
    )
    max_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Maximum tickets (WIP limit) - column turns red if exceeded'
    )
    is_collapsed = models.BooleanField(
        default=False,
        help_text='Whether column is collapsed by default'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['project', 'order']
        unique_together = [['project', 'name']]
        verbose_name = 'Board Column'
        verbose_name_plural = 'Board Columns'

    def __str__(self):
        return f"{self.project.key}: {self.name}"

    @property
    def ticket_count(self):
        """Count tickets in this column (across all its mapped statuses)"""
        from tickets.models import Ticket
        return Ticket.objects.filter(
            project=self.project,
            status__in=self.statuses.all(),
            is_archived=False
        ).count()

    @property
    def is_over_limit(self):
        """Check if column exceeds WIP limit"""
        if self.max_limit is None:
            return False
        return self.ticket_count > self.max_limit

    @property
    def is_under_limit(self):
        """Check if column is below minimum threshold"""
        if self.min_limit is None:
            return False
        return self.ticket_count < self.min_limit
```

### Updated Ticket Model

```python
# backend/tickets/models.py - Ticket model changes

class Ticket(models.Model):
    """Ticket model - updated for Jira-style status system"""

    # === EXISTING FIELDS (keep as-is) ===
    name = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='task')
    priority_id = models.IntegerField(choices=PRIORITY_CHOICES, default=2)
    urgency = models.CharField(max_length=10, choices=URGENCY_CHOICES, default='normal')
    importance = models.CharField(max_length=10, choices=IMPORTANCE_CHOICES, default='normal')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tickets')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    assignees = models.ManyToManyField(User, related_name='assigned_tickets', blank=True)
    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    project_number = models.IntegerField(null=True, blank=True)
    # ... other existing fields ...

    # === NEW FIELDS ===
    status = models.ForeignKey(
        Status,
        on_delete=models.PROTECT,  # Prevent deleting statuses with tickets
        related_name='tickets',
        help_text='Current status (e.g., "in_progress", "done")'
    )

    rank = models.CharField(
        max_length=50,
        default='n',
        db_index=True,
        help_text='LexoRank for ordering within status group'
    )

    # === DEPRECATED FIELDS (remove after migration) ===
    # column = models.ForeignKey(Column, ...)  # REMOVE
    # column_order = models.IntegerField(...)  # REMOVE
    # status = models.CharField(...)           # REMOVE (old string status)

    class Meta:
        ordering = ['status', 'rank']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['project', 'status', 'rank']),
            models.Index(fields=['status', 'rank']),
        ]
```

---

## LexoRank Implementation

```python
# backend/tickets/utils/lexorank.py
"""
LexoRank - Lexicographic ranking for orderless inserts.

Instead of integer positions that require shifting:
  [1, 2, 3, 4] → insert at 2 → must update 2, 3, 4 → O(n)

LexoRank uses strings that sort lexicographically:
  ["aaa", "aac", "aae", "aag"] → insert between aac and aae → "aad" → O(1)

No other rows need updating!
"""

ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
MID_CHAR = 'n'  # Middle of alphabet
MIN_CHAR = 'a'
MAX_CHAR = 'z'


def rank_between(before: str | None, after: str | None) -> str:
    """
    Calculate a rank string that sorts between `before` and `after`.

    Args:
        before: Rank of item before insertion point (None if inserting at start)
        after: Rank of item after insertion point (None if inserting at end)

    Returns:
        A rank string that sorts between before and after

    Examples:
        rank_between(None, "n")     → "g"      # Before first
        rank_between("n", None)     → "u"      # After last
        rank_between("g", "n")      → "j"      # Between two
        rank_between("g", "h")      → "gn"     # Need more precision
        rank_between(None, None)    → "n"      # First item ever
    """
    if not before and not after:
        return MID_CHAR

    if not before:
        # Inserting at the start
        return _rank_before(after)

    if not after:
        # Inserting at the end
        return _rank_after(before)

    # Inserting between two ranks
    return _rank_mid(before, after)


def _rank_before(after: str) -> str:
    """Generate a rank that sorts before `after`"""
    if not after:
        return MID_CHAR

    first_char = after[0]

    # If there's room before the first character
    if first_char > MIN_CHAR:
        # Return the midpoint between 'a' and first_char
        mid_ord = (ord(MIN_CHAR) + ord(first_char)) // 2
        return chr(mid_ord)

    # No room - need to go deeper
    # "a..." → prepend 'a' and recurse
    if len(after) > 1:
        return MIN_CHAR + _rank_before(after[1:])
    else:
        return MIN_CHAR + MID_CHAR


def _rank_after(before: str) -> str:
    """Generate a rank that sorts after `before`"""
    if not before:
        return MID_CHAR

    last_char = before[-1]

    # If there's room after the last character
    if last_char < MAX_CHAR:
        # Return the midpoint between last_char and 'z'
        mid_ord = (ord(last_char) + ord(MAX_CHAR) + 1) // 2
        return before[:-1] + chr(mid_ord)

    # Last char is 'z' - append midpoint
    return before + MID_CHAR


def _rank_mid(before: str, after: str) -> str:
    """Generate a rank that sorts between `before` and `after`"""
    if before >= after:
        raise ValueError(f"before ({before}) must be < after ({after})")

    # Pad to same length for comparison
    max_len = max(len(before), len(after))

    # Find first position where they differ
    for i in range(max_len):
        b_char = before[i] if i < len(before) else MIN_CHAR
        a_char = after[i] if i < len(after) else MAX_CHAR

        if b_char == a_char:
            continue

        # Found difference
        if ord(a_char) - ord(b_char) > 1:
            # Room to insert between
            mid_ord = (ord(b_char) + ord(a_char)) // 2
            return before[:i] + chr(mid_ord)
        else:
            # No room - need to extend
            # Take before's prefix up to here, then find mid after
            prefix = before[:i+1] if i < len(before) else before + MIN_CHAR

            # Get the "after" portion from this point
            after_suffix = after[i+1:] if i+1 < len(after) else None
            before_suffix = before[i+1:] if i+1 < len(before) else None

            if before_suffix:
                return prefix + _rank_after(before_suffix)
            else:
                return prefix + (MID_CHAR if not after_suffix else _rank_before(after_suffix))

    # Identical strings (shouldn't happen) - extend
    return before + MID_CHAR


def initial_ranks(count: int) -> list[str]:
    """
    Generate initial ranks for a list of items.
    Evenly distributed across the rank space.
    """
    if count == 0:
        return []
    if count == 1:
        return [MID_CHAR]

    ranks = []
    step = len(ALPHABET) // (count + 1)

    for i in range(1, count + 1):
        idx = min(step * i, len(ALPHABET) - 1)
        ranks.append(ALPHABET[idx])

    return ranks


# === USAGE IN VIEWS ===

def move_ticket_to_position(ticket, new_status_key, before_ticket=None, after_ticket=None):
    """
    Move a ticket to a new status and position.

    Args:
        ticket: Ticket instance to move
        new_status_key: Key of target status (e.g., "in_progress")
        before_ticket: Ticket that should be ABOVE this one (optional)
        after_ticket: Ticket that should be BELOW this one (optional)

    Returns:
        Updated ticket instance
    """
    from tickets.models import Status, Ticket

    # Get new status
    new_status = Status.objects.get(key=new_status_key)

    # Calculate new rank
    before_rank = before_ticket.rank if before_ticket else None
    after_rank = after_ticket.rank if after_ticket else None
    new_rank = rank_between(before_rank, after_rank)

    # Update ticket - SINGLE database write!
    ticket.status = new_status
    ticket.rank = new_rank
    ticket.save(update_fields=['status', 'rank', 'updated_at'])

    return ticket
```

---

## Default Data Migration

```python
# backend/tickets/migrations/XXXX_add_status_system.py

from django.db import migrations

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
    {'name': 'In Progress', 'order': 2, 'statuses': ['in_progress']},
    {'name': 'Review', 'order': 3, 'statuses': ['in_review']},
    {'name': 'Done', 'order': 4, 'statuses': ['done', 'closed']},
]


def create_default_statuses(apps, schema_editor):
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
        'in progress': 'in_progress',
        'in_progress': 'in_progress',
        'review': 'in_review',
        'in review': 'in_review',
        'done': 'done',
        'completed': 'done',
        'closed': 'closed',
    }

    # Default status if no match
    default_status = Status.objects.get(key='todo')

    for ticket in Ticket.objects.select_related('column').all():
        if not ticket.column:
            ticket.status = default_status
        else:
            column_name = ticket.column.name.lower().strip()
            status_key = column_to_status.get(column_name, 'todo')
            ticket.status = Status.objects.get(key=status_key)

        # Set initial rank based on old column_order
        # Simple: convert integer to letter-based rank
        order = ticket.column_order or 0
        ticket.rank = chr(ord('a') + min(order, 25)) + 'n'  # "an", "bn", "cn", etc.

        ticket.save(update_fields=['status', 'rank'])


class Migration(migrations.Migration):
    dependencies = [
        ('tickets', 'previous_migration'),
    ]

    operations = [
        # 1. Create Status model
        migrations.CreateModel(
            name='Status',
            # ... field definitions
        ),

        # 2. Create BoardColumn model
        migrations.CreateModel(
            name='BoardColumn',
            # ... field definitions
        ),

        # 3. Add status and rank fields to Ticket
        migrations.AddField(
            model_name='ticket',
            name='status',
            # ... field definition with null=True initially
        ),
        migrations.AddField(
            model_name='ticket',
            name='rank',
            # ... field definition
        ),

        # 4. Populate default statuses
        migrations.RunPython(create_default_statuses),

        # 5. Create board columns for existing projects
        migrations.RunPython(create_board_columns_for_projects),

        # 6. Migrate tickets to new status system
        migrations.RunPython(migrate_tickets_to_status),

        # 7. Make status non-nullable
        migrations.AlterField(
            model_name='ticket',
            name='status',
            # ... field definition with null=False
        ),
    ]
```

---

## Signals for Auto-Creating Board Columns

```python
# backend/tickets/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Project, BoardColumn, Status

DEFAULT_BOARD_COLUMNS = [
    {'name': 'To Do', 'order': 1, 'statuses': ['open', 'todo']},
    {'name': 'In Progress', 'order': 2, 'statuses': ['in_progress']},
    {'name': 'Review', 'order': 3, 'statuses': ['in_review']},
    {'name': 'Done', 'order': 4, 'statuses': ['done', 'closed']},
]


@receiver(post_save, sender=Project)
def create_default_board_columns(sender, instance, created, **kwargs):
    """
    Auto-create default board columns when a new project is created.
    """
    if not created:
        return

    for col_data in DEFAULT_BOARD_COLUMNS:
        column = BoardColumn.objects.create(
            project=instance,
            name=col_data['name'],
            order=col_data['order']
        )

        # Map statuses to column
        statuses = Status.objects.filter(key__in=col_data['statuses'])
        column.statuses.set(statuses)
```

---

## API Serializers

```python
# backend/tickets/serializers.py

class StatusSerializer(serializers.ModelSerializer):
    """Serializer for global Status model"""
    category_color = serializers.CharField(read_only=True)

    class Meta:
        model = Status
        fields = [
            'key', 'name', 'description', 'category',
            'color', 'category_color', 'icon', 'order', 'is_default'
        ]
        read_only_fields = ['is_default']


class BoardColumnSerializer(serializers.ModelSerializer):
    """Serializer for per-project BoardColumn"""
    statuses = StatusSerializer(many=True, read_only=True)
    status_keys = serializers.ListField(
        child=serializers.SlugField(),
        write_only=True,
        required=False,
        help_text='List of status keys to map to this column'
    )
    ticket_count = serializers.SerializerMethodField()
    is_over_limit = serializers.BooleanField(read_only=True)
    is_under_limit = serializers.BooleanField(read_only=True)

    class Meta:
        model = BoardColumn
        fields = [
            'id', 'name', 'order', 'statuses', 'status_keys',
            'min_limit', 'max_limit', 'is_collapsed',
            'ticket_count', 'is_over_limit', 'is_under_limit'
        ]

    def get_ticket_count(self, obj):
        return obj.ticket_count

    def create(self, validated_data):
        status_keys = validated_data.pop('status_keys', [])
        column = super().create(validated_data)

        if status_keys:
            statuses = Status.objects.filter(key__in=status_keys)
            column.statuses.set(statuses)

        return column

    def update(self, instance, validated_data):
        status_keys = validated_data.pop('status_keys', None)
        column = super().update(instance, validated_data)

        if status_keys is not None:
            statuses = Status.objects.filter(key__in=status_keys)
            column.statuses.set(statuses)

        return column


class TicketSerializer(serializers.ModelSerializer):
    """Updated ticket serializer with status system"""

    # Status fields
    status = serializers.SlugRelatedField(
        slug_field='key',
        queryset=Status.objects.all()
    )
    status_name = serializers.CharField(source='status.name', read_only=True)
    status_category = serializers.CharField(source='status.category', read_only=True)
    status_color = serializers.CharField(source='status.category_color', read_only=True)

    # Existing fields
    assignees = UserSerializer(many=True, read_only=True)
    assignee_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), source='assignees', write_only=True, required=False
    )
    reporter = UserSerializer(read_only=True)
    project_key = serializers.CharField(source='project.key', read_only=True)
    ticket_key = serializers.CharField(read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'name', 'description', 'type',
            'status', 'status_name', 'status_category', 'status_color',  # Status fields
            'rank',  # LexoRank ordering
            'priority_id', 'urgency', 'importance',
            'company', 'company_name',
            'project', 'project_key', 'project_number', 'ticket_key',
            'assignees', 'assignee_ids', 'reporter',
            'parent', 'following', 'tags', 'tags_detail',
            'due_date', 'start_date', 'comments_count',
            'is_archived', 'archived_at', 'archived_by', 'archived_reason',
            'created_at', 'updated_at'
        ]
```

---

## API ViewSets

```python
# backend/tickets/views.py

class StatusViewSet(viewsets.ModelViewSet):
    """
    API endpoint for global statuses.
    Only site admins can create/update/delete.
    All users can read.
    """
    queryset = Status.objects.all()
    serializer_class = StatusSerializer
    lookup_field = 'key'  # Use key instead of id in URLs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        status = self.get_object()

        if status.is_default:
            return Response(
                {'error': 'Cannot delete default system status'},
                status=400
            )

        if status.tickets.exists():
            return Response(
                {'error': f'Cannot delete status with {status.tickets.count()} tickets'},
                status=400
            )

        return super().destroy(request, *args, **kwargs)


class BoardColumnViewSet(viewsets.ModelViewSet):
    """
    API endpoint for per-project board columns.
    Project admins can configure their board columns.
    """
    serializer_class = BoardColumnSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['project']
    ordering_fields = ['order']
    ordering = ['order']

    def get_queryset(self):
        return BoardColumn.objects.filter(
            project__members=self.request.user
        ).prefetch_related('statuses')

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder columns within a project"""
        order_data = request.data.get('order', [])

        for item in order_data:
            BoardColumn.objects.filter(
                id=item['id'],
                project__members=request.user
            ).update(order=item['order'])

        return Response({'status': 'columns reordered'})


class TicketViewSet(viewsets.ModelViewSet):
    """Updated ticket ViewSet with status-based moves"""

    @action(detail=True, methods=['patch'])
    def move(self, request, pk=None):
        """
        Move ticket to new status and/or position.

        Request body:
        {
            "status": "in_progress",     // Target status key
            "before_id": 123,            // Optional: ticket that should be above
            "after_id": 456              // Optional: ticket that should be below
        }
        """
        ticket = self.get_object()

        new_status_key = request.data.get('status')
        before_id = request.data.get('before_id')
        after_id = request.data.get('after_id')

        # Validate status
        if new_status_key:
            try:
                new_status = Status.objects.get(key=new_status_key)
            except Status.DoesNotExist:
                return Response(
                    {'error': f'Invalid status: {new_status_key}'},
                    status=400
                )
        else:
            new_status = ticket.status

        # Get neighbor tickets for rank calculation
        before_ticket = Ticket.objects.filter(id=before_id).first() if before_id else None
        after_ticket = Ticket.objects.filter(id=after_id).first() if after_id else None

        # Calculate new rank
        from tickets.utils.lexorank import rank_between
        before_rank = before_ticket.rank if before_ticket else None
        after_rank = after_ticket.rank if after_ticket else None
        new_rank = rank_between(before_rank, after_rank)

        # Update ticket
        old_status = ticket.status
        ticket.status = new_status
        ticket.rank = new_rank
        ticket.save(update_fields=['status', 'rank', 'updated_at'])

        # Broadcast via WebSocket
        self._broadcast_ticket_move(ticket, old_status, new_status)

        serializer = self.get_serializer(ticket)
        return Response(serializer.data)

    def _broadcast_ticket_move(self, ticket, old_status, new_status):
        """Send WebSocket notification for ticket move"""
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()

        # Send to project group
        async_to_sync(channel_layer.group_send)(
            f'project_{ticket.project_id}_tickets',
            {
                'type': 'ticket_update',
                'action': 'moved',
                'data': {
                    'ticket_id': ticket.id,
                    'ticket_key': ticket.ticket_key,
                    'old_status': old_status.key,
                    'new_status': new_status.key,
                    'rank': ticket.rank,
                }
            }
        )
```

---

## WebSocket Updates

```python
# backend/tickets/consumers.py - Updated TicketConsumer

class TicketConsumer(AsyncWebsocketConsumer):
    """Updated consumer with status-based events"""

    async def ticket_update(self, event):
        """Handle ticket update events"""
        await self.send(text_data=json.dumps({
            'type': f'ticket_{event.get("action", "updated")}',
            'data': event.get('data', {}),
            'sequence': int(time.time() * 1000),  # Add sequence for ordering
        }))

    async def ticket_moved(self, event):
        """Handle ticket move events (status change)"""
        await self.send(text_data=json.dumps({
            'type': 'ticket_moved',
            'data': event.get('data', {}),
            'sequence': int(time.time() * 1000),
        }))

    async def status_refresh(self, event):
        """
        Tell clients to refresh tickets for specific statuses.
        Used for bulk operations or sync issues.
        """
        await self.send(text_data=json.dumps({
            'type': 'status_refresh',
            'status_keys': event.get('status_keys', []),
            'sequence': int(time.time() * 1000),
        }))
```

---

## Frontend Types

```typescript
// frontend/src/types/api.ts

// === STATUS TYPES ===

export type StatusCategory = "todo" | "in_progress" | "done";

export interface Status {
  key: string; // "in_progress", "done", etc.
  name: string; // "In Progress", "Done"
  description?: string;
  category: StatusCategory;
  color?: string;
  category_color: string; // Computed from category if no custom color
  icon?: string;
  order: number;
  is_default: boolean;
}

export interface BoardColumn {
  id: number;
  name: string; // Display name on board
  order: number;
  statuses: Status[]; // Mapped statuses
  min_limit?: number | null;
  max_limit?: number | null;
  is_collapsed: boolean;
  ticket_count: number;
  is_over_limit: boolean;
  is_under_limit: boolean;
}

// === UPDATED TICKET TYPE ===

export interface Ticket {
  id: number;
  name: string;
  description?: string;
  type: TicketType;

  // NEW: Status-based fields
  status: string; // Status KEY: "in_progress"
  status_name: string; // Display name: "In Progress"
  status_category: StatusCategory;
  status_color: string;
  rank: string; // LexoRank: "aab", "n", etc.

  // Relationships
  project: number;
  project_key: string;
  project_number: number;
  ticket_key: string;
  company: number | null;
  company_name?: string;
  assignees: User[];
  reporter: User;
  parent: number | null;

  // Other fields...
  priority_id: number;
  urgency: TicketUrgency;
  importance: TicketImportance;
  tags: number[];
  tags_detail: Tag[];
  due_date: string | null;
  start_date: string | null;
  comments_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// === API REQUEST TYPES ===

export interface MoveTicketRequest {
  status: string; // Target status key
  before_id?: number; // Ticket that should be above
  after_id?: number; // Ticket that should be below
}

export interface CreateBoardColumnRequest {
  name: string;
  order?: number;
  status_keys: string[];
  max_limit?: number;
}
```

---

## Frontend KanbanBoard (Simplified)

```typescript
// frontend/src/components/KanbanBoard.tsx

import React, { useState, useMemo } from "react";
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import type { Ticket, BoardColumn, Status } from "../types/api";
import { rankBetween } from "../utils/lexorank";

interface KanbanBoardProps {
  tickets: Ticket[];
  columns: BoardColumn[];
  onTicketClick?: (ticket: Ticket) => void;
  onTicketMove: (
    ticketId: number,
    newStatus: string,
    beforeId?: number,
    afterId?: number
  ) => Promise<void>;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tickets,
  columns,
  onTicketClick,
  onTicketMove,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Group tickets by column based on status mapping
  const ticketsByColumn = useMemo(() => {
    const grouped: Record<number, Ticket[]> = {};

    columns.forEach((column) => {
      const statusKeys = column.statuses.map((s) => s.key);

      // Filter tickets whose status is in this column
      grouped[column.id] = tickets
        .filter((t) => statusKeys.includes(t.status))
        .sort((a, b) => a.rank.localeCompare(b.rank)); // Sort by LexoRank
    });

    return grouped;
  }, [tickets, columns]);

  // Find which column a ticket belongs to
  const findColumnForTicket = (ticketId: number): BoardColumn | undefined => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return undefined;

    return columns.find((col) =>
      col.statuses.some((s) => s.key === ticket.status)
    );
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null);

    if (!over) return;

    const ticketId = parseInt((active.id as string).replace("ticket-", ""));
    const overId = over.id as string;

    // Determine target column
    let targetColumn: BoardColumn | undefined;
    let overTicketId: number | undefined;

    if (overId.startsWith("column-")) {
      // Dropped on column
      const columnId = parseInt(overId.replace("column-", ""));
      targetColumn = columns.find((c) => c.id === columnId);
    } else if (overId.startsWith("ticket-")) {
      // Dropped on another ticket
      overTicketId = parseInt(overId.replace("ticket-", ""));
      targetColumn = findColumnForTicket(overTicketId);
    }

    if (!targetColumn || targetColumn.statuses.length === 0) return;

    // Get the status to assign (first status in column)
    const newStatus = targetColumn.statuses[0].key;

    // Calculate position
    const columnTickets = ticketsByColumn[targetColumn.id] || [];

    let beforeId: number | undefined;
    let afterId: number | undefined;

    if (overTicketId) {
      const overIndex = columnTickets.findIndex((t) => t.id === overTicketId);
      if (overIndex > 0) {
        beforeId = columnTickets[overIndex - 1].id;
      }
      afterId = overTicketId;
    } else {
      // Dropped at end of column
      if (columnTickets.length > 0) {
        beforeId = columnTickets[columnTickets.length - 1].id;
      }
    }

    // Call parent handler
    await onTicketMove(ticketId, newStatus, beforeId, afterId);
  };

  const activeTicket = activeId
    ? tickets.find((t) => `ticket-${t.id}` === activeId)
    : null;

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-container">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tickets={ticketsByColumn[column.id] || []}
            onTicketClick={onTicketClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket && <TicketCard ticket={activeTicket} isDragging />}
      </DragOverlay>
    </DndContext>
  );
};
```

---

## Redis & WebSocket Optimization

### Message Sequencing

```typescript
// frontend/src/services/websocket.service.ts

interface SequencedMessage {
  type: string;
  data: any;
  sequence: number;
}

class WebSocketService {
  private lastSequence: Map<string, number> = new Map();

  handleMessage(channel: string, message: SequencedMessage) {
    const lastSeq = this.lastSequence.get(channel) || 0;

    // Ignore out-of-order messages
    if (message.sequence <= lastSeq) {
      console.log(
        `Ignoring out-of-order message: ${message.sequence} <= ${lastSeq}`
      );
      return;
    }

    this.lastSequence.set(channel, message.sequence);

    // Process message...
  }
}
```

### Redis Caching for Fast Sync

```python
# backend/tickets/services/cache.py

import redis
import json
from django.conf import settings

redis_client = redis.from_url(settings.REDIS_URL or f'redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}')


def cache_ticket_positions(project_id: int, tickets: list):
    """
    Cache ticket positions in Redis for fast sync on reconnect.
    Key: project:{id}:positions
    Value: {ticket_id: {status, rank}}
    """
    key = f'project:{project_id}:positions'

    positions = {
        str(t.id): {'status': t.status.key, 'rank': t.rank}
        for t in tickets
    }

    redis_client.set(key, json.dumps(positions), ex=3600)  # 1 hour TTL


def get_cached_positions(project_id: int) -> dict:
    """Get cached positions for fast sync"""
    key = f'project:{project_id}:positions'
    data = redis_client.get(key)
    return json.loads(data) if data else {}


def invalidate_position_cache(project_id: int):
    """Invalidate cache when positions change"""
    key = f'project:{project_id}:positions'
    redis_client.delete(key)
```

---

## Implementation Checklist

### Phase 1: Backend Models & Migration

- [ ] Create `Status` model
- [ ] Create `BoardColumn` model
- [ ] Add `status` and `rank` fields to Ticket
- [ ] Create LexoRank utility module
- [ ] Create migration with default statuses
- [ ] Create migration to convert existing data
- [ ] Add signals for auto-creating board columns

### Phase 2: Backend API

- [ ] Create `StatusSerializer`
- [ ] Create `BoardColumnSerializer`
- [ ] Update `TicketSerializer` for status fields
- [ ] Create `StatusViewSet`
- [ ] Create `BoardColumnViewSet`
- [ ] Add `move` action to TicketViewSet
- [ ] Update WebSocket consumer for status events

### Phase 3: Frontend Types & API

- [ ] Add Status and BoardColumn types
- [ ] Update Ticket type with status fields
- [ ] Add LexoRank utility functions
- [ ] Create status API service
- [ ] Create board column API service
- [ ] Update ticket API service for moves

### Phase 4: Frontend UI

- [ ] Update KanbanBoard to use status grouping
- [ ] Simplify drag-drop to change status
- [ ] Add column configuration UI
- [ ] Add status selector in ticket modal
- [ ] Update filters to use status

### Phase 5: Cleanup

- [ ] Remove old `Column` model
- [ ] Remove old `column` and `column_order` from Ticket
- [ ] Remove `TicketPosition` model
- [ ] Remove old column-based WebSocket handlers

---

## Performance Comparison

| Operation            | Current System                  | New System                     |
| -------------------- | ------------------------------- | ------------------------------ |
| Move ticket          | 4-6 UPDATE queries              | 1 UPDATE query                 |
| Cross-column move    | Lock N rows, shift positions    | Lock 1 row                     |
| Same-column reorder  | Lock N rows, shift positions    | Lock 1 row                     |
| Deadlock risk        | High                            | None                           |
| WebSocket events     | `column_refresh` (full refetch) | `ticket_moved` (single update) |
| Position calculation | O(n) integer shifts             | O(1) LexoRank                  |
