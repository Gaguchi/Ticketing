from django.db import models
from django.contrib.auth.models import User
import secrets
import os
from datetime import timedelta
from django.utils import timezone


class UserRole(models.Model):
    """
    Project-specific user roles for granular permission control.
    Each user can have different roles in different projects.
    
    Roles:
    - superadmin: Project owner with full control (project-specific, doesn't transfer)
    - admin: IT staff who can manage tickets, assign work, view all tickets
    - user: Regular member who can create/edit own tickets, see company tickets
    - manager: Read-only oversight role with access to all KPIs and reports
    """
    ROLE_CHOICES = [
        ('superadmin', 'Superadmin'),
        ('admin', 'Admin'),
        ('user', 'User'),
        ('manager', 'Manager'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_roles')
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='user_roles')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_roles',
        help_text='User who assigned this role'
    )
    
    class Meta:
        unique_together = ['user', 'project']
        ordering = ['project', 'role', 'user']
        verbose_name = 'User Role'
        verbose_name_plural = 'User Roles'
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()} in {self.project.name}"
    
    def save(self, *args, **kwargs):
        """Ensure user is also added to project members"""
        super().save(*args, **kwargs)
        if self.user not in self.project.members.all():
            self.project.members.add(self.user)


class Company(models.Model):
    """
    Company model representing client companies serviced by the IT business.
    Each company is isolated and has its own tickets, admins, and users.
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    logo = models.FileField(
        upload_to='company_logos/', 
        blank=True, 
        null=True, 
        help_text='Company logo (max 5MB, JPG/PNG/GIF/WebP/SVG)'
    )
    logo_thumbnail = models.ImageField(
        upload_to='company_logos/thumbs/', 
        blank=True, 
        null=True,
        help_text='Auto-generated thumbnail (not generated for SVG)'
    )
    primary_contact_email = models.EmailField(blank=True, null=True, help_text='Primary contact email for this company')
    phone = models.CharField(max_length=50, blank=True, null=True, help_text='Company phone number')
    
    # Admins are IT staff assigned to manage this company's tickets
    admins = models.ManyToManyField(
        User, 
        related_name='administered_companies', 
        blank=True,
        help_text='IT staff who manage tickets for this company'
    )
    
    # Users are client company employees who can view/create tickets
    users = models.ManyToManyField(
        User, 
        related_name='member_companies', 
        blank=True,
        help_text='Client company users who can access their company tickets'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Companies'

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        """Auto-generate thumbnail when logo is uploaded"""
        # Check if logo has changed
        if self.pk:
            try:
                old_instance = Company.objects.get(pk=self.pk)
                logo_changed = old_instance.logo != self.logo
            except Company.DoesNotExist:
                logo_changed = True
        else:
            logo_changed = bool(self.logo)
        
        # Generate thumbnail if logo changed (skip for SVG files)
        if logo_changed and self.logo:
            # Check if it's an SVG file - skip thumbnail generation
            logo_name = self.logo.name.lower() if self.logo.name else ''
            if not logo_name.endswith('.svg'):
                try:
                    from tickets.utils.image_processing import create_thumbnail
                    thumb_content = create_thumbnail(self.logo, size=(64, 64))
                    thumb_name = f"thumb_{os.path.basename(self.logo.name)}"
                    # Don't trigger another save
                    self.logo_thumbnail.save(thumb_name, thumb_content, save=False)
                except Exception:
                    # If thumbnail generation fails, continue without it
                    pass
        elif logo_changed and not self.logo:
            # Logo was removed, remove thumbnail too
            self.logo_thumbnail = None
        
        super().save(*args, **kwargs)
    
    @property
    def ticket_count(self):
        """Return the number of tickets specifically assigned to this company"""
        return self.tickets.count()
    
    @property
    def project_count(self):
        """Return the number of projects this company is associated with"""
        return self.projects.count()
    
    @property
    def admin_count(self):
        """Return the number of admins assigned to this company"""
        return self.admins.count()
    
    @property
    def user_count(self):
        """Return the number of users in this company"""
        return self.users.count()


class Project(models.Model):
    """
    Project model following Jira's pattern.
    Each project has a unique key (e.g., 'BUG', 'PROJ') used for issue keys.
    Projects can have multiple companies attached for client-specific work.
    """
    key = models.CharField(max_length=10, unique=True)  # e.g., "PROJ", "BUG"
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    lead_username = models.CharField(max_length=150, blank=True, null=True)  # Project lead
    members = models.ManyToManyField(User, related_name='project_memberships', blank=True)  # Invited members
    companies = models.ManyToManyField('Company', related_name='projects', blank=True, help_text='Companies associated with this project')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.key}: {self.name}"


class Column(models.Model):
    """
    Kanban column model for organizing tickets within a project.
    Represents workflow states (e.g., To Do, In Progress, Done).
    """
    name = models.CharField(max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='columns')
    order = models.IntegerField(default=0)
    color = models.CharField(max_length=7, default='#0052cc')  # Hex color
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['project', 'order']
        unique_together = [['name', 'project']]  # Column names unique per project

    def __str__(self):
        return f"{self.project.key}: {self.name}"


class TicketPosition(models.Model):
    """
    Lightweight model storing only ticket position data.
    Separating positions from tickets reduces lock contention and data transfer.
    """
    ticket = models.OneToOneField(
        'Ticket',
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='position'
    )
    column = models.ForeignKey(
        Column,
        on_delete=models.CASCADE,
        related_name='ticket_positions'
    )
    order = models.IntegerField(
        default=0,
        help_text='Position within column (0-based)'
    )
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['column', 'order']
        indexes = [
            models.Index(fields=['column', 'order']),
            models.Index(fields=['updated_at']),
        ]
        verbose_name = 'Ticket Position'
        verbose_name_plural = 'Ticket Positions'
    
    def __str__(self):
        return f"Ticket #{self.ticket_id} in {self.column.name} at position {self.order}"
    
    @classmethod
    def move_ticket(cls, ticket, target_column_id, target_order, max_retries=3, broadcast=True):
        """
        Move ticket to a specific position in a column with deadlock prevention.
        
        Args:
            ticket: Ticket instance to move
            target_column_id: ID of target column
            target_order: Target position (0-based)
            max_retries: Number of retry attempts for deadlock
            broadcast: Whether to broadcast WebSocket update (default: True)
            
        Returns:
            TicketPosition instance
            
        This replaces the Ticket.move_to_position() method with a much faster
        implementation that only locks/updates position records.
        """
        from django.db import transaction, OperationalError
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        import time
        
        print(f"🔄 TicketPosition.move_ticket: Moving {ticket.id} to col {target_column_id} pos {target_order}")
        
        # Get or create position for this ticket
        position, created = cls.objects.get_or_create(
            ticket=ticket,
            defaults={'column_id': target_column_id, 'order': 0}
        )
        
        old_column_id = position.column_id
        old_order = position.order
        affected_columns = set()
        
        # Retry loop for deadlock handling
        for attempt in range(max_retries):
            try:
                with transaction.atomic():
                    # DEADLOCK PREVENTION: Lock columns in consistent order
                    columns_to_lock = sorted(set([c for c in [old_column_id, target_column_id] if c]))
                    
                    # Lock only position records (much lighter than full Ticket records)
                    for column_id in columns_to_lock:
                        list(cls.objects.select_for_update().filter(
                            column_id=column_id
                        ).order_by('ticket_id'))
                    
                    # Refresh position in case it changed
                    position.refresh_from_db()
                    old_column_id = position.column_id
                    old_order = position.order
                    
                    if old_column_id != target_column_id:
                        # CROSS-COLUMN MOVE
                        print(f"🔄 Cross-column move: {old_column_id} -> {target_column_id}")
                        affected_columns.add(old_column_id)
                        affected_columns.add(target_column_id)
                        
                        # Shift down tickets in old column
                        cls.objects.filter(
                            column_id=old_column_id,
                            order__gt=old_order
                        ).update(order=models.F('order') - 1)
                        
                        # Sync Ticket model
                        Ticket.objects.filter(
                            column_id=old_column_id,
                            column_order__gt=old_order
                        ).update(column_order=models.F('column_order') - 1)
                        
                        # Shift up tickets in new column
                        cls.objects.filter(
                            column_id=target_column_id,
                            order__gte=target_order
                        ).exclude(ticket=ticket).update(order=models.F('order') + 1)
                        
                        # Sync Ticket model
                        Ticket.objects.filter(
                            column_id=target_column_id,
                            column_order__gte=target_order
                        ).exclude(id=ticket.id).update(column_order=models.F('column_order') + 1)
                        
                        # Update this ticket's position
                        position.column_id = target_column_id
                        position.order = target_order
                        position.save(update_fields=['column_id', 'order'])
                        
                        # Also update the ticket's column reference and order
                        ticket.column_id = target_column_id
                        ticket.column_order = target_order
                        # Suppress signal to avoid double-update (we send column_refresh later)
                        ticket._suppress_signals = True
                        ticket.save(update_fields=['column', 'column_order'])
                        
                    else:
                        # SAME-COLUMN MOVE
                        print(f"🔄 Same-column move in {old_column_id}: {old_order} -> {target_order}")
                        affected_columns.add(old_column_id)
                        
                        if target_order < old_order:
                            # Moving up
                            cls.objects.filter(
                                column_id=old_column_id,
                                order__gte=target_order,
                                order__lt=old_order
                            ).exclude(ticket=ticket).update(order=models.F('order') + 1)
                            
                            # Sync Ticket model for other tickets
                            Ticket.objects.filter(
                                column_id=old_column_id,
                                column_order__gte=target_order,
                                column_order__lt=old_order
                            ).exclude(id=ticket.id).update(column_order=models.F('column_order') + 1)
                            
                        elif target_order > old_order:
                            # Moving down
                            cls.objects.filter(
                                column_id=old_column_id,
                                order__gt=old_order,
                                order__lte=target_order
                            ).exclude(ticket=ticket).update(order=models.F('order') - 1)
                            
                            # Sync Ticket model for other tickets
                            Ticket.objects.filter(
                                column_id=old_column_id,
                                column_order__gt=old_order,
                                column_order__lte=target_order
                            ).exclude(id=ticket.id).update(column_order=models.F('column_order') - 1)
                        
                        # Update this ticket's position
                        position.order = target_order
                        position.save(update_fields=['order'])
                        
                        # Sync Ticket model
                        ticket.column_order = target_order
                        # Suppress signal to avoid double-update (we send column_refresh later)
                        ticket._suppress_signals = True
                        ticket.save(update_fields=['column_order'])
                    
                    # Success - break retry loop
                    print("✅ Move transaction completed successfully")
                    break
                    
            except OperationalError as e:
                if 'deadlock detected' in str(e).lower():
                    if attempt < max_retries - 1:
                        # Exponential backoff
                        sleep_time = 0.05 * (2 ** attempt)
                        time.sleep(sleep_time)
                        continue
                    raise
                raise
        
        # Broadcast position updates via WebSocket (outside transaction)
        if broadcast and affected_columns:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'project_{ticket.project_id}_tickets',
                {
                    'type': 'column_refresh',
                    'column_ids': list(affected_columns),
                }
            )
        
        return position


class Ticket(models.Model):
    """Ticket model"""

    DONE_COLUMN_NAMES = ('done', 'completed', 'closed')
    
    TYPE_CHOICES = [
        ('task', 'Task'),
        ('bug', 'Bug'),
        ('story', 'Story'),
        ('epic', 'Epic'),
    ]
    
    PRIORITY_CHOICES = [
        (1, 'Low'),
        (2, 'Medium'),
        (3, 'High'),
        (4, 'Critical'),
    ]
    
    URGENCY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
    ]
    
    IMPORTANCE_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('review', 'Review'),
        ('done', 'Done'),
    ]

    # Basic fields
    name = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='task')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    project_number = models.IntegerField(
        null=True, 
        blank=True,
        help_text='Project-scoped ticket number (e.g., 1, 2, 3 for TICK-1, TICK-2, TICK-3)'
    )
    
    # Priority and urgency
    priority_id = models.IntegerField(choices=PRIORITY_CHOICES, default=2)
    urgency = models.CharField(max_length=10, choices=URGENCY_CHOICES, default='normal')
    importance = models.CharField(max_length=10, choices=IMPORTANCE_CHOICES, default='normal')
    
    # Relationships
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tickets')
    company = models.ForeignKey(
        Company, 
        on_delete=models.CASCADE, 
        related_name='tickets',
        null=True,
        blank=True,
        help_text='Optional: Client company this ticket is specific to. Leave blank for general project tickets.'
    )
    column = models.ForeignKey(Column, on_delete=models.CASCADE, related_name='tickets')
    column_order = models.IntegerField(default=0, help_text='Order of ticket within its column for kanban board')
    assignees = models.ManyToManyField(User, related_name='assigned_tickets', blank=True)
    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reported_tickets')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subtasks')
    
    # Additional fields
    following = models.BooleanField(default=False)
    tags = models.ManyToManyField('Tag', through='TicketTag', related_name='tickets', blank=True)
    due_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    
    # Archive metadata
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='archived_tickets'
    )
    archived_reason = models.CharField(max_length=255, null=True, blank=True)
    done_at = models.DateTimeField(null=True, blank=True, help_text='Timestamp for when the ticket entered the Done column')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['column', 'column_order', '-created_at']
        unique_together = [['project', 'project_number']]

    def __str__(self):
        if self.project_number:
            return f"{self.project.key}-{self.project_number}: {self.name}"
        return f"{self.project.key}-{self.id}: {self.name}"
    
    def save(self, *args, **kwargs):
        """Auto-generate project_number if not set and track Done transitions"""
        if not self.project_number and self.project:
            # Get the highest project_number for this project
            last_ticket = Ticket.objects.filter(
                project=self.project
            ).exclude(
                project_number__isnull=True
            ).order_by('-project_number').first()
            
            if last_ticket and last_ticket.project_number:
                self.project_number = last_ticket.project_number + 1
            else:
                self.project_number = 1

        previous_column_id = None
        column_changed = False
        
        if self.pk:
            try:
                previous = Ticket.objects.get(pk=self.pk)
                previous_column_id = previous.column_id
                column_changed = previous_column_id != self.column_id
            except Ticket.DoesNotExist:
                previous_column_id = None
                column_changed = True
        else:
            # New ticket
            column_changed = True

        # Auto-assign column_order when:
        # 1. New ticket is created
        # 2. Ticket is moved to a different column
        # 3. column_order is not set
        if self.column_id and (column_changed or self.column_order is None):
            # Only auto-assign if column_order wasn't explicitly set
            update_fields = kwargs.get('update_fields')
            if update_fields is None or 'column_order' not in update_fields:
                # Get the highest column_order in the target column
                max_order = Ticket.objects.filter(
                    column_id=self.column_id
                ).exclude(
                    pk=self.pk  # Exclude self if updating
                ).aggregate(
                    models.Max('column_order')
                )['column_order__max']
                
                self.column_order = (max_order or -1) + 1

        # Update done_at when entering/leaving Done column
        if self.column_id:
            is_done_column = self._is_done_column()

            if is_done_column and (column_changed or not self.done_at):
                self.done_at = timezone.now()
            elif not is_done_column and column_changed:
                self.done_at = None
        else:
            self.done_at = None
        
        super().save(*args, **kwargs)

    def __getattribute__(self, name):
        """
        Custom attribute access to provide fallback for comments_count.
        If comments_count is accessed but not annotated, compute it.
        """
        if name == 'comments_count':
            try:
                # Try to get the annotated value first
                return super().__getattribute__(name)
            except AttributeError:
                # Fallback: count comments if not annotated
                return self.comments.count()
        return super().__getattribute__(name)

    @property
    def ticket_key(self):
        """Return formatted ticket key like TICK-1, PROJ-5"""
        if self.project_number:
            return f"{self.project.key}-{self.project_number}"
        return f"{self.project.key}-{self.id}"

    def _is_done_column(self):
        if not self.column_id:
            return False
        column = getattr(self, 'column', None)
        if column is None or column.id != self.column_id:
            column = Column.objects.filter(id=self.column_id).first()
        if not column or not column.name:
            return False
        return column.name.strip().lower() in self.DONE_COLUMN_NAMES
    
    def move_to_position(self, target_column_id, target_order, max_retries=3, broadcast=True):
        """
        Move ticket to a specific position in a column.
        
        UPDATED: Now delegates to TicketPosition.move_ticket() for better performance.
        This lightweight approach locks only position records, not full ticket data.
        
        Args:
            target_column_id: The column to move to
            target_order: The position in the column (0-indexed)
            max_retries: Number of retry attempts on deadlock (default: 3)
            broadcast: Whether to broadcast WebSocket update (default: True)
        
        Returns:
            TicketPosition instance
        """
        print(f"🎯 move_to_position called for {self.ticket_key}:")
        print(f"   Delegating to TicketPosition.move_ticket() (lightweight)")
        
        # Delegate to the new lightweight TicketPosition.move_ticket method
        return TicketPosition.move_ticket(self, target_column_id, target_order, max_retries, broadcast)

    def archive(self, archived_by=None, reason=None, auto=False):
        if self.is_archived:
            return False
        self.is_archived = True
        self.archived_at = timezone.now()
        self.archived_by = archived_by
        if reason:
            self.archived_reason = reason
        elif auto:
            self.archived_reason = 'Auto-archived after 1 day in Done'
        else:
            self.archived_reason = 'Archived manually'
        self.save(update_fields=['is_archived', 'archived_at', 'archived_by', 'archived_reason'])
        
        # Record history
        from django.apps import apps
        TicketHistory = apps.get_model('tickets', 'TicketHistory')
        TicketHistory.objects.create(
            ticket=self,
            user=archived_by,
            field='archived',
            old_value='Active',
            new_value=f'Archived ({self.archived_reason})'
        )
        return True

    def restore(self, restored_by=None):
        if not self.is_archived:
            return False
        self.is_archived = False
        self.archived_at = None
        self.archived_by = None
        self.archived_reason = None
        self.save(update_fields=['is_archived', 'archived_at', 'archived_by', 'archived_reason'])
        
        # Record history
        from django.apps import apps
        TicketHistory = apps.get_model('tickets', 'TicketHistory')
        TicketHistory.objects.create(
            ticket=self,
            user=restored_by,
            field='archived',
            old_value='Archived',
            new_value='Restored'
        )
        return True


class Comment(models.Model):
    """Comment model for tickets"""
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.user.username} on {self.ticket.name}"


class Attachment(models.Model):
    """Attachment model for tickets"""
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(
        upload_to='attachments/%Y/%m/%d/',
        help_text='Max 10MB. Allowed: images, PDF, Office docs, text, archives.'
    )
    filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(null=True, blank=True, help_text='File size in bytes')
    content_type = models.CharField(max_length=100, blank=True, help_text='MIME type')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.filename} on {self.ticket.name}"
    
    def save(self, *args, **kwargs):
        """Auto-populate file metadata on save"""
        if self.file:
            if not self.filename:
                self.filename = os.path.basename(self.file.name)
            if not self.file_size:
                self.file_size = self.file.size
            if not self.content_type:
                self.content_type = getattr(self.file, 'content_type', '')
        super().save(*args, **kwargs)


class TicketTag(models.Model):
    """
    Many-to-many relationship between Tickets and Tags.
    Tracks who added each tag and when.
    """
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='ticket_tags')
    tag = models.ForeignKey('Tag', on_delete=models.CASCADE, related_name='ticket_tags')
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='added_ticket_tags')

    class Meta:
        unique_together = [['ticket', 'tag']]
        ordering = ['added_at']

    def __str__(self):
        return f"{self.ticket.name} → {self.tag.name}"


class Tag(models.Model):
    """
    Project-specific tags for organizing tickets.
    Can represent clients, locations, teams, or any organizational unit.
    Only superadmins can create/edit/delete tags.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    color = models.CharField(max_length=7, default='#0052cc')  # Hex color (all tags use same color)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tags')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tags')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = [['name', 'project']]  # Tag names must be unique within a project

    def __str__(self):
        return f"{self.project.key}: {self.name}"


