from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import models
from .models import (
    Ticket, Project, Column, Comment, Attachment,
    Tag, Contact, TagContact, UserTag, TicketTag, IssueLink, Company, UserRole, TicketSubtask,
    Notification, ProjectInvitation, TicketPosition, TicketHistory, Status, BoardColumn, ResolutionFeedback,
    UserReview
)


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
            'ticket_count', 'is_over_limit', 'is_under_limit',
            'project', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_ticket_count(self, obj):
        return obj.ticket_count()
    
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


class UserSerializer(serializers.ModelSerializer):
    administered_companies = serializers.SerializerMethodField()
    member_companies = serializers.SerializerMethodField()
    has_companies = serializers.SerializerMethodField()
    is_it_admin = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'administered_companies', 'member_companies',
            'has_companies', 'is_it_admin'
        ]
    
    def get_administered_companies(self, obj):
        """Companies where this user is an IT admin"""
        companies = obj.administered_companies.all()
        return [{'id': c.id, 'name': c.name} for c in companies]
    
    def get_member_companies(self, obj):
        """Companies where this user is a member"""
        companies = obj.member_companies.all()
        return [{'id': c.id, 'name': c.name} for c in companies]
    
    def get_has_companies(self, obj):
        """Check if user has any company associations"""
        return obj.administered_companies.exists() or obj.member_companies.exists()
    
    def get_is_it_admin(self, obj):
        """Check if user is an IT admin for any company"""
        return obj.administered_companies.exists()


class UserSimpleSerializer(serializers.ModelSerializer):
    """Lightweight user serializer without company info to avoid circular references"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model with full details"""
    admins = UserSimpleSerializer(many=True, read_only=True)
    users = UserSimpleSerializer(many=True, read_only=True)
    admin_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text='List of user IDs to assign as admins'
    )
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text='List of user IDs to assign as company users'
    )
    project_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text='List of project IDs to associate with this company'
    )
    ticket_count = serializers.SerializerMethodField()
    admin_count = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    logo_thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'description', 'logo', 'logo_url', 'logo_thumbnail', 'logo_thumbnail_url',
            'primary_contact_email', 'phone',
            'admins', 'admin_ids', 'admin_count',
            'users', 'user_ids', 'user_count',
            'ticket_count', 'project_count', 'project_ids',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'logo_thumbnail']
    
    def validate_logo(self, value):
        """Validate logo file type and size"""
        if value:
            # Check file size (max 5MB)
            max_size = 5 * 1024 * 1024
            if value.size > max_size:
                raise serializers.ValidationError("Logo file size must be less than 5MB")
            
            # Check file extension
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
            file_ext = value.name.lower().split('.')[-1] if '.' in value.name else ''
            if f'.{file_ext}' not in allowed_extensions:
                raise serializers.ValidationError(
                    f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
                )
        return value
    
    def get_logo_url(self, obj):
        """Return absolute URL for logo"""
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
    
    def get_logo_thumbnail_url(self, obj):
        """Return absolute URL for logo thumbnail"""
        if obj.logo_thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo_thumbnail.url)
            return obj.logo_thumbnail.url
        return None
    
    def get_ticket_count(self, obj):
        if hasattr(obj, 'annotated_ticket_count'):
            return obj.annotated_ticket_count
        return obj.ticket_count

    def get_admin_count(self, obj):
        if hasattr(obj, 'annotated_admin_count'):
            return obj.annotated_admin_count
        return obj.admin_count

    def get_user_count(self, obj):
        if hasattr(obj, 'annotated_user_count'):
            return obj.annotated_user_count
        return obj.user_count

    def get_project_count(self, obj):
        if hasattr(obj, 'annotated_project_count'):
            return obj.annotated_project_count
        return obj.project_count
    
    def create(self, validated_data):
        admin_ids = validated_data.pop('admin_ids', [])
        user_ids = validated_data.pop('user_ids', [])
        project_ids = validated_data.pop('project_ids', [])
        
        company = Company.objects.create(**validated_data)
        
        if admin_ids:
            company.admins.set(admin_ids)
        if user_ids:
            company.users.set(user_ids)
        if project_ids:
            # Update the reverse M2M relationship (Project.companies)
            from .models import Project
            for project_id in project_ids:
                try:
                    project = Project.objects.get(id=project_id)
                    project.companies.add(company)
                except Project.DoesNotExist:
                    pass
        
        return company
    
    def update(self, instance, validated_data):
        admin_ids = validated_data.pop('admin_ids', None)
        user_ids = validated_data.pop('user_ids', None)
        project_ids = validated_data.pop('project_ids', None)
        
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.logo = validated_data.get('logo', instance.logo)
        instance.primary_contact_email = validated_data.get('primary_contact_email', instance.primary_contact_email)
        instance.phone = validated_data.get('phone', instance.phone)
        instance.save()
        
        if admin_ids is not None:
            instance.admins.set(admin_ids)
        if user_ids is not None:
            instance.users.set(user_ids)
        if project_ids is not None:
            # Update the reverse M2M relationship (Project.companies)
            from .models import Project
            # Clear existing associations and add new ones
            for project in instance.projects.all():
                project.companies.remove(instance)
            for project_id in project_ids:
                try:
                    project = Project.objects.get(id=project_id)
                    project.companies.add(instance)
                except Project.DoesNotExist:
                    pass
        
        return instance


class CompanyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing companies"""
    ticket_count = serializers.SerializerMethodField()
    admin_count = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()
    admin_names = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    logo_thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'description', 'logo', 'logo_url', 'logo_thumbnail_url',
            'primary_contact_email', 'phone',
            'ticket_count', 'admin_count', 'user_count', 'project_count',
            'admin_names', 'created_at'
        ]
    
    def get_logo_url(self, obj):
        """Return absolute URL for logo"""
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
    
    def get_logo_thumbnail_url(self, obj):
        """Return absolute URL for logo thumbnail"""
        if obj.logo_thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo_thumbnail.url)
            return obj.logo_thumbnail.url
        return None
    
    def get_ticket_count(self, obj):
        if hasattr(obj, 'annotated_ticket_count'):
            return obj.annotated_ticket_count
        return obj.ticket_count

    def get_admin_count(self, obj):
        if hasattr(obj, 'annotated_admin_count'):
            return obj.annotated_admin_count
        return obj.admin_count

    def get_user_count(self, obj):
        if hasattr(obj, 'annotated_user_count'):
            return obj.annotated_user_count
        return obj.user_count

    def get_project_count(self, obj):
        if hasattr(obj, 'annotated_project_count'):
            return obj.annotated_project_count
        return obj.project_count
    
    def get_admin_names(self, obj):
        return [f"{admin.first_name} {admin.last_name}".strip() or admin.username 
                for admin in obj.admins.all()[:3]]  # Show first 3 admins


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model"""
    tickets_count = serializers.SerializerMethodField()
    columns_count = serializers.SerializerMethodField()
    members = UserSimpleSerializer(many=True, read_only=True)
    member_usernames = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        help_text="List of usernames to add as project members"
    )
    companies = CompanyListSerializer(many=True, read_only=True)
    company_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Company.objects.all(),
        source='companies',
        write_only=True,
        required=False,
        help_text="List of company IDs to associate with this project"
    )
    
    class Meta:
        model = Project
        fields = ['id', 'key', 'name', 'description', 'lead_username', 'members', 'member_usernames',
                  'companies', 'company_ids', 'tickets_count', 'columns_count', 'created_at', 'updated_at']
    
    def get_tickets_count(self, obj):
        if hasattr(obj, 'tickets_count_annotated'):
            return obj.tickets_count_annotated
        return obj.tickets.count()
    
    def get_columns_count(self, obj):
        if hasattr(obj, 'columns_count_annotated'):
            return obj.columns_count_annotated
        return obj.columns.count()
    
    def create(self, validated_data):
        member_usernames = validated_data.pop('member_usernames', [])
        companies = validated_data.pop('companies', [])
        project = Project.objects.create(**validated_data)
        
        # Add members by username
        if member_usernames:
            users = User.objects.filter(username__in=member_usernames)
            project.members.set(users)
        
        # Add companies
        if companies:
            project.companies.set(companies)
        
        return project
    
    def update(self, instance, validated_data):
        member_usernames = validated_data.pop('member_usernames', None)
        companies = validated_data.pop('companies', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update members if provided
        if member_usernames is not None:
            users = User.objects.filter(username__in=member_usernames)
            instance.members.set(users)
        
        # Update companies if provided
        if companies is not None:
            instance.companies.set(companies)
        
        return instance
        
        return instance


class ColumnSerializer(serializers.ModelSerializer):
    tickets_count = serializers.SerializerMethodField()
    project_key = serializers.CharField(source='project.key', read_only=True)
    
    class Meta:
        model = Column
        fields = ['id', 'name', 'project', 'project_key', 'order', 'color', 
                  'tickets_count', 'created_at', 'updated_at']
    
    def get_tickets_count(self, obj):
        return obj.tickets.count()


class TicketPositionSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for ticket positions.
    Returns minimal data for fast position updates.
    """
    ticket_key = serializers.SerializerMethodField()
    
    class Meta:
        model = TicketPosition
        fields = ['ticket_id', 'ticket_key', 'column_id', 'order', 'updated_at']
        read_only_fields = ['ticket_id', 'updated_at']
    
    def get_ticket_key(self, obj):
        """Include ticket key for easier debugging"""
        try:
            return obj.ticket.ticket_key
        except:
            return f"#{obj.ticket_id}"


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'ticket', 'user', 'content', 'created_at', 'updated_at']
        read_only_fields = ['user', 'ticket']


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Attachment
        fields = ['id', 'ticket', 'file', 'filename', 'uploaded_by', 'uploaded_at']
        read_only_fields = ['uploaded_by']


class ResolutionFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for resolution feedback history entries"""
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = ResolutionFeedback
        fields = ['id', 'feedback_type', 'feedback', 'rating', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']


class TicketSerializer(serializers.ModelSerializer):
    assignees = UserSerializer(many=True, read_only=True)
    assignee_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=User.objects.all(), 
        source='assignees', 
        write_only=True,
        required=False
    )
    reporter = UserSerializer(read_only=True)
    project_key = serializers.CharField(source='project.key', read_only=True)
    project_number = serializers.IntegerField(read_only=True)
    ticket_key = serializers.CharField(read_only=True)
    column_name = serializers.CharField(source='column.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_logo_url = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(read_only=True)
    subtasks = serializers.SerializerMethodField()
    tags_detail = serializers.SerializerMethodField()
    archived_by = UserSerializer(read_only=True)
    column_order = serializers.SerializerMethodField()
    is_final_column = serializers.SerializerMethodField()
    
    # Resolution feedback history
    resolution_feedbacks = ResolutionFeedbackSerializer(many=True, read_only=True)
    
    # NEW: Jira-style status fields
    ticket_status_key = serializers.SlugRelatedField(
        slug_field='key',
        queryset=Status.objects.all(),
        source='ticket_status',
        required=False,
        allow_null=True,
        help_text='Status key (e.g., "in_progress")'
    )
    ticket_status_name = serializers.CharField(source='ticket_status.name', read_only=True)
    ticket_status_category = serializers.CharField(source='ticket_status.category', read_only=True)
    ticket_status_color = serializers.CharField(source='ticket_status.category_color', read_only=True)
    rank = serializers.CharField(read_only=True)
    
    # Make project and column optional for servicedesk users (will be set in perform_create)
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True
    )
    column = serializers.PrimaryKeyRelatedField(
        queryset=Column.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'name', 'description', 'type', 'status',
            # NEW: Jira-style status fields
            'ticket_status_key', 'ticket_status_name', 'ticket_status_category', 'ticket_status_color', 'rank',
            'priority_id', 'urgency', 'importance',
            'company', 'company_name', 'company_logo_url',
            'project', 'project_key', 'project_number', 'ticket_key',
            'column', 'column_name', 'column_order', 'is_final_column',
            'assignees', 'assignee_ids', 'reporter',
            'parent', 'subtasks', 'following', 'tags', 'tags_detail',
            'due_date', 'start_date', 'comments_count',
            'is_archived', 'archived_at', 'archived_by', 'archived_reason', 'done_at',
            'resolution_status', 'resolution_rating', 'resolution_feedback', 'resolution_feedbacks', 'resolved_at',
            'created_at', 'updated_at'
        ]
    
    def get_company_logo_url(self, obj):
        """Return absolute URL for company logo"""
        if obj.company and obj.company.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.company.logo.url)
            return obj.company.logo.url
        return None
    
    def get_column_order(self, obj):
        """Get order from TicketPosition if available, else fallback to Ticket.column_order"""
        if hasattr(obj, 'position'):
            return obj.position.order
        return obj.column_order
    
    def get_is_final_column(self, obj):
        """Check if ticket is in a 'done' status - uses ticket_status.category for O(1) lookup"""
        # With the new status system, we just check if the status category is 'done'
        if obj.ticket_status:
            return obj.ticket_status.category == 'done'
        # Fallback for old column system: check if column name indicates done
        if obj.column and obj.column.name:
            return obj.column.name.strip().lower() in ('done', 'closed', 'resolved', 'complete', 'completed')
        return False

    def get_subtasks(self, obj):
        if obj.subtasks.exists():
            return TicketSerializer(obj.subtasks.all(), many=True).data
        return []
    
    def get_tags_detail(self, obj):
        """Get detailed tag information including contacts"""
        ticket_tags = obj.ticket_tags.select_related('tag', 'tag__project', 'added_by').all()
        return TicketTagSerializer(ticket_tags, many=True).data


class TicketListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    assignee_ids = serializers.SerializerMethodField()
    project_key = serializers.CharField(source='project.key', read_only=True)
    project_number = serializers.IntegerField(read_only=True)
    ticket_key = serializers.CharField(read_only=True)
    column_name = serializers.CharField(source='column.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_logo_url = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(read_only=True)
    tag_names = serializers.SerializerMethodField()
    column_order = serializers.SerializerMethodField()
    is_final_column = serializers.SerializerMethodField()
    
    # NEW: Jira-style status fields
    ticket_status_key = serializers.CharField(source='ticket_status.key', read_only=True, allow_null=True)
    ticket_status_name = serializers.CharField(source='ticket_status.name', read_only=True, allow_null=True)
    ticket_status_category = serializers.CharField(source='ticket_status.category', read_only=True, allow_null=True)
    ticket_status_color = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'name', 'type', 'status', 'priority_id',
            'urgency', 'importance',
            'company', 'company_name', 'company_logo_url',
            'project', 'project_key', 'project_number', 'ticket_key',
            'column', 'column_name', 'column_order', 'is_final_column',
            # NEW: Jira-style status fields
            'ticket_status_key', 'ticket_status_name', 'ticket_status_category', 'ticket_status_color',
            'rank',
            'assignee_ids', 'following', 'comments_count', 'tag_names',
            'due_date', 'start_date',
            'is_archived', 'archived_at', 'archived_reason', 'done_at',
            'resolution_status', 'resolution_rating', 'resolution_feedback', 'resolved_at',
            'created_at', 'updated_at'
        ]
    
    def get_ticket_status_color(self, obj):
        """Get color from ticket status (custom or category-based)"""
        if obj.ticket_status:
            if obj.ticket_status.color:
                return obj.ticket_status.color
            # Fallback to category color
            category_colors = {
                'todo': '#6B778C',
                'in_progress': '#0052CC',
                'done': '#36B37E',
            }
            return category_colors.get(obj.ticket_status.category, '#6B778C')
        return None
    
    def get_company_logo_url(self, obj):
        """Return absolute URL for company logo"""
        if obj.company and obj.company.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.company.logo.url)
            return obj.company.logo.url
        return None
    
    def get_column_order(self, obj):
        """Get order from TicketPosition if available, else fallback to Ticket.column_order"""
        if hasattr(obj, 'position'):
            return obj.position.order
        return obj.column_order
    
    def get_is_final_column(self, obj):
        """Check if ticket is in a 'done' status - uses ticket_status.category for O(1) lookup"""
        # With the new status system, we just check if the status category is 'done'
        if obj.ticket_status:
            return obj.ticket_status.category == 'done'
        # Fallback for old column system: check if column name indicates done
        if obj.column and obj.column.name:
            return obj.column.name.strip().lower() in ('done', 'closed', 'resolved', 'complete', 'completed')
        return False

    def get_assignee_ids(self, obj):
        # Use the prefetched data to avoid additional queries
        return [assignee.id for assignee in obj.assignees.all()]
    
    def get_tag_names(self, obj):
        """Get list of tag names for quick display using prefetched data"""
        return [tag.name for tag in obj.tags.all()]


