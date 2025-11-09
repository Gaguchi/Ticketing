"""
WebSocket Consumers
Handles real-time communication for tickets, notifications, and presence
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import Notification


class BaseAuthConsumer(AsyncWebsocketConsumer):
    """
    Base consumer with authentication check
    """
    
    async def connect(self):
        # Check if user is authenticated
        if isinstance(self.scope['user'], AnonymousUser):
            await self.close(code=4001)  # Custom close code for unauthorized
            return
        
        await self.accept()
    
    async def disconnect(self, close_code):
        pass


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Consumer for user-specific notifications
    Receives real-time notifications for:
    - Ticket assignments
    - Mentions in comments
    - Status changes on followed tickets
    - Direct messages
    """
    
    async def connect(self):
        # Check if user is authenticated
        if isinstance(self.scope['user'], AnonymousUser):
            await self.close(code=4001)
            return
        
        self.user = self.scope['user']
        self.user_group_name = f'user_{self.user.id}_notifications'
        
        # Join user-specific notification group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send welcome message
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to notification stream',
            'user_id': self.user.id,
            'username': self.user.username,
        }))
    
    async def disconnect(self, close_code):
        # Leave notification group
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """
        Receive message from WebSocket (client -> server)
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            # Handle different message types
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp'),
                }))
            elif message_type == 'mark_read':
                # Mark notification as read
                notification_id = data.get('notification_id')
                await self.mark_notification_read(notification_id)
            
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON',
            }))
    
    async def notification_message(self, event):
        """
        Receive notification from channel layer (server -> client)
        Called when a notification is sent to this user's group
        """
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event['data'],
        }))
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """
        Mark notification as read in database
        """
        try:
            notification = Notification.objects.get(
                id=notification_id,
                user=self.user
            )
            notification.is_read = True
            notification.save(update_fields=['is_read'])
            return True
        except Notification.DoesNotExist:
            return False


class TicketConsumer(AsyncWebsocketConsumer):
    """
    Consumer for project-specific ticket updates
    Receives real-time updates for:
    - New tickets created
    - Ticket status changes
    - Ticket assignments
    - Comment additions
    - Ticket deletions
    """
    
    async def connect(self):
        # Check if user is authenticated
        if isinstance(self.scope['user'], AnonymousUser):
            await self.close(code=4001)
            return
        
        self.user = self.scope['user']
        self.project_id = self.scope['url_route']['kwargs'].get('project_id')
        
        if not self.project_id:
            await self.close(code=4002)  # No project specified
            return
        
        # Verify user has access to this project
        has_access = await self.user_has_project_access(self.user.id, self.project_id)
        if not has_access:
            await self.close(code=4003)  # No access to project
            return
        
        # Join project-specific group
        self.project_group_name = f'project_{self.project_id}_tickets'
        await self.channel_layer.group_add(
            self.project_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send welcome message
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': f'Connected to project {self.project_id} ticket stream',
            'project_id': self.project_id,
        }))
    
    async def disconnect(self, close_code):
        # Leave project group
        if hasattr(self, 'project_group_name'):
            await self.channel_layer.group_discard(
                self.project_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """
        Handle client messages
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp'),
                }))
        
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON',
            }))
    
    async def ticket_update(self, event):
        """
        Handle ticket update events from channel layer
        """
        # Extract action and data from event
        action = event.get('action', 'updated')
        data = event.get('data', {})
        
        # Send message with type matching the action
        await self.send(text_data=json.dumps({
            'type': f'ticket_{action}',  # ticket_created, ticket_updated, ticket_deleted
            'data': data,
        }))
    
    async def comment_added(self, event):
        """
        Handle new comment events
        """
        await self.send(text_data=json.dumps({
            'type': 'comment_added',
            'data': event['data'],
        }))
    
    @database_sync_to_async
    def user_has_project_access(self, user_id, project_id):
        """
        Check if user has access to project
        """
        from tickets.models import Project
        try:
            project = Project.objects.get(id=project_id)
            return project.members.filter(id=user_id).exists()
        except Project.DoesNotExist:
            return False


class PresenceConsumer(AsyncWebsocketConsumer):
    """
    Consumer for presence/activity tracking
    Tracks:
    - Who is currently online
    - Who is viewing specific tickets
    - Typing indicators
    - Active users per project
    """
    
    async def connect(self):
        # Check if user is authenticated
        if isinstance(self.scope['user'], AnonymousUser):
            await self.close(code=4001)
            return
        
        self.user = self.scope['user']
        self.project_id = self.scope['url_route']['kwargs'].get('project_id')
        
        if not self.project_id:
            await self.close(code=4002)
            return
        
        # Join presence group for project
        self.presence_group_name = f'project_{self.project_id}_presence'
        await self.channel_layer.group_add(
            self.presence_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Broadcast user joined
        await self.channel_layer.group_send(
            self.presence_group_name,
            {
                'type': 'user_status',
                'action': 'joined',
                'user_id': self.user.id,
                'username': self.user.username,
            }
        )
    
    async def disconnect(self, close_code):
        # Broadcast user left
        if hasattr(self, 'presence_group_name'):
            await self.channel_layer.group_send(
                self.presence_group_name,
                {
                    'type': 'user_status',
                    'action': 'left',
                    'user_id': self.user.id,
                    'username': self.user.username,
                }
            )
            
            await self.channel_layer.group_discard(
                self.presence_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """
        Handle presence updates from client
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'viewing_ticket':
                # User is viewing a ticket
                await self.channel_layer.group_send(
                    self.presence_group_name,
                    {
                        'type': 'ticket_viewing',
                        'user_id': self.user.id,
                        'username': self.user.username,
                        'ticket_id': data.get('ticket_id'),
                    }
                )
            
            elif message_type == 'typing':
                # User is typing a comment
                await self.channel_layer.group_send(
                    self.presence_group_name,
                    {
                        'type': 'user_typing',
                        'user_id': self.user.id,
                        'username': self.user.username,
                        'ticket_id': data.get('ticket_id'),
                    }
                )
            
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp'),
                }))
        
        except json.JSONDecodeError:
            pass
    
    async def user_status(self, event):
        """
        Broadcast user online/offline status
        """
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'action': event['action'],
            'user_id': event['user_id'],
            'username': event['username'],
        }))
    
    async def ticket_viewing(self, event):
        """
        Broadcast who is viewing a ticket
        """
        await self.send(text_data=json.dumps({
            'type': 'ticket_viewing',
            'user_id': event['user_id'],
            'username': event['username'],
            'ticket_id': event['ticket_id'],
        }))
    
    async def user_typing(self, event):
        """
        Broadcast typing indicator
        """
        await self.send(text_data=json.dumps({
            'type': 'user_typing',
            'user_id': event['user_id'],
            'username': event['username'],
            'ticket_id': event['ticket_id'],
        }))
