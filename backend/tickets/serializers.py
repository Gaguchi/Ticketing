from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Ticket, Project, Column, Comment, Attachment,
    Tag, Contact, TagContact, UserTag, TicketTag, IssueLink, Company, UserRole
)


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
    ticket_count = serializers.IntegerField(read_only=True)
    admin_count = serializers.IntegerField(read_only=True)
    user_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'description', 'logo', 
            'primary_contact_email', 'phone',
            'admins', 'admin_ids', 'admin_count',
            'users', 'user_ids', 'user_count',
            'ticket_count', 'project_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def create(self, validated_data):
        admin_ids = validated_data.pop('admin_ids', [])
        user_ids = validated_data.pop('user_ids', [])
        
        company = Company.objects.create(**validated_data)
        
        if admin_ids:
            company.admins.set(admin_ids)
        if user_ids:
            company.users.set(user_ids)
        
        return company
    
    def update(self, instance, validated_data):
        admin_ids = validated_data.pop('admin_ids', None)
        user_ids = validated_data.pop('user_ids', None)
        
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
        
        return instance


class CompanyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing companies"""
    ticket_count = serializers.IntegerField(read_only=True)
    admin_count = serializers.IntegerField(read_only=True)
    user_count = serializers.IntegerField(read_only=True)
    project_count = serializers.IntegerField(read_only=True)
    admin_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'description', 'logo',
            'primary_contact_email', 'phone',
            'ticket_count', 'admin_count', 'user_count', 'project_count',
            'admin_names', 'created_at'
        ]
    
    def get_admin_names(self, obj):
        return [f"{admin.first_name} {admin.last_name}".strip() or admin.username 
                for admin in obj.admins.all()[:3]]  # Show first 3 admins


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model"""
    tickets_count = serializers.SerializerMethodField()
    columns_count = serializers.SerializerMethodField()
    members = UserSerializer(many=True, read_only=True)
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
        return obj.tickets.count()
    
    def get_columns_count(self, obj):
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


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'ticket', 'user', 'content', 'created_at', 'updated_at']
        read_only_fields = ['user']


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Attachment
        fields = ['id', 'ticket', 'file', 'filename', 'uploaded_by', 'uploaded_at']
        read_only_fields = ['uploaded_by']


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
    column_name = serializers.CharField(source='column.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    subtasks = serializers.SerializerMethodField()
    tags_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'name', 'description', 'type', 'status',
            'priority_id', 'urgency', 'importance',
            'company', 'company_name',
            'project', 'project_key', 'column', 'column_name',
            'assignees', 'assignee_ids', 'reporter',
            'parent', 'subtasks', 'following', 'tags', 'tags_detail',
            'due_date', 'start_date', 'comments_count',
            'created_at', 'updated_at'
        ]
    
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
    column_name = serializers.CharField(source='column.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    tag_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'name', 'type', 'status', 'priority_id',
            'urgency', 'importance',
            'company', 'company_name',
            'project', 'project_key', 'column', 'column_name',
            'assignee_ids', 'following', 'comments_count', 'tag_names',
            'due_date', 'start_date',
            'created_at', 'updated_at'
        ]
    
    def get_assignee_ids(self, obj):
        return list(obj.assignees.values_list('id', flat=True))
    
    def get_tag_names(self, obj):
        """Get list of tag names for quick display"""
        return list(obj.tags.values_list('name', flat=True))


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
    project_roles = UserRoleSerializer(many=True, read_only=True, source='project_roles')
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
            'project_roles', 'administered_companies', 'member_companies',
            'ticket_count'
        ]
        read_only_fields = ['date_joined', 'last_login']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username
    
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
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'password', 'is_active', 'is_staff', 'is_superuser'
        ]
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
