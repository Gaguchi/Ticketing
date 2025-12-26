import json
from functools import partial
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import ChatRoom, ChatMessage, ChatParticipant, MessageReaction
from .serializers import ChatMessageSerializer, MessageReactionSerializer

# Use ensure_ascii=False to properly handle Georgian and other Unicode characters
json_dumps = partial(json.dumps, ensure_ascii=False)


class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time chat."""
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope['user']
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        
        # Check if user is authenticated
        if not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        # Check if user is participant
        is_participant = await self.check_participant()
        if not is_participant:
            await self.close(code=4003)
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send user joined notification
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': self.user.id,
                'username': self.user.username
            }
        )
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Send user left notification
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_left',
                'user_id': self.user.id,
                'username': self.user.username
            }
        )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        data = json.loads(text_data)
        event_type = data.get('type')
        
        if event_type == 'message_send':
            await self.handle_message_send(data)
        elif event_type == 'message_edit':
            await self.handle_message_edit(data)
        elif event_type == 'message_delete':
            await self.handle_message_delete(data)
        elif event_type == 'reaction_add':
            await self.handle_reaction_add(data)
        elif event_type == 'reaction_remove':
            await self.handle_reaction_remove(data)
        elif event_type == 'typing':
            await self.handle_typing(data)
    
    async def handle_message_send(self, data):
        """Handle sending a new message."""
        content = data.get('content', '')
        message_type = data.get('message_type', 'text')
        
        # Save message to database and get room info for broadcasting
        message, room_data = await self.create_message(content, message_type)
        
        # Broadcast to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_new',
                'message': message
            }
        )
        
        # Broadcast room update to project group (for room list updates)
        if room_data:
            await self.channel_layer.group_send(
                f"chat_project_{room_data['project_id']}",
                {
                    'type': 'room_updated',
                    'room': room_data,
                    'message': message
                }
            )
    
    async def handle_message_edit(self, data):
        """Handle editing a message."""
        message_id = data.get('message_id')
        new_content = data.get('content')
        
        # Update message in database
        message = await self.edit_message(message_id, new_content)
        
        if message:
            # Broadcast to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_edited',
                    'message': message
                }
            )
    
    async def handle_message_delete(self, data):
        """Handle deleting a message."""
        message_id = data.get('message_id')
        
        # Delete message from database
        success = await self.delete_message(message_id)
        
        if success:
            # Broadcast to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_deleted',
                    'message_id': message_id
                }
            )
    
    async def handle_reaction_add(self, data):
        """Handle adding a reaction."""
        message_id = data.get('message_id')
        emoji = data.get('emoji')
        
        # Add reaction to database
        reaction = await self.add_reaction(message_id, emoji)
        
        if reaction:
            # Broadcast to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'reaction_added',
                    'reaction': reaction
                }
            )
    
    async def handle_reaction_remove(self, data):
        """Handle removing a reaction."""
        message_id = data.get('message_id')
        emoji = data.get('emoji')
        
        # Remove reaction from database
        success = await self.remove_reaction(message_id, emoji)
        
        if success:
            # Broadcast to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'reaction_removed',
                    'message_id': message_id,
                    'user_id': self.user.id,
                    'emoji': emoji
                }
            )
    
    async def handle_typing(self, data):
        """Handle typing indicator."""
        is_typing = data.get('is_typing', False)
        
        # Broadcast to room group (except sender)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_typing',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_typing': is_typing
            }
        )
    
    # Event handlers (receive from channel layer)
    
    async def message_new(self, event):
        """Send new message to WebSocket."""
        await self.send(text_data=json_dumps({
            'type': 'message_new',
            'message': event['message']
        }))
    
    async def message_edited(self, event):
        """Send edited message to WebSocket."""
        await self.send(text_data=json_dumps({
            'type': 'message_edited',
            'message': event['message']
        }))
    
    async def message_deleted(self, event):
        """Send message deletion to WebSocket."""
        await self.send(text_data=json_dumps({
            'type': 'message_deleted',
            'message_id': event['message_id']
        }))
    
    async def reaction_added(self, event):
        """Send reaction addition to WebSocket."""
        await self.send(text_data=json_dumps({
            'type': 'reaction_added',
            'reaction': event['reaction']
        }))
    
    async def reaction_removed(self, event):
        """Send reaction removal to WebSocket."""
        await self.send(text_data=json_dumps({
            'type': 'reaction_removed',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'emoji': event['emoji']
        }))
    
    async def user_typing(self, event):
        """Send typing indicator to WebSocket."""
        # Don't send typing event back to the sender
        if event['user_id'] != self.user.id:
            await self.send(text_data=json_dumps({
                'type': 'user_typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))
    
    async def user_joined(self, event):
        """Send user joined notification to WebSocket."""
        await self.send(text_data=json_dumps({
            'type': 'user_joined',
            'user_id': event['user_id'],
            'username': event['username']
        }))
    
    async def user_left(self, event):
        """Send user left notification to WebSocket."""
        await self.send(text_data=json_dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'username': event['username']
        }))
    
    # Database operations
    
    @database_sync_to_async
    def check_participant(self):
        """Check if user is a participant in the room."""
        return ChatParticipant.objects.filter(
            room_id=self.room_id,
            user=self.user
        ).exists()
    
    @database_sync_to_async
    def create_message(self, content, message_type):
        """Create a new message in the database and return message + room data."""
        message = ChatMessage.objects.create(
            room_id=self.room_id,
            user=self.user,
            content=content,
            type=message_type
        )
        message_data = ChatMessageSerializer(message).data
        
        # Get room data for project broadcast
        room = message.room
        room_data = {
            'id': room.id,
            'project_id': room.project_id,
            'type': room.type,
            'name': room.name,
            'last_message': message_data,
            'updated_at': room.updated_at.isoformat() if room.updated_at else None,
        }
        
        return message_data, room_data
    
    @database_sync_to_async
    def edit_message(self, message_id, new_content):
        """Edit a message in the database."""
        try:
            from django.utils import timezone
            message = ChatMessage.objects.get(id=message_id, user=self.user)
            message.content = new_content
            message.is_edited = True
            message.edited_at = timezone.now()
            message.save()
            return ChatMessageSerializer(message).data
        except ChatMessage.DoesNotExist:
            return None
    
    @database_sync_to_async
    def delete_message(self, message_id):
        """Delete a message from the database."""
        try:
            message = ChatMessage.objects.get(id=message_id, user=self.user)
            message.delete()
            return True
        except ChatMessage.DoesNotExist:
            return False
    
    @database_sync_to_async
    def add_reaction(self, message_id, emoji):
        """Add a reaction to a message."""
        try:
            reaction, created = MessageReaction.objects.get_or_create(
                message_id=message_id,
                user=self.user,
                emoji=emoji
            )
            return MessageReactionSerializer(reaction).data
        except Exception:
            return None
    
    @database_sync_to_async
    def remove_reaction(self, message_id, emoji):
        """Remove a reaction from a message."""
        try:
            reaction = MessageReaction.objects.get(
                message_id=message_id,
                user=self.user,
                emoji=emoji
            )
            reaction.delete()
            return True
        except MessageReaction.DoesNotExist:
            return False


class ChatProjectConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for project-level chat updates.
    Clients subscribe to this to receive real-time updates when any room
    in the project has new messages (for updating unread counts, last_message, etc.)
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope['user']
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        self.project_group_name = f'chat_project_{self.project_id}'
        
        # Check if user is authenticated
        if not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        # Check if user has access to project
        has_access = await self.check_project_access()
        if not has_access:
            await self.close(code=4003)
            return
        
        # Join project chat group
        await self.channel_layer.group_add(
            self.project_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        await self.channel_layer.group_discard(
            self.project_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle incoming messages (ping/pong for keepalive)."""
        data = json.loads(text_data)
        if data.get('type') == 'ping':
            await self.send(text_data=json_dumps({
                'type': 'pong',
                'timestamp': data.get('timestamp')
            }))
    
    # Event handlers (receive from channel layer)
    
    async def room_updated(self, event):
        """Send room update to WebSocket client."""
        await self.send(text_data=json_dumps({
            'type': 'room_updated',
            'room': event['room'],
            'message': event.get('message')
        }))
    
    @database_sync_to_async
    def check_project_access(self):
        """Check if user has access to the project."""
        from tickets.models import Project
        return Project.objects.filter(
            id=self.project_id,
            members__user=self.user
        ).exists()

