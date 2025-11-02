from django.db import models
from django.contrib.auth.models import User


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
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True, help_text='Company logo image')
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


class Ticket(models.Model):
    """Ticket model"""
    
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
    assignees = models.ManyToManyField(User, related_name='assigned_tickets', blank=True)
    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reported_tickets')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subtasks')
    
    # Additional fields
    following = models.BooleanField(default=False)
    tags = models.ManyToManyField('Tag', through='TicketTag', related_name='tickets', blank=True)
    due_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project.key}-{self.id}: {self.name}"

    @property
    def comments_count(self):
        return self.comments.count()


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
    file = models.FileField(upload_to='attachments/%Y/%m/%d/')
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.filename} on {self.ticket.name}"


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
