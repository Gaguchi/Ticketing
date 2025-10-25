from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Ticket, Column, Project, Comment, Attachment,
    Tag, Contact, TagContact, UserTag, TicketTag
)
from .serializers import (
    TicketSerializer, TicketListSerializer, ColumnSerializer,
    ProjectSerializer, CommentSerializer, AttachmentSerializer,
    TagSerializer, TagListSerializer, ContactSerializer,
    TagContactSerializer, UserTagSerializer, TicketTagSerializer
)


# ==================== Authentication Views ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user
    """
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    
    # Validation
    if not username or not email or not password:
        return Response(
            {'error': 'Username, email, and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create user
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
    )
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        },
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """
    Login user and return JWT tokens
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    
    if user is None:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        },
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    Get current authenticated user
    """
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
    })


# ==================== ViewSets ====================

class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Project CRUD operations
    """
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['key', 'name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    @action(detail=True, methods=['get'])
    def tickets(self, request, pk=None):
        """Get all tickets for this project"""
        project = self.get_object()
        tickets = project.tickets.all()
        serializer = TicketListSerializer(tickets, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def columns(self, request, pk=None):
        """Get all columns for this project"""
        project = self.get_object()
        columns = project.columns.all()
        serializer = ColumnSerializer(columns, many=True)
        return Response(serializer.data)


class TicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Ticket CRUD operations
    """
    queryset = Ticket.objects.select_related('column', 'project', 'reporter').prefetch_related('assignees', 'tags')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'type', 'priority_id', 'column', 'project', 'tags']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'updated_at', 'priority_id', 'due_date']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TicketListSerializer
        return TicketSerializer
    
    @action(detail=True, methods=['post'])
    def move_to_column(self, request, pk=None):
        """Move ticket to a different column"""
        ticket = self.get_object()
        column_id = request.data.get('column_id')
        
        try:
            column = Column.objects.get(id=column_id)
            ticket.column = column
            ticket.save()
            return Response({'status': 'ticket moved', 'column': column.name})
        except Column.DoesNotExist:
            return Response(
                {'error': 'Column not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def toggle_follow(self, request, pk=None):
        """Toggle following status of a ticket"""
        ticket = self.get_object()
        ticket.following = not ticket.following
        ticket.save()
        return Response({'following': ticket.following})


class ColumnViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Column CRUD operations
    """
    queryset = Column.objects.all()
    serializer_class = ColumnSerializer
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder columns"""
        order_data = request.data.get('order', [])
        
        for item in order_data:
            try:
                column = Column.objects.get(id=item['id'])
                column.order = item['order']
                column.save()
            except Column.DoesNotExist:
                pass
        
        return Response({'status': 'columns reordered'})


class CommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Comment CRUD operations
    """
    queryset = Comment.objects.select_related('user', 'ticket')
    serializer_class = CommentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ticket']
    
    def perform_create(self, serializer):
        # Set the user to the current user (when authentication is enabled)
        serializer.save(user=self.request.user if self.request.user.is_authenticated else None)


class AttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Attachment CRUD operations
    """
    queryset = Attachment.objects.select_related('ticket', 'uploaded_by')
    serializer_class = AttachmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ticket']
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user if self.request.user.is_authenticated else None)


class TagViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Tag CRUD operations.
    Only superadmins can create, edit, or delete tags.
    """
    queryset = Tag.objects.select_related('project', 'created_by').prefetch_related(
        'tag_contacts__contact', 'tickets'
    )
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['project']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TagListSerializer
        return TagSerializer
    
    def perform_create(self, serializer):
        """Set created_by to current user (must be superadmin)"""
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)
    
    @action(detail=True, methods=['get'])
    def contacts(self, request, pk=None):
        """Get all contacts for a tag"""
        tag = self.get_object()
        tag_contacts = tag.tag_contacts.select_related('contact', 'added_by').all()
        serializer = TagContactSerializer(tag_contacts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_contact(self, request, pk=None):
        """Add a contact to a tag"""
        tag = self.get_object()
        contact_id = request.data.get('contact_id')
        role = request.data.get('role', '')
        
        try:
            contact = Contact.objects.get(id=contact_id)
            tag_contact, created = TagContact.objects.get_or_create(
                tag=tag,
                contact=contact,
                defaults={
                    'role': role,
                    'added_by': self.request.user if self.request.user.is_authenticated else None
                }
            )
            
            if not created:
                # Update role if relationship already exists
                tag_contact.role = role
                tag_contact.save()
            
            serializer = TagContactSerializer(tag_contact)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        except Contact.DoesNotExist:
            return Response(
                {'error': 'Contact not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['delete'])
    def remove_contact(self, request, pk=None):
        """Remove a contact from a tag"""
        tag = self.get_object()
        contact_id = request.data.get('contact_id')
        
        try:
            tag_contact = TagContact.objects.get(tag=tag, contact_id=contact_id)
            tag_contact.delete()
            return Response({'status': 'contact removed'}, status=status.HTTP_204_NO_CONTENT)
        except TagContact.DoesNotExist:
            return Response(
                {'error': 'Contact not associated with this tag'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def tickets(self, request, pk=None):
        """Get all tickets with this tag"""
        tag = self.get_object()
        tickets = tag.tickets.all()
        serializer = TicketListSerializer(tickets, many=True)
        return Response(serializer.data)


class ContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Contact CRUD operations
    """
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'title', 'department', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    @action(detail=True, methods=['get'])
    def tags(self, request, pk=None):
        """Get all tags associated with this contact"""
        contact = self.get_object()
        tag_contacts = contact.tag_contacts.select_related('tag', 'added_by').all()
        serializer = TagContactSerializer(tag_contacts, many=True)
        return Response(serializer.data)


class TagContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TagContact relationship management
    """
    queryset = TagContact.objects.select_related('tag', 'contact', 'added_by')
    serializer_class = TagContactSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['tag', 'contact']
    
    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user if self.request.user.is_authenticated else None)


class UserTagViewSet(viewsets.ModelViewSet):
    """
    ViewSet for UserTag relationship (team membership)
    """
    queryset = UserTag.objects.select_related('user', 'tag', 'added_by')
    serializer_class = UserTagSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'tag']
    
    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user if self.request.user.is_authenticated else None)


class TicketTagViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TicketTag relationship
    """
    queryset = TicketTag.objects.select_related('ticket', 'tag', 'added_by')
    serializer_class = TicketTagSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ticket', 'tag']
    
    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user if self.request.user.is_authenticated else None)
