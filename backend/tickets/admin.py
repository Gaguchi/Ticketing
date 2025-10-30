from django.contrib import admin
from .models import (
    Ticket, Column, Project, Comment, Attachment,
    Tag, Contact, TagContact, UserTag, TicketTag, Company, UserRole
)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'admin_count', 'user_count', 'ticket_count', 'created_at']
    search_fields = ['name', 'description']
    list_filter = ['created_at']
    filter_horizontal = ['admins', 'users']
    readonly_fields = ['created_at', 'updated_at', 'ticket_count', 'admin_count', 'user_count']
    
    fieldsets = (
        ('Company Information', {
            'fields': ('name', 'description')
        }),
        ('IT Staff (Admins)', {
            'fields': ('admins',),
            'description': 'IT staff who manage tickets for this company'
        }),
        ('Company Users', {
            'fields': ('users',),
            'description': 'Client company employees who can access their tickets'
        }),
        ('Statistics', {
            'fields': ('ticket_count', 'admin_count', 'user_count'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def admin_count(self, obj):
        return obj.admin_count
    admin_count.short_description = 'IT Admins'
    
    def user_count(self, obj):
        return obj.user_count
    user_count.short_description = 'Users'


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['key', 'name', 'lead_username', 'created_at']
    search_fields = ['key', 'name', 'description', 'lead_username']
    list_filter = ['created_at', 'companies']
    filter_horizontal = ['members', 'companies']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Project Information', {
            'fields': ('key', 'name', 'description', 'lead_username')
        }),
        ('Members', {
            'fields': ('members',),
            'description': 'Users who are members of this project'
        }),
        ('Companies', {
            'fields': ('companies',),
            'description': 'Client companies associated with this project'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Column)
class ColumnAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'order', 'color', 'created_at']
    list_editable = ['order']
    ordering = ['project', 'order']
    search_fields = ['name']
    list_filter = ['project']
    autocomplete_fields = ['project']


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'type', 'status', 'priority_id', 'company', 'column', 'project', 'created_at']
    list_filter = ['type', 'status', 'priority_id', 'urgency', 'importance', 'company', 'project', 'created_at']
    search_fields = ['name', 'description']
    filter_horizontal = ['assignees']
    autocomplete_fields = ['company', 'project', 'reporter', 'parent']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'type', 'status')
        }),
        ('Company & Project', {
            'fields': ('company', 'project', 'column')
        }),
        ('Priority & Urgency', {
            'fields': ('priority_id', 'urgency', 'importance')
        }),
        ('Relationships', {
            'fields': ('assignees', 'reporter', 'parent')
        }),
        ('Additional Details', {
            'fields': ('following', 'due_date', 'start_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['id', 'ticket', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'ticket__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'filename', 'ticket', 'uploaded_by', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['filename', 'ticket__name']
    readonly_fields = ['uploaded_at']


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'project', 'color', 'created_by', 'created_at']
    list_filter = ['project', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_by', 'created_at', 'updated_at']
    autocomplete_fields = ['project', 'created_by']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'color')
        }),
        ('Project & Creator', {
            'fields': ('project', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'email', 'phone', 'title', 'department', 'created_at']
    list_filter = ['department', 'created_at']
    search_fields = ['name', 'email', 'title', 'department', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'email', 'phone')
        }),
        ('Professional Details', {
            'fields': ('title', 'department', 'description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class TagContactInline(admin.TabularInline):
    model = TagContact
    extra = 1
    autocomplete_fields = ['contact', 'added_by']


@admin.register(TagContact)
class TagContactAdmin(admin.ModelAdmin):
    list_display = ['id', 'tag', 'contact', 'role', 'added_by', 'added_at']
    list_filter = ['added_at']
    search_fields = ['tag__name', 'contact__name', 'role']
    autocomplete_fields = ['tag', 'contact', 'added_by']
    readonly_fields = ['added_at']


@admin.register(UserTag)
class UserTagAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'tag', 'added_by', 'added_at']
    list_filter = ['tag', 'added_at']
    search_fields = ['user__username', 'tag__name']
    autocomplete_fields = ['user', 'tag', 'added_by']
    readonly_fields = ['added_at']


@admin.register(TicketTag)
class TicketTagAdmin(admin.ModelAdmin):
    list_display = ['id', 'ticket', 'tag', 'added_by', 'added_at']
    list_filter = ['tag', 'added_at']
    search_fields = ['ticket__name', 'tag__name']
    autocomplete_fields = ['ticket', 'tag', 'added_by']
    readonly_fields = ['added_at']


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ['user', 'project', 'role', 'assigned_at', 'assigned_by']
    list_filter = ['role', 'project', 'assigned_at']
    search_fields = ['user__username', 'user__email', 'user__first_name', 'user__last_name', 'project__name', 'project__key']
    autocomplete_fields = ['user', 'project', 'assigned_by']
    readonly_fields = ['assigned_at']
    ordering = ['-assigned_at']
    
    fieldsets = (
        ('Role Assignment', {
            'fields': ('user', 'project', 'role')
        }),
        ('Assignment Details', {
            'fields': ('assigned_by', 'assigned_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'project', 'assigned_by')

