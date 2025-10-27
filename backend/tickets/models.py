from django.db import models
from django.contrib.auth.models import User


class Project(models.Model):
    """
    Project model following Jira's pattern.
    Each project has a unique key (e.g., 'BUG', 'PROJ') used for issue keys.
    """
    key = models.CharField(max_length=10, unique=True)  # e.g., "PROJ", "BUG"
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    lead_username = models.CharField(max_length=150, blank=True, null=True)  # Project lead
    members = models.ManyToManyField(User, related_name='project_memberships', blank=True)  # Invited members
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
