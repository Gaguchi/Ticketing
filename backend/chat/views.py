from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
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
        """Set user to current user."""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """Mark message as edited."""
        from django.utils import timezone
        serializer.save(is_edited=True, edited_at=timezone.now())
    
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
            reaction.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        return Response({'error': 'Reaction not found'}, status=status.HTTP_404_NOT_FOUND)