class Contact(models.Model):
    """
    Contact information for people associated with tags.
    Separate from User model - these are external contacts (clients, stakeholders, etc.)
    """
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, null=True)
    title = models.CharField(max_length=100, blank=True, null=True)  # Job title
    department = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)  # Additional notes
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.email})"


class TagContact(models.Model):
    """
    Many-to-many relationship between Tags and Contacts.
    A tag can have multiple contacts, and a contact can be associated with multiple tags.
    """
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='tag_contacts')
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='tag_contacts')
    role = models.CharField(max_length=100, blank=True, null=True)  # e.g., "Primary Contact", "Technical Lead"
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='added_tag_contacts')

    class Meta:
        unique_together = [['tag', 'contact']]
        ordering = ['added_at']

    def __str__(self):
        role_str = f" ({self.role})" if self.role else ""
        return f"{self.tag.name} → {self.contact.name}{role_str}"


class UserTag(models.Model):
    """
    Many-to-many relationship between Users and Tags for team membership.
    Users can belong to tag-based teams (e.g., "Finances Team").
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='user_tags')
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='added_user_tags')

    class Meta:
        unique_together = [['user', 'tag']]
        ordering = ['added_at']

    def __str__(self):
        return f"{self.user.username} → {self.tag.name}"


class TicketSubtask(models.Model):
    """
    Subtask model for breaking down tickets into smaller actionable items.
    Each subtask belongs to a parent ticket and can be assigned and tracked independently.
    """
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='subtasks_list')
    title = models.CharField(max_length=500)
    assignee = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_subtasks'
    )
    is_complete = models.BooleanField(default=False)
    order = models.IntegerField(default=0, help_text='Display order within the ticket')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_subtasks'
    )

    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'Subtask'
        verbose_name_plural = 'Subtasks'

    def __str__(self):
        status = "✓" if self.is_complete else "○"
        return f"{status} {self.title} ({self.ticket.project.key}-{self.ticket.id})"


class IssueLink(models.Model):
    """
    Links between tickets (issue links).
    Represents relationships like 'blocks', 'is blocked by', 'relates to', 'duplicates'.
    """
    LINK_TYPE_CHOICES = [
        ('blocks', 'Blocks'),
        ('is_blocked_by', 'Is Blocked By'),
        ('relates_to', 'Relates To'),
        ('duplicates', 'Duplicates'),
        ('is_duplicated_by', 'Is Duplicated By'),
        ('causes', 'Causes'),
        ('is_caused_by', 'Is Caused By'),
    ]
    
    source_ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='outward_links')
    target_ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='inward_links')
    link_type = models.CharField(max_length=20, choices=LINK_TYPE_CHOICES)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_issue_links')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [['source_ticket', 'target_ticket', 'link_type']]
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.source_ticket.project.key}-{self.source_ticket.id} {self.link_type} {self.target_ticket.project.key}-{self.target_ticket.id}"


class Notification(models.Model):
    """
    User notifications for real-time updates.
    Tracks events like ticket assignments, comments, mentions, status changes.
    """
    NOTIFICATION_TYPES = [
        ('ticket_assigned', 'Ticket Assigned'),
        ('ticket_created', 'Ticket Created'),
        ('ticket_updated', 'Ticket Updated'),
        ('comment_added', 'Comment Added'),
        ('mention', 'Mentioned'),
        ('status_changed', 'Status Changed'),
        ('priority_changed', 'Priority Changed'),
        ('chat_message', 'Chat Message'),
        ('general', 'General'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='general')
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True, null=True, help_text='Optional URL to navigate to')
    is_read = models.BooleanField(default=False)
    data = models.JSONField(default=dict, blank=True, help_text='Additional metadata (ticket_id, comment_id, etc.)')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]
    
    def __str__(self):
        status = "✓" if self.is_read else "●"
        return f"{status} {self.user.username}: {self.title}"


class ProjectInvitation(models.Model):
    """
    Project invitation model for email-based project access.
    
    Users receive an email with a unique token link.
    Only the invited email can accept the invitation.
    Tokens expire after 7 days by default.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
        ('revoked', 'Revoked'),
    ]
    
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE, 
        related_name='invitations'
    )
    email = models.EmailField(
        help_text='Email address of the invited user'
    )
    token = models.CharField(
        max_length=64, 
        unique=True, 
        editable=False,
        help_text='Unique token for invitation link'
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.ROLE_CHOICES,
        default='user',
        help_text='Role to assign when invitation is accepted'
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_invitations',
        help_text='User who sent the invitation'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    expires_at = models.DateTimeField(
        help_text='When this invitation expires'
    )
    accepted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the invitation was accepted'
    )
    accepted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accepted_invitations',
        help_text='User who accepted the invitation'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email', 'status']),
            models.Index(fields=['project', 'status']),
        ]
        verbose_name = 'Project Invitation'
        verbose_name_plural = 'Project Invitations'
    
    def __str__(self):
        return f"{self.email} → {self.project.name} ({self.get_status_display()})"
    
    def save(self, *args, **kwargs):
        """Generate unique token and set expiry on creation"""
        if not self.token:
            self.token = secrets.token_urlsafe(48)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)
    
    def is_valid(self):
        """Check if invitation is still valid"""
        return (
            self.status == 'pending' and
            timezone.now() < self.expires_at
        )
    
    def mark_expired(self):
        """Mark invitation as expired"""
        if self.status == 'pending':
            self.status = 'expired'
            self.save(update_fields=['status', 'updated_at'])
    
    def accept(self, user):
        """
        Accept the invitation and add user to project.
        Validates that user's email matches invitation email.
        """
        if not self.is_valid():
            raise ValueError('Invitation is not valid')
        
        if user.email.lower() != self.email.lower():
            raise ValueError('Email does not match invitation')
        
        # Add user to project
        self.project.members.add(user)
        
        # Assign role
        UserRole.objects.get_or_create(
            user=user,
            project=self.project,
            defaults={
                'role': self.role,
                'assigned_by': self.invited_by
            }
        )
        
        # Mark as accepted
        self.status = 'accepted'
        self.accepted_at = timezone.now()
        self.accepted_by = user
        self.save(update_fields=['status', 'accepted_at', 'accepted_by', 'updated_at'])
        
        return True


class TicketHistory(models.Model):
    """
    History of changes to a ticket.
    Tracks changes to fields like status, priority, assignment, etc.
    """
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='history')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ticket_history')
    field = models.CharField(max_length=50)
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ticket.id} - {self.field} changed by {self.user.username if self.user else 'System'}"

