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
        queryset = queryset.annotate(
            unread_count_annotated=Count(
                'messages',
                filter=Q(messages__created_at__gt=F('user_last_read')) | Q(user_last_read__isnull=True)
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


class ChatMessageViewSet(viewsets.ModelViewSet):
    """ViewSet for chat messages."""
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
        
        return queryset.distinct().order_by('created_at')
    
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