class KanbanTicketSerializer(serializers.ModelSerializer):
    """
    Super lightweight serializer for Kanban board view.
    Only includes fields actually displayed on Kanban cards.
    ~65% smaller payload than TicketListSerializer.
    """
    assignee_ids = serializers.SerializerMethodField()
    assignees_detail = serializers.SerializerMethodField()
    project_key = serializers.CharField(source='project.key', read_only=True)
    project_number = serializers.IntegerField(read_only=True)
    ticket_key = serializers.CharField(read_only=True)
    column_name = serializers.CharField(source='column.name', read_only=True)
    company_logo_url = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Ticket
        fields = [
            # Core identification
            'id', 'name', 'type', 'priority_id',
            'project_key', 'project_number', 'ticket_key',
            # Grouping (old + new systems)
            'column', 'column_name', 'ticket_status_key',
            # LexoRank ordering
            'rank',
            # Display on card
            'company_logo_url', 'following', 'comments_count',
            'assignee_ids', 'assignees_detail', 'resolved_at', 'resolution_status', 'resolution_feedback',
            # IMPORTANT: Include due_date for DeadlineView
            'due_date',
        ]
        # Read ticket_status_key directly from foreign key
        extra_kwargs = {
            'ticket_status_key': {'source': 'ticket_status.key', 'read_only': True}
        }
    
    # Override to get ticket_status_key since extra_kwargs doesn't work well with FK
    ticket_status_key = serializers.CharField(source='ticket_status.key', read_only=True, allow_null=True)
    
    def get_company_logo_url(self, obj):
        """Return absolute URL for company logo"""
        if obj.company and obj.company.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.company.logo.url)
            return obj.company.logo.url
        return None
    
    def get_assignee_ids(self, obj):
        # Use prefetched data
        return [assignee.id for assignee in obj.assignees.all()]
    
    def get_assignees_detail(self, obj):
        """Return assignee details for TicketCard display"""
        return [
            {
                'id': assignee.id,
                'username': assignee.username,
                'first_name': assignee.first_name,
                'last_name': assignee.last_name,
            }
            for assignee in obj.assignees.all()
        ]


