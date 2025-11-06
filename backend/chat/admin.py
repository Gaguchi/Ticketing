from django.contrib import admin
from .models import ChatRoom, ChatParticipant, ChatMessage, MessageReaction


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'type', 'project', 'created_by', 'created_at']
    list_filter = ['type', 'project', 'created_at']
    search_fields = ['name', 'created_by__username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ChatParticipant)
class ChatParticipantAdmin(admin.ModelAdmin):
    list_display = ['id', 'room', 'user', 'joined_at', 'last_read_at']
    list_filter = ['joined_at']
    search_fields = ['room__name', 'user__username']
    readonly_fields = ['joined_at']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'room', 'user', 'type', 'content_preview', 'is_edited', 'created_at']
    list_filter = ['type', 'is_edited', 'created_at']
    search_fields = ['content', 'user__username', 'room__name']
    readonly_fields = ['created_at', 'updated_at']
    
    def content_preview(self, obj):
        return obj.content[:50] if obj.content else '[No content]'
    content_preview.short_description = 'Content'


@admin.register(MessageReaction)
class MessageReactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'message', 'user', 'emoji', 'created_at']
    list_filter = ['emoji', 'created_at']
    search_fields = ['user__username', 'message__content']
    readonly_fields = ['created_at']
