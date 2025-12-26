from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, OuterRef, Subquery, Count, F, DateTimeField
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from .models import ChatRoom, ChatMessage, ChatParticipant, MessageReaction
from .serializers import (
    ChatRoomSerializer, ChatRoomCreateSerializer,
    ChatMessageSerializer, MessageReactionSerializer,
    ChatParticipantSerializer
)


class ChatRoomViewSet(viewsets.ModelViewSet):
    """ViewSet for chat rooms."""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    
    def get_queryset(self):
        """Get rooms for current user and project."""
        user = self.request.user
        queryset = ChatRoom.objects.filter(participants__user=user)
        
        # Filter by project if specified
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Filter by room type if specified (e.g., 'ticket', 'direct', 'group')
        room_type = self.request.query_params.get('type')
        if room_type:
            queryset = queryset.filter(type=room_type)
        
        # Optimize queries with select_related for ticket info
        queryset = queryset.select_related('ticket')
            
        # Optimize unread count calculation
        # 1. Get the user's last_read_at for each room
        last_read_subquery = ChatParticipant.objects.filter(
            room=OuterRef('pk'),
            user=user
        ).values('last_read_at')[:1]
        
        queryset = queryset.annotate(
            user_last_read=Subquery(last_read_subquery)
        )
        
        # 2. Count messages created after user_last_read
        # If user_last_read is null, count all messages
        # EXCLUDE messages sent by the current user
        queryset = queryset.annotate(
            unread_count_annotated=Count(
                'messages',
                filter=(
                    (Q(messages__created_at__gt=F('user_last_read')) | Q(user_last_read__isnull=True)) & 
                    ~Q(messages__user=user)
                )
            )
        )
        
        return queryset.distinct().order_by('-updated_at')
    
    def get_serializer_class(self):
        """Use different serializer for creation."""
        if self.action == 'create':
            return ChatRoomCreateSerializer
        return ChatRoomSerializer
    
    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_participant(self, request, pk=None):
        """Add a participant to the room."""
        room = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from django.contrib.auth.models import User
            user = User.objects.get(id=user_id)
            participant, created = ChatParticipant.objects.get_or_create(room=room, user=user)
            
            return Response(
                ChatParticipantSerializer(participant).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def remove_participant(self, request, pk=None):
        """Remove a participant from the room."""
        room = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        participant = ChatParticipant.objects.filter(room=room, user_id=user_id).first()
        if participant:
            participant.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        return Response({'error': 'Participant not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark all messages as read for current user."""
        room = self.get_object()
        participant = ChatParticipant.objects.filter(room=room, user=request.user).first()
        
        if participant:
            from django.utils import timezone
            participant.last_read_at = timezone.now()
            participant.save()
            return Response({'status': 'marked as read'})
        
        return Response({'error': 'Not a participant'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def create_for_ticket(self, request):
        """
        Create a chat room for a specific ticket.
        
        Only ticket assignees or company admins can create chat rooms.
        If a chat room already exists for the ticket, returns it instead.
        
        Request body:
        {
            "ticket_id": 123
        }
        
        Returns: ChatRoom data
        """
        from tickets.models import Ticket
        
        ticket_id = request.data.get('ticket_id')
        if not ticket_id:
            return Response(
                {'error': 'ticket_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ticket = Ticket.objects.select_related('company', 'project', 'reporter').get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Response(
                {'error': 'Ticket not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        user = request.user
        
        # Check if user can create chat for this ticket
        # Allowed: ticket assignees, company admins, project admins, superusers
        is_assignee = ticket.assignees.filter(id=user.id).exists()
        is_company_admin = ticket.company and ticket.company.admins.filter(id=user.id).exists()
        is_project_admin = ticket.project.members.filter(id=user.id).exists()
        
        if not (is_assignee or is_company_admin or is_project_admin or user.is_superuser):
            return Response(
                {'error': 'You must be assigned to this ticket or be an admin to create a chat'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create or get existing chat room
        chat_room, created = ChatRoom.get_or_create_for_ticket(ticket, created_by=user)
        
        # Also add the requesting user as participant if not already
        ChatParticipant.objects.get_or_create(room=chat_room, user=user)
        
        serializer = ChatRoomSerializer(chat_room, context={'request': request})
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def for_ticket(self, request):
        """
        Get the chat room for a specific ticket.
        
        Query params:
        - ticket_id: ID of the ticket
        
        Returns: ChatRoom data or 404 if no chat exists
        """
        ticket_id = request.query_params.get('ticket_id')
        if not ticket_id:
            return Response(
                {'error': 'ticket_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            room = ChatRoom.objects.get(ticket_id=ticket_id)
            
            # Check user is a participant
            if not room.participants.filter(user=request.user).exists():
                # If user is assigned to ticket or is admin, add them as participant
                from tickets.models import Ticket
                try:
                    ticket = Ticket.objects.get(id=ticket_id)
                    is_assignee = ticket.assignees.filter(id=request.user.id).exists()
                    is_company_admin = ticket.company and ticket.company.admins.filter(id=request.user.id).exists()
                    
                    if is_assignee or is_company_admin or request.user.is_superuser:
                        ChatParticipant.objects.get_or_create(room=room, user=request.user)
                    else:
                        return Response(
                            {'error': 'You do not have access to this chat'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Ticket.DoesNotExist:
                    return Response(
                        {'error': 'Ticket not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            serializer = ChatRoomSerializer(room, context={'request': request})
            return Response(serializer.data)
            
        except ChatRoom.DoesNotExist:
            return Response(
                {'error': 'No chat room exists for this ticket', 'exists': False},
                status=status.HTTP_404_NOT_FOUND
            )


class ChatMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for chat messages with cursor-based pagination.
    
    Industry-standard infinite scroll implementation:
    - Initial load: Latest N messages
    - Scroll up: Load older messages using 'before' cursor
    - Real-time: New messages via WebSocket
    
    Query Parameters:
        room (required): Room ID to fetch messages from
        limit (optional): Number of messages to fetch (default: 50, max: 100)
        before (optional): Message ID cursor - fetch messages older than this
        after (optional): Message ID cursor - fetch messages newer than this (for sync)
    
    Response Format:
        {
            "messages": [...],
            "has_more": true/false,
            "cursor": <oldest_message_id or null>
        }
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ChatMessageSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['content']
    
    def get_queryset(self):
        """Get messages for rooms the user is in."""
        user = self.request.user
        queryset = ChatMessage.objects.filter(room__participants__user=user)
        
        # Filter by room if specified
        room_id = self.request.query_params.get('room')
        if room_id:
            queryset = queryset.filter(room_id=room_id)
        
        return queryset.select_related('user').prefetch_related('reactions', 'reactions__user').distinct()
    
    def list(self, request, *args, **kwargs):
        """
        List messages with cursor-based pagination.
        
        This implements the industry-standard pattern for chat:
        1. Initial load: Get latest N messages (no cursor)
        2. Load older: Use 'before' cursor from previous response
        3. Sync newer: Use 'after' cursor (for reconnection sync)
        """
        room_id = request.query_params.get('room')
        if not room_id:
            return Response(
                {'error': 'room parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate user is participant
        if not ChatRoom.objects.filter(id=room_id, participants__user=request.user).exists():
            return Response(
                {'error': 'Not a participant of this room'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Parse pagination params
        try:
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except ValueError:
            limit = 50
        
        before_cursor = request.query_params.get('before')
        after_cursor = request.query_params.get('after')
        
        # Build queryset
        queryset = ChatMessage.objects.filter(
            room_id=room_id
        ).select_related('user').prefetch_related('reactions', 'reactions__user')
        
        if before_cursor:
            # Loading older messages (user scrolling up)
            try:
                before_id = int(before_cursor)
                queryset = queryset.filter(id__lt=before_id)
            except ValueError:
                pass
            # Order by newest first, then reverse for chronological
            queryset = queryset.order_by('-id')[:limit + 1]
            
        elif after_cursor:
            # Loading newer messages (reconnection sync)
            try:
                after_id = int(after_cursor)
                queryset = queryset.filter(id__gt=after_id)
            except ValueError:
                pass
            queryset = queryset.order_by('id')[:limit + 1]
            
        else:
            # Initial load - get latest messages
            queryset = queryset.order_by('-id')[:limit + 1]
        
        # Execute query
        messages = list(queryset)
        
        # Check if there are more messages
        has_more = len(messages) > limit
        if has_more:
            messages = messages[:limit]
        
        # Reverse to chronological order (oldest first) for display
        # (except for 'after' cursor which is already chronological)
        if not after_cursor:
            messages.reverse()
        
        # Serialize
        serializer = self.get_serializer(messages, many=True)
        
        # Get cursor for next page (oldest message ID in current batch)
        cursor = messages[0].id if messages else None
        
        return Response({
            'messages': serializer.data,
            'has_more': has_more,
            'cursor': cursor,
        })
    
    def perform_create(self, serializer):
        """Set user to current user and broadcast via WebSocket."""
        message = serializer.save(user=self.request.user)
        
        # Broadcast to WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        room_group_name = f'chat_{message.room_id}'
        
        # Serialize the message for WebSocket
        message_data = ChatMessageSerializer(message, context={'request': self.request}).data
        
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'message_new',
                'message': message_data
            }
        )
    
    def perform_update(self, serializer):
        """Mark message as edited and broadcast via WebSocket."""
        from django.utils import timezone
        message = serializer.save(is_edited=True, edited_at=timezone.now())
        
        # Broadcast to WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        room_group_name = f'chat_{message.room_id}'
        
        # Serialize the message for WebSocket
        message_data = ChatMessageSerializer(message, context={'request': self.request}).data
        
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'message_edited',
                'message': message_data
            }
        )
    
    def perform_destroy(self, instance):
        """Delete message and broadcast via WebSocket."""
        message_id = instance.id
        room_id = instance.room_id
        
        # Delete the message
        instance.delete()
        
        # Broadcast to WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        room_group_name = f'chat_{room_id}'
        
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'message_deleted',
                'message_id': message_id
            }
        )
    
    @action(detail=True, methods=['post'])
    def add_reaction(self, request, pk=None):
        """Add emoji reaction to message."""
        message = self.get_object()
        emoji = request.data.get('emoji')
        
        if not emoji:
            return Response({'error': 'emoji required'}, status=status.HTTP_400_BAD_REQUEST)
        
        reaction, created = MessageReaction.objects.get_or_create(
            message=message,
            user=request.user,
            emoji=emoji
        )
        
        # Broadcast to WebSocket
        if created:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            room_group_name = f'chat_{message.room_id}'
            
            async_to_sync(channel_layer.group_send)(
                room_group_name,
                {
                    'type': 'reaction_added',
                    'reaction': MessageReactionSerializer(reaction).data
                }
            )
        
        return Response(
            MessageReactionSerializer(reaction).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def remove_reaction(self, request, pk=None):
        """Remove emoji reaction from message."""
        message = self.get_object()
        emoji = request.data.get('emoji')
        
        if not emoji:
            return Response({'error': 'emoji required'}, status=status.HTTP_400_BAD_REQUEST)
        
        reaction = MessageReaction.objects.filter(
            message=message,
            user=request.user,
            emoji=emoji
        ).first()
        
        if reaction:
            # Broadcast to WebSocket before deleting
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            room_group_name = f'chat_{message.room_id}'
            
            async_to_sync(channel_layer.group_send)(
                room_group_name,
                {
                    'type': 'reaction_removed',
                    'message_id': message.id,
                    'user_id': request.user.id,
                    'emoji': emoji
                }
            )
            
            reaction.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        return Response({'error': 'Reaction not found'}, status=status.HTTP_404_NOT_FOUND)