class ContactSerializer(serializers.ModelSerializer):
    """Serializer for Contact model"""
    
    class Meta:
        model = Contact
        fields = [
            'id', 'name', 'email', 'phone', 'title', 
            'department', 'description', 'created_at', 'updated_at'
        ]


class TagContactSerializer(serializers.ModelSerializer):
    """Serializer for TagContact relationship"""
    contact = ContactSerializer(read_only=True)
    contact_id = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(),
        source='contact',
        write_only=True
    )
    added_by = UserSerializer(read_only=True)
    
    class Meta:
        model = TagContact
        fields = ['id', 'tag', 'contact', 'contact_id', 'role', 'added_at', 'added_by']
        read_only_fields = ['added_by', 'added_at']


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model with nested contacts"""
    created_by = UserSerializer(read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    contacts = serializers.SerializerMethodField()
    tickets_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Tag
        fields = [
            'id', 'name', 'description', 'color', 'project', 'project_name',
            'contacts', 'tickets_count', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by']
    
    def get_contacts(self, obj):
        """Get all contacts associated with this tag"""
        tag_contacts = obj.tag_contacts.select_related('contact', 'added_by').all()
        return TagContactSerializer(tag_contacts, many=True).data
    
    def get_tickets_count(self, obj):
        """Count tickets with this tag"""
        return obj.tickets.count()


class TagListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for tag list views"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    tickets_count = serializers.SerializerMethodField()
    contacts_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'description', 'color', 'project_name', 'tickets_count', 'contacts_count']
    
    def get_tickets_count(self, obj):
        return obj.tickets.count()
    
    def get_contacts_count(self, obj):
        return obj.tag_contacts.count()


class UserTagSerializer(serializers.ModelSerializer):
    """Serializer for UserTag relationship (team membership)"""
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True
    )
    tag = TagListSerializer(read_only=True)
    tag_id = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        source='tag',
        write_only=True
    )
    added_by = UserSerializer(read_only=True)
    
    class Meta:
        model = UserTag
        fields = ['id', 'user', 'user_id', 'tag', 'tag_id', 'added_at', 'added_by']
        read_only_fields = ['added_by', 'added_at']


class TicketTagSerializer(serializers.ModelSerializer):
    """Serializer for TicketTag relationship"""
    tag = TagListSerializer(read_only=True)
    tag_id = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        source='tag',
        write_only=True
    )
    added_by = UserSerializer(read_only=True)
    
    class Meta:
        model = TicketTag
        fields = ['id', 'ticket', 'tag', 'tag_id', 'added_at', 'added_by']
        read_only_fields = ['added_by', 'added_at']


class IssueLinkSerializer(serializers.ModelSerializer):
    """Serializer for IssueLink (ticket relationships)"""
    source_ticket_key = serializers.SerializerMethodField()
    target_ticket_key = serializers.SerializerMethodField()
    source_ticket_name = serializers.CharField(source='source_ticket.name', read_only=True)
    target_ticket_name = serializers.CharField(source='target_ticket.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = IssueLink
        fields = [
            'id', 'source_ticket', 'target_ticket', 'link_type',
            'source_ticket_key', 'target_ticket_key',
            'source_ticket_name', 'target_ticket_name',
            'created_by', 'created_by_username', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']
    
    def get_source_ticket_key(self, obj):
        return f"{obj.source_ticket.project.key}-{obj.source_ticket.id}"
    
    def get_target_ticket_key(self, obj):
        return f"{obj.target_ticket.project.key}-{obj.target_ticket.id}"


class UserRoleSerializer(serializers.ModelSerializer):
    """Serializer for UserRole model"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_key = serializers.CharField(source='project.key', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = UserRole
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'project', 'project_name', 'project_key',
            'role', 'role_display',
            'assigned_at', 'assigned_by', 'assigned_by_name'
        ]
        read_only_fields = ['assigned_at', 'assigned_by']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
    
    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return f"{obj.assigned_by.first_name} {obj.assigned_by.last_name}".strip() or obj.assigned_by.username
        return None


