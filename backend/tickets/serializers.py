from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Ticket, Column, Customer, Comment, Attachment,
    Tag, Contact, TagContact, UserTag, TicketTag
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class ColumnSerializer(serializers.ModelSerializer):
    tickets_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Column
        fields = ['id', 'name', 'order', 'color', 'tickets_count', 'created_at', 'updated_at']
    
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
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    column_name = serializers.CharField(source='column.name', read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    subtasks = serializers.SerializerMethodField()
    tags_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'name', 'description', 'type', 'status',
            'priority_id', 'urgency', 'importance',
            'column', 'column_name', 'customer', 'customer_name',
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
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'name', 'type', 'status', 'priority_id',
            'urgency', 'importance', 'column', 'customer_name',
            'assignee_ids', 'following', 'comments_count',
            'created_at', 'updated_at'
        ]
    
    def get_assignee_ids(self, obj):
        return list(obj.assignees.values_list('id', flat=True))


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
