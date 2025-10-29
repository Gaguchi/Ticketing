from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from .permissions import (
    IsSuperuserOrCompanyAdmin, IsCompanyAdmin, IsCompanyMember,
    IsSuperuserOrCompanyMember, IsCompanyAdminOrReadOnly
)
from .models import (
    Ticket, Column, Project, Comment, Attachment,
    Tag, Contact, TagContact, UserTag, TicketTag, IssueLink, Company
)
from .serializers import (
    TicketSerializer, TicketListSerializer, ColumnSerializer,
    ProjectSerializer, CommentSerializer, AttachmentSerializer,
    TagSerializer, TagListSerializer, ContactSerializer,
    TagContactSerializer, UserTagSerializer, TicketTagSerializer,
    IssueLinkSerializer, CompanySerializer, CompanyListSerializer
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
    Get current authenticated user with their projects and companies
    """
    user = request.user
    
    # Get projects where user is lead
    lead_projects = Project.objects.filter(lead_username=user.username)
    
    # Get projects where user is a member
    member_projects = user.project_memberships.all()
    
    # Combine and remove duplicates
    all_projects = (lead_projects | member_projects).distinct()
    
    # Get companies where user is admin or member
    admin_companies = user.administered_companies.all()
    member_companies = user.member_companies.all()
    all_companies = (admin_companies | member_companies).distinct()
    
    # Serialize data
    from .serializers import ProjectSerializer, CompanyListSerializer
    projects_data = ProjectSerializer(all_projects, many=True).data
    companies_data = CompanyListSerializer(all_companies, many=True).data
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_superuser': user.is_superuser,
        'projects': projects_data,
        'has_projects': all_projects.exists(),
        'companies': companies_data,
        'administered_companies': CompanyListSerializer(admin_companies, many=True).data,
        'member_companies': CompanyListSerializer(member_companies, many=True).data,
        'has_companies': all_companies.exists(),
        'is_it_admin': admin_companies.exists(),
    })


# ==================== ViewSets ====================

class CompanyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Company CRUD operations.
    Handles multi-tenant company management for IT business servicing multiple clients.
    
    Permissions:
    - Superusers: Full access to all companies
    - IT Admins: Can view/edit companies they're assigned to
    - Company Users: Read-only access to their own company
    """
    queryset = Company.objects.all()
    permission_classes = [IsAuthenticated, IsCompanyAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'ticket_count']
    ordering = ['name']
    
    def get_serializer_class(self):
        """Use list serializer for list view, full serializer for others"""
        if self.action == 'list':
            return CompanyListSerializer
        return CompanySerializer
    
    def get_queryset(self):
        """
        Filter companies based on user role:
        - Superusers see all companies
        - IT Admins see companies they're assigned to
        - Company Users see only their company
        """
        user = self.request.user
        
        if user.is_superuser:
            return Company.objects.all()
        
        # Get companies where user is an admin or a member
        return Company.objects.filter(
            Q(admins=user) | Q(users=user)
        ).distinct()
    
    @action(detail=True, methods=['post'])
    def assign_admin(self, request, pk=None):
        """Assign an IT admin to this company"""
        company = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
            company.admins.add(user)
            return Response({
                'message': f'{user.username} assigned as admin to {company.name}',
                'company': CompanySerializer(company).data
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def remove_admin(self, request, pk=None):
        """Remove an IT admin from this company"""
        company = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
            company.admins.remove(user)
            return Response({
                'message': f'{user.username} removed from {company.name} admins',
                'company': CompanySerializer(company).data
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def assign_user(self, request, pk=None):
        """Assign a company user to this company"""
        company = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
            company.users.add(user)
            return Response({
                'message': f'{user.username} assigned to {company.name}',
                'company': CompanySerializer(company).data
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def remove_user(self, request, pk=None):
        """Remove a company user from this company"""
        company = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
            company.users.remove(user)
            return Response({
                'message': f'{user.username} removed from {company.name}',
                'company': CompanySerializer(company).data
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def tickets(self, request, pk=None):
        """Get all tickets for this company"""
        company = self.get_object()
        tickets = company.tickets.all()
        serializer = TicketListSerializer(tickets, many=True)
        return Response(serializer.data)


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
    
    def create(self, request, *args, **kwargs):
        """
        Override create to automatically add default columns to new projects
        """
        # Create the project using the parent create method
        response = super().create(request, *args, **kwargs)
        
        # If project was created successfully, add default columns
        if response.status_code == status.HTTP_201_CREATED:
            project_id = response.data['id']
            project = Project.objects.get(id=project_id)
            
            # Define default columns
            default_columns = [
                {'name': 'New', 'order': 1},
                {'name': 'In Progress', 'order': 2},
                {'name': 'Review', 'order': 3},
                {'name': 'Done', 'order': 4},
            ]
            
            # Create the columns
            for col_data in default_columns:
                Column.objects.create(
                    project=project,
                    name=col_data['name'],
                    order=col_data['order']
                )
            
            # Update the response to include columns_count
            response.data['columns_count'] = 4
        
        return response
    
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
    ViewSet for Ticket CRUD operations with company-based filtering.
    
    Access Control:
    - Superusers: See all tickets
    - Project Members: See tickets from their projects
    - IT Admins: See tickets for companies they're assigned to
    - Company Users: See only their company's tickets
    """
    queryset = Ticket.objects.select_related('company', 'column', 'project', 'reporter').prefetch_related('assignees', 'tags')
    permission_classes = [IsAuthenticated]  # Basic authentication only, filtering handled in get_queryset
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'type', 'priority_id', 'column', 'project', 'tags', 'company']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'updated_at', 'priority_id', 'due_date']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TicketListSerializer
        return TicketSerializer
    
    def get_queryset(self):
        """
        Filter tickets based on user's project/company access:
        - Superusers: All tickets
        - Project members: Tickets from their projects
        - Company admins/users: Tickets from projects associated with their companies
        """
        user = self.request.user
        
        # Superusers see everything
        if user.is_superuser:
            return Ticket.objects.select_related('company', 'column', 'project', 'reporter').prefetch_related('assignees', 'tags')
        
        # Get projects where user is a member
        member_projects = Project.objects.filter(members=user).values_list('id', flat=True)
        
        # Get companies where user is admin or member
        user_companies = Company.objects.filter(
            Q(admins=user) | Q(users=user)
        ).values_list('id', flat=True)
        
        # Get projects associated with those companies
        company_projects = Project.objects.filter(
            companies__id__in=user_companies
        ).values_list('id', flat=True)
        
        # Combine both project sets
        all_project_ids = set(member_projects) | set(company_projects)
        
        # Filter tickets by those projects
        return Ticket.objects.filter(
            project_id__in=all_project_ids
        ).select_related('company', 'column', 'project', 'reporter').prefetch_related('assignees', 'tags')
    
    def perform_create(self, serializer):
        """
        When creating a ticket with a company, automatically assign it to all admins of that company.
        """
        ticket = serializer.save(reporter=self.request.user)
        
        # Auto-assign to company admins if ticket has a company
        if ticket.company:
            company_admins = ticket.company.admins.all()
            if company_admins.exists():
                ticket.assignees.set(company_admins)
    
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
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['project']
    ordering_fields = ['order', 'created_at']
    ordering = ['order']
    
    @action(detail=False, methods=['post'])
    def create_defaults(self, request):
        """
        Create default columns for a project
        Usage: POST /api/tickets/columns/create_defaults/ with {"project_id": 1}
        """
        project_id = request.data.get('project_id')
        
        if not project_id:
            return Response(
                {'error': 'project_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if project already has columns
        existing_columns = Column.objects.filter(project=project).count()
        if existing_columns > 0:
            return Response(
                {'error': f'Project already has {existing_columns} columns'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Define default columns
        default_columns = [
            {'name': 'To Do', 'order': 1},
            {'name': 'In Progress', 'order': 2},
            {'name': 'Review', 'order': 3},
            {'name': 'Done', 'order': 4},
        ]
        
        # Create the columns
        created_columns = []
        for col_data in default_columns:
            column = Column.objects.create(
                project=project,
                name=col_data['name'],
                order=col_data['order']
            )
            created_columns.append(column)
        
        serializer = ColumnSerializer(created_columns, many=True)
        return Response({
            'message': f'Created {len(created_columns)} default columns',
            'columns': serializer.data
        }, status=status.HTTP_201_CREATED)
    
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


class IssueLinkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for IssueLink (ticket relationships like 'blocks', 'relates to', etc.)
    """
    queryset = IssueLink.objects.select_related(
        'source_ticket', 'target_ticket', 
        'source_ticket__project', 'target_ticket__project',
        'created_by'
    )
    serializer_class = IssueLinkSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['source_ticket', 'target_ticket', 'link_type']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)
