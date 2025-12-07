from rest_framework import serializers
from django.contrib.auth.models import User
from .models import ChatRoom, ChatMessage, ChatParticipant, MessageReaction


class UserSerializer(serializers.ModelSerializer):
    """Simple user serializer for chat participants."""
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'display_name']
        read_only_fields = fields
    
    def get_display_name(self, obj):
        """Get user's display name."""
        full_name = obj.get_full_name()
        return full_name if full_name else obj.username


class ChatParticipantSerializer(serializers.ModelSerializer):
    """Serializer for chat participants."""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = ChatParticipant
        fields = ['id', 'user', 'joined_at', 'last_read_at']
        read_only_fields = ['joined_at']


class MessageReactionSerializer(serializers.ModelSerializer):
    """Serializer for message reactions."""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'message', 'emoji', 'user', 'created_at']
        read_only_fields = ['user', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for chat messages."""
    user = UserSerializer(read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)
    attachment_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'room', 'user', 'content', 'type',
            'attachment', 'attachment_url', 'attachment_name', 'attachment_size',
            'is_edited', 'edited_at', 'reactions',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'is_edited', 'edited_at', 'created_at', 'updated_at']
    
    def get_attachment_url(self, obj):
        """Get full URL for attachment."""
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None


class ChatRoomSerializer(serializers.ModelSerializer):
    """Serializer for chat rooms."""
    participants = ChatParticipantSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = [
            'id', 'name', 'type', 'project', 'created_by',
            'participants', 'last_message', 'unread_count', 'display_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def get_display_name(self, obj):
        """Get room display name for current user."""
        request = self.context.get('request')
        if request and request.user:
            return obj.get_display_name(request.user)
        return obj.name or f"Chat {obj.id}"
    
    def get_last_message(self, obj):
        """Get the last message in the room."""
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return ChatMessageSerializer(last_msg, context=self.context).data
        return None
    
    def get_unread_count(self, obj):
        """Get unread message count for current user."""
        # Use annotated value if available (from ViewSet optimization)
        if hasattr(obj, 'unread_count_annotated'):
            return obj.unread_count_annotated

        request = self.context.get('request')
        if not request or not request.user:
            return 0
        
        participant = obj.participants.filter(user=request.user).first()
        if not participant:
            return 0
        
        if participant.last_read_at:
            return obj.messages.filter(created_at__gt=participant.last_read_at).exclude(user=request.user).count()
        return obj.messages.exclude(user=request.user).count()


class ChatRoomCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating chat rooms."""
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = ChatRoom
        fields = ['name', 'type', 'project', 'participant_ids']
    
    def create(self, validated_data):
        """Create room and add participants, or return existing DM if one exists."""
        participant_ids = validated_data.pop('participant_ids', [])
        room_type = validated_data.get('type', 'direct')
        project = validated_data.get('project')
        creator = validated_data.get('created_by')
        
        # For direct messages with exactly 2 participants, check for existing room
        if room_type == 'direct' and len(participant_ids) == 1 and creator:
            other_user_id = participant_ids[0]
            
            # Find existing DM between these two users in this project
            existing_room = self._find_existing_dm(creator.id, other_user_id, project)
            if existing_room:
                return existing_room
        
        # No existing room found, create new one
        room = super().create(validated_data)
        
        # Add participants
        for user_id in participant_ids:
            try:
                user = User.objects.get(id=user_id)
                ChatParticipant.objects.get_or_create(room=room, user=user)
            except User.DoesNotExist:
                pass
        
        # Add creator as participant if not already
        if room.created_by and not room.participants.filter(user=room.created_by).exists():
            ChatParticipant.objects.create(room=room, user=room.created_by)
        
        return room
    
    def _find_existing_dm(self, user1_id, user2_id, project):
        """Find an existing direct message room between two users in a project."""
        from django.db.models import Count, Q
        
        # Find rooms that:
        # 1. Are 'direct' type
        # 2. In this project
        # 3. Have exactly 2 participants
        # 4. Both users are participants
        rooms = ChatRoom.objects.filter(
            type='direct',
            project=project
        ).annotate(
            participant_count=Count('participants')
        ).filter(
            participant_count=2,
            participants__user_id=user1_id
        ).filter(
            participants__user_id=user2_id
        ).distinct()
        
        return rooms.first()