class UserManagementSerializer(serializers.ModelSerializer):
    """Comprehensive user serializer for user management page"""
    project_roles = UserRoleSerializer(many=True, read_only=True)
    project_memberships = serializers.SerializerMethodField()
    administered_companies = serializers.SerializerMethodField()
    member_companies = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    ticket_count = serializers.SerializerMethodField()
    last_login_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'is_active', 'is_staff', 'is_superuser',
            'date_joined', 'last_login', 'last_login_display',
            'project_roles', 'project_memberships', 'administered_companies', 'member_companies',
            'ticket_count'
        ]
        read_only_fields = ['date_joined', 'last_login']
    
    def to_representation(self, instance):
        """Conditionally exclude sensitive fields based on requester permissions"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # Only superusers can see is_superuser and is_staff fields
        if request and not request.user.is_superuser:
            data.pop('is_superuser', None)
            data.pop('is_staff', None)
        
        return data
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username
    
    def get_project_memberships(self, obj):
        """Return list of project IDs where user is a member"""
        return list(obj.project_memberships.values_list('id', flat=True))
    
    def get_administered_companies(self, obj):
        return [{'id': c.id, 'name': c.name} for c in obj.administered_companies.all()]
    
    def get_member_companies(self, obj):
        return [{'id': c.id, 'name': c.name} for c in obj.member_companies.all()]
    
    def get_ticket_count(self, obj):
        return obj.reported_tickets.count()
    
    def get_last_login_display(self, obj):
        if obj.last_login:
            from django.utils import timezone
            diff = timezone.now() - obj.last_login
            if diff.days > 30:
                return f"{diff.days // 30} months ago"
            elif diff.days > 0:
                return f"{diff.days} days ago"
            elif diff.seconds > 3600:
                return f"{diff.seconds // 3600} hours ago"
            else:
                return "Recently"
        return "Never"


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating users"""
    password = serializers.CharField(write_only=True, required=False)
    # Optional fields for auto-assigning to a project during creation
    project_id = serializers.IntegerField(write_only=True, required=False)
    role = serializers.ChoiceField(
        choices=['superadmin', 'admin', 'manager', 'user'],
        write_only=True,
        required=False,
        default='user'
    )
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'password', 'is_active', 'is_staff', 'is_superuser',
            'project_id', 'role'
        ]
    
    def validate(self, attrs):
        """Prevent non-superusers from creating superusers or staff members"""
        request = self.context.get('request')
        if request and not request.user.is_superuser:
            # Non-superusers cannot set is_superuser or is_staff to True
            if attrs.get('is_superuser', False):
                raise serializers.ValidationError({
                    'is_superuser': 'You do not have permission to create superusers.'
                })
            if attrs.get('is_staff', False):
                raise serializers.ValidationError({
                    'is_staff': 'You do not have permission to create staff members.'
                })
        return attrs
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        project_id = validated_data.pop('project_id', None)
        role = validated_data.pop('role', 'user')
        
        # Ensure non-superusers cannot create superusers/staff
        request = self.context.get('request')
        if request and not request.user.is_superuser:
            validated_data['is_superuser'] = False
            validated_data['is_staff'] = False
        
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        
        # Auto-assign to project if project_id is provided
        if project_id:
            from tickets.models import Project, UserRole
            try:
                project = Project.objects.get(id=project_id)
                # Add user to project members
                project.members.add(user)
                # Create UserRole
                UserRole.objects.get_or_create(
                    user=user,
                    project=project,
                    defaults={
                        'role': role,
                        'assigned_by': request.user if request else None
                    }
                )
            except Project.DoesNotExist:
                pass  # Silently ignore if project doesn't exist
        
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        # Prevent non-superusers from elevating privileges
        request = self.context.get('request')
        if request and not request.user.is_superuser:
            validated_data.pop('is_superuser', None)
            validated_data.pop('is_staff', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class TicketSubtaskSerializer(serializers.ModelSerializer):
    """Serializer for TicketSubtask model"""
    assignee = UserSimpleSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assignee',
        required=False,
        allow_null=True
    )
    created_by = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = TicketSubtask
        fields = [
            'id', 'ticket', 'title', 'assignee', 'assignee_id',
            'is_complete', 'order', 'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def create(self, validated_data):
        # Set created_by from request user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class TicketSimpleSerializer(serializers.ModelSerializer):
    """Simple serializer for tickets used in IssueLink"""
    project_key = serializers.CharField(source='project.key', read_only=True)
    ticket_key = serializers.CharField(read_only=True)
    
    class Meta:
        model = Ticket
        fields = ['id', 'name', 'type', 'status', 'project', 'project_key', 'ticket_key']


class IssueLinkSerializer(serializers.ModelSerializer):
    """Serializer for IssueLink model"""
    source_ticket = TicketSimpleSerializer(read_only=True)
    source_ticket_id = serializers.PrimaryKeyRelatedField(
        queryset=Ticket.objects.all(),
        source='source_ticket',
        required=True
    )
    target_ticket = TicketSimpleSerializer(read_only=True)
    target_ticket_id = serializers.PrimaryKeyRelatedField(
        queryset=Ticket.objects.all(),
        source='target_ticket',
        required=True
    )
    created_by = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = IssueLink
        fields = [
            'id', 'source_ticket', 'source_ticket_id',
            'target_ticket', 'target_ticket_id', 'link_type',
            'created_by', 'created_at'
        ]
        read_only_fields = ['created_at', 'created_by']
    
    def create(self, validated_data):
        # Set created_by from request user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model"""
    user = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'notification_type', 'title', 'message',
            'link', 'is_read', 'data', 'created_at'
        ]
        read_only_fields = ['user', 'created_at']
    
    def to_representation(self, instance):
        """Add formatted timestamp for frontend"""
        data = super().to_representation(instance)
        # Frontend expects 'type' not 'notification_type'
        data['type'] = data.pop('notification_type')
        return data


