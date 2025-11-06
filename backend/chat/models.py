from django.db import models
from django.contrib.auth.models import User
from tickets.models import Project


class ChatRoom(models.Model):
    """
    Chat room for direct messages or group chats within a project.
    All chat rooms are project-scoped.
    """
    ROOM_TYPE_CHOICES = [
        ('direct', 'Direct Message'),
        ('group', 'Group Chat'),
    ]
    
    name = models.CharField(max_length=255, blank=True)  # Group name (empty for DMs)
    type = models.CharField(max_length=10, choices=ROOM_TYPE_CHOICES, default='direct')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='chat_rooms')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_rooms'
        ordering = ['-updated_at']
    
    def __str__(self):
        if self.type == 'direct':
            participants = self.participants.all()
            if participants.count() == 2:
                users = [p.user.username for p in participants]
                return f"DM: {' & '.join(users)}"
        return self.name or f"Room {self.id}"
    
    def get_display_name(self, for_user):
        """Get display name for a specific user."""
        if self.type == 'direct':
            # For DMs, show the other user's name
            other_user = self.participants.exclude(user=for_user).first()
            if other_user:
                full_name = other_user.user.get_full_name()
                return full_name if full_name else other_user.user.username
        return self.name or f"Chat {self.id}"


class ChatParticipant(models.Model):
    """
    Participants in a chat room.
    Tracks who is part of each conversation.
    """
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_participations')
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)  # For future read receipts
    
    class Meta:
        db_table = 'chat_participants'
        unique_together = ['room', 'user']
        ordering = ['joined_at']
    
    def __str__(self):
        return f"{self.user.username} in {self.room}"


class ChatMessage(models.Model):
    """
    Individual chat messages within a room.
    Supports text, images, and file attachments.
    """
    MESSAGE_TYPE_CHOICES = [
        ('text', 'Text'),
        ('image', 'Image'),
        ('file', 'File'),
    ]
    
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    content = models.TextField(blank=True)  # Text content
    type = models.CharField(max_length=10, choices=MESSAGE_TYPE_CHOICES, default='text')
    
    # File attachments
    attachment = models.FileField(upload_to='chat_attachments/%Y/%m/%d/', null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True)  # Original filename
    attachment_size = models.IntegerField(null=True, blank=True)  # File size in bytes
    
    # Editing
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['room', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username}: {self.content[:50]}"


class MessageReaction(models.Model):
    """
    Emoji reactions to chat messages.
    Users can add multiple different emojis to the same message.
    """
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='message_reactions')
    emoji = models.CharField(max_length=10)  # Emoji character (e.g., 👍, ❤️, 😂)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'message_reactions'
        unique_together = ['message', 'user', 'emoji']  # One emoji per user per message
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.user.username} reacted {self.emoji} to message {self.message.id}"