class ProjectInvitationSerializer(serializers.ModelSerializer):
    """Serializer for project invitations"""
    invited_by_username = serializers.CharField(source='invited_by.username', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_key = serializers.CharField(source='project.key', read_only=True)
    is_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectInvitation
        fields = [
            'id', 'project', 'project_name', 'project_key', 'email', 
            'token', 'role', 'invited_by', 'invited_by_username',
            'status', 'expires_at', 'accepted_at', 'accepted_by',
            'created_at', 'is_valid'
        ]
        read_only_fields = [
            'token', 'invited_by', 'status', 'accepted_at', 
            'accepted_by', 'created_at'
        ]
    
    def get_is_valid(self, obj):
        """Check if invitation is still valid"""
        return obj.is_valid()


class InviteUserSerializer(serializers.Serializer):
    """Serializer for creating new invitations"""
    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(
        choices=UserRole.ROLE_CHOICES,
        default='user',
        required=False
    )
    
    def validate_email(self, value):
        """Normalize email to lowercase"""
        return value.lower().strip()


class AcceptInvitationSerializer(serializers.Serializer):
    """Serializer for accepting invitations"""
    token = serializers.CharField(required=True, max_length=64)


class TicketHistorySerializer(serializers.ModelSerializer):
    user = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = TicketHistory
        fields = ['id', 'ticket', 'user', 'field', 'old_value', 'new_value', 'created_at']


class UserReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for admin reviews of users.
    
    These reviews are hidden from the user being reviewed.
    Only superadmins and managers can view them.
    """
    reviewer = UserSimpleSerializer(read_only=True)
    user_detail = UserSimpleSerializer(source='user', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_key = serializers.CharField(source='project.key', read_only=True)
    ticket_key = serializers.SerializerMethodField()
    
    class Meta:
        model = UserReview
        fields = [
            'id', 'user', 'user_detail', 'reviewer', 'project', 'project_name', 
            'project_key', 'ticket', 'ticket_key', 'rating', 'feedback', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['reviewer', 'created_at', 'updated_at']
    
    def get_ticket_key(self, obj):
        """Get ticket key if ticket is linked"""
        if obj.ticket:
            return obj.ticket.ticket_key
        return None
    
    def validate_rating(self, value):
        """Ensure rating is between 1 and 5"""
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
    
    def validate(self, data):
        """Validate reviewer can't review themselves"""
        request = self.context.get('request')
        if request and request.user:
            user = data.get('user')
            if user and user.id == request.user.id:
                raise serializers.ValidationError(
                    {"user": "You cannot review yourself"}
                )
        return data


class UserReviewCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating user reviews"""
    
    class Meta:
        model = UserReview
        fields = ['user', 'project', 'ticket', 'rating', 'feedback']
    
    def validate_rating(self, value):
        """Ensure rating is between 1 and 5"""
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
    
    def validate(self, data):
        """Validate reviewer can't review themselves"""
        request = self.context.get('request')
        if request and request.user:
            user = data.get('user')
            if user and user.id == request.user.id:
                raise serializers.ValidationError(
                    {"user": "You cannot review yourself"}
                )
        return data
    
    def create(self, validated_data):
        """Set reviewer to current user"""
        request = self.context.get('request')
        validated_data['reviewer'] = request.user
        return super().create(validated_data)

