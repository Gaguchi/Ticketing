from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db import models
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend
from .permissions import (
    IsSuperuserOrCompanyAdmin, IsCompanyAdmin, IsCompanyMember,
    IsSuperuserOrCompanyMember, IsCompanyAdminOrReadOnly
)
from .pagination import StandardResultsSetPagination
from .models import (
    Ticket, Column, Project, Comment, Attachment,
    Tag, Contact, TagContact, UserTag, TicketTag, IssueLink, Company, UserRole, TicketSubtask,
    Notification, ProjectInvitation, TicketHistory
)
from .serializers import (
    TicketSerializer, TicketListSerializer, ColumnSerializer,
    ProjectSerializer, CommentSerializer, AttachmentSerializer,
    TagSerializer, TagListSerializer, ContactSerializer,
    TagContactSerializer, UserTagSerializer, TicketTagSerializer,
    IssueLinkSerializer, CompanySerializer, CompanyListSerializer,
    UserManagementSerializer, UserCreateUpdateSerializer, UserRoleSerializer, TicketSubtaskSerializer,
    NotificationSerializer, ProjectInvitationSerializer, InviteUserSerializer, AcceptInvitationSerializer,
    TicketHistorySerializer
)
from .email_service import send_invitation_email
from .services import auto_archive_completed_tickets


TRUE_VALUES = {'true', '1', 'yes', 'on'}
FALSE_VALUES = {'false', '0', 'no', 'off'}


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
    
    # Get projects where user is lead or member (Optimized)
    all_projects = Project.objects.filter(
        Q(lead_username=user.username) | Q(members=user)
    ).distinct().prefetch_related(
        'members', 'companies', 'companies__admins'
    ).annotate(
        tickets_count_annotated=models.Count('tickets', distinct=True),
        columns_count_annotated=models.Count('columns', distinct=True)
    )
    
    # Base company query with annotations
    base_company_qs = Company.objects.prefetch_related('admins').annotate(
        annotated_ticket_count=models.Count('tickets', distinct=True),
        annotated_admin_count=models.Count('admins', distinct=True),
        annotated_user_count=models.Count('users', distinct=True),
        annotated_project_count=models.Count('projects', distinct=True)
    )

    # Get companies where user is admin or member
    admin_companies = base_company_qs.filter(admins=user)
    member_companies = base_company_qs.filter(users=user)
    all_companies = (admin_companies | member_companies).distinct()
    
    # Get user roles for all projects
    user_roles = UserRole.objects.filter(user=user).select_related('project')
    
    # Check if user has any superadmin role
    is_project_superadmin = user_roles.filter(role='superadmin').exists()
    
    # Serialize data
    from .serializers import ProjectSerializer, CompanyListSerializer, UserRoleSerializer
    projects_data = ProjectSerializer(all_projects, many=True).data
    companies_data = CompanyListSerializer(all_companies, many=True).data
    user_roles_data = UserRoleSerializer(user_roles, many=True).data
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_superuser': user.is_superuser,
        'is_project_superadmin': is_project_superadmin,  # NEW: Check if user has any superadmin role
        'roles': user_roles_data,  # NEW: Include all user roles
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
    parser_classes = [MultiPartParser, FormParser, JSONParser]
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
        Filter companies based on user role and selected project:
        - Superusers see all companies (filtered by project if specified)
        - IT Admins see companies they're assigned to (filtered by project if specified)
        - Company Users see only their company (filtered by project if specified)
        - If ?project=<id> is provided, only show companies assigned to that project
        """
        user = self.request.user
        
        # Start with base queryset based on user permissions
        if user.is_superuser:
            queryset = Company.objects.all()
        else:
            # Get companies where user is an admin or a member
            queryset = Company.objects.filter(
                Q(admins=user) | Q(users=user)
            ).distinct()
        
        # Filter by selected project if provided
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(projects__id=project_id)
        
        return queryset
    
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
    
    @action(detail=True, methods=['post'])
    def create_user(self, request, pk=None):
        """
        Create a new user account and assign to this company.
        This is for creating end-customer accounts who will access the service desk portal.
        Body: {
            "username": "string",
            "email": "string", 
            "password": "string",
            "first_name": "string" (optional),
            "last_name": "string" (optional)
        }
        """
        company = self.get_object()
        
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        # Validation
        if not username or not email or not password:
            return Response(
                {'error': 'username, email, and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if email already exists
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'Email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            
            # Assign user to company
            company.users.add(user)
            
            # Get the company's projects and assign user role to each
            for project in company.projects.all():
                UserRole.objects.get_or_create(
                    user=user,
                    project=project,
                    defaults={
                        'role': 'user',
                        'assigned_by': request.user
                    }
                )
            
            return Response({
                'message': f'User {username} created and assigned to {company.name}',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                },
                'company': CompanySerializer(company).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User Management (Superadmin only).
    Provides comprehensive user CRUD with role assignment capabilities.
    """
    queryset = User.objects.all().select_related().prefetch_related(
        'project_roles__project',
        'administered_companies',
        'member_companies',
        'reported_tickets'
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'date_joined', 'last_login']
    ordering = ['-date_joined']
    
    def get_permissions(self):
        """Only superusers and staff can manage users"""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'assign_role', 'remove_role', 'set_password']:
            return [IsAuthenticated(), IsSuperuserOrCompanyAdmin()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserManagementSerializer
    
    def get_queryset(self):
        """Filter users based on permissions and shared projects"""
        user = self.request.user
        
        # Superusers see all users
        if user.is_superuser:
            return self.queryset
        
        # Staff users see all users (read-only for non-superusers)
        if user.is_staff:
            return self.queryset
        
        # Regular users only see users from SHARED projects
        # Get all projects where the current user is a member
        user_projects = user.project_memberships.all()
        
        # Get users who share at least one project with the current user
        # This ensures users only see colleagues from common projects
        shared_project_members = User.objects.filter(
            project_memberships__in=user_projects
        ).distinct()
        
        return shared_project_members
    
    @action(detail=True, methods=['post'])
    def assign_role(self, request, pk=None):
        """
        Assign a project role to a user.
        Body: {"project_id": 1, "role": "admin"}
        """
        user = self.get_object()
        project_id = request.data.get('project_id')
        role = request.data.get('role')
        
        if not project_id or not role:
            return Response(
                {'error': 'project_id and role are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if role not in ['superadmin', 'admin', 'user', 'manager']:
            return Response(
                {'error': 'Invalid role. Must be: superadmin, admin, user, or manager'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create or update role
        user_role, created = UserRole.objects.update_or_create(
            user=user,
            project=project,
            defaults={
                'role': role,
                'assigned_by': request.user
            }
        )
        
        serializer = UserRoleSerializer(user_role)
        return Response({
            'message': f'{user.username} assigned as {role} in {project.name}',
            'user_role': serializer.data,
            'created': created
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def remove_role(self, request, pk=None):
        """
        Remove a project role from a user.
        Body: {"project_id": 1}
        """
        user = self.get_object()
        project_id = request.data.get('project_id')
        
        if not project_id:
            return Response(
                {'error': 'project_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_role = UserRole.objects.get(user=user, project_id=project_id)
            user_role.delete()
            return Response({
                'message': f'Role removed for {user.username}',
            }, status=status.HTTP_200_OK)
        except UserRole.DoesNotExist:
            return Response(
                {'error': 'User role not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """
        Set/reset password for a user (superadmin only).
        Body: {"password": "newpassword"}
        """
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can set passwords'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        password = request.data.get('password')
        
        if not password:
            return Response(
                {'error': 'password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(password)
        user.save()
        
        return Response({
            'message': f'Password updated for {user.username}',
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle user active status (soft delete)"""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        
        return Response({
            'message': f'User {"activated" if user.is_active else "deactivated"}',
            'is_active': user.is_active
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def roles(self, request, pk=None):
        """Get all project roles for a user"""
        user = self.get_object()
        roles = user.project_roles.all()
        serializer = UserRoleSerializer(roles, many=True)
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
        Override create to automatically:
        1. Add default columns to new projects
        2. Assign the creator as 'superadmin' for the project
        """
        # Create the project using the parent create method
        response = super().create(request, *args, **kwargs)
        
        # If project was created successfully, add default columns and assign creator as superadmin
        if response.status_code == status.HTTP_201_CREATED:
            project_id = response.data['id']
            project = Project.objects.get(id=project_id)
            user = request.user
            
            # Assign the creator as 'superadmin' for this project
            UserRole.objects.create(
                user=user,
                project=project,
                role='superadmin',
                assigned_by=user  # Self-assigned during project creation
            )
            print(f"✅ Created UserRole: {user.username} as superadmin of {project.name}")
            
            # Define default columns
            default_columns = [
                {'name': 'To Do', 'order': 1},
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
    queryset = Ticket.objects.select_related('company', 'column', 'project', 'reporter', 'position').prefetch_related('assignees', 'tags')
    permission_classes = [IsAuthenticated]  # Basic authentication only, filtering handled in get_queryset
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'type', 'priority_id', 'column', 'project', 'tags', 'company', 'is_archived']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'updated_at', 'priority_id', 'due_date', 'column_order']
    ordering = ['column', 'column_order', '-created_at']
    
    def get_serializer_class(self):
        if self.action in ['list', 'archived']:
            return TicketListSerializer
        return TicketSerializer
    
    def _get_accessible_queryset(self):
        user = self.request.user

        base_queryset = Ticket.objects.select_related(
            'company', 'column', 'project', 'reporter', 'position'
        ).prefetch_related(
            'assignees', 'tags'
        ).annotate(
            comments_count=models.Count('comments', distinct=True)
        )

        if user.is_superuser:
            return base_queryset

        # Check if user is a regular company user (not admin, not IT staff)
        # Regular company users should only see tickets they created
        user_companies = Company.objects.filter(users=user)
        is_company_admin = Company.objects.filter(admins=user).exists()
        
        # If user is a company user but NOT an admin and NOT staff, show only their created tickets
        if user_companies.exists() and not is_company_admin and not user.is_staff:
            # Regular company user accessing via servicedesk - only see their tickets
            return base_queryset.filter(reporter=user)

        # For IT staff, admins, and project members, use the original logic
        member_projects = Project.objects.filter(members=user).values_list('id', flat=True)

        user_companies_all = Company.objects.filter(
            Q(admins=user) | Q(users=user)
        ).values_list('id', flat=True)

        company_projects = Project.objects.filter(
            companies__id__in=user_companies_all
        ).values_list('id', flat=True)

        all_project_ids = set(member_projects) | set(company_projects)

        if not all_project_ids:
            return base_queryset.none()

        return base_queryset.filter(project_id__in=all_project_ids)

    def get_queryset(self):
        """
        Filter tickets based on user's project/company access:
        - Superusers: All tickets
        - Project members: Tickets from their projects
        - Company admins/users: Tickets from projects associated with their companies
        """
        queryset = self._get_accessible_queryset()
        archived_param = self.request.query_params.get('archived')
        include_archived = self.request.query_params.get('include_archived')

        if archived_param:
            archived_value = archived_param.strip().lower()
            if archived_value in TRUE_VALUES:
                queryset = queryset.filter(is_archived=True)
            elif archived_value in FALSE_VALUES:
                queryset = queryset.filter(is_archived=False)
            elif archived_value != 'all':
                queryset = queryset.filter(is_archived=False)
        elif not include_archived or include_archived.strip().lower() not in TRUE_VALUES:
            queryset = queryset.filter(is_archived=False)

        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """Optimize single ticket retrieval with prefetch."""
        # Get the ticket with optimizations
        instance = self.get_queryset().filter(pk=kwargs['pk']).first()
        if not instance:
            return Response(
                {'detail': 'Not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def list(self, request, *args, **kwargs):
        """Trigger automatic archiving before returning the ticket list."""
        project_id = request.query_params.get('project')
        try:
            project_id_int = int(project_id) if project_id else None
        except (TypeError, ValueError):
            project_id_int = None

        auto_archive_completed_tickets(project_id_int)
        return super().list(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """
        When creating a ticket:
        1. For servicedesk users (non-staff, non-admin), automatically assign company and project
        2. Auto-assign to company admins if ticket has a company
        """
        user = self.request.user
        print(f"🎫 Creating ticket for user: {user.username}")
        
        # Check if user is a regular company user (servicedesk user)
        user_companies = Company.objects.filter(users=user)
        is_company_admin = Company.objects.filter(admins=user).exists()
        
        print(f"   User companies: {user_companies.count()}")
        print(f"   Is company admin: {is_company_admin}")
        print(f"   Is staff: {user.is_staff}")
        print(f"   Request data: {self.request.data}")
        
        # If this is a servicedesk user (company member, not admin, not staff)
        if user_companies.exists() and not is_company_admin and not user.is_staff:
            print("   📋 Servicedesk user detected - auto-assigning project/company")
            # Get the user's company
            user_company = user_companies.first()
            
            # Get or create a default support project for this company
            company_projects = Project.objects.filter(companies=user_company)
            
            if company_projects.exists():
                support_project = company_projects.first()
                print(f"   ✅ Using existing project: {support_project.name}")
            else:
                # Create a default support project if none exists
                support_project = Project.objects.create(
                    name=f"{user_company.name} Support",
                    key=user_company.name[:3].upper() + "SUP",
                    description=f"Support tickets for {user_company.name}"
                )
                support_project.companies.add(user_company)
                
                # Create default columns for the new project
                Column.objects.create(project=support_project, name='New', order=1)
                Column.objects.create(project=support_project, name='In Progress', order=2)
                Column.objects.create(project=support_project, name='Resolved', order=3)
                Column.objects.create(project=support_project, name='Closed', order=4)
                print(f"   ✅ Created new project: {support_project.name}")
            
            # Get the first column for this project
            first_column = Column.objects.filter(project=support_project).order_by('order').first()
            print(f"   📌 Assigning to column: {first_column.name}")
            
            # Save with auto-assigned company, project, and column
            ticket = serializer.save(
                reporter=user,
                company=user_company,
                project=support_project,
                column=first_column
            )
            print(f"   ✅ Ticket created: {ticket.id}")
        else:
            print("   ⚠️ Not a servicedesk user - requires project/column in request")
            # For staff/admin users, save normally
            ticket = serializer.save(reporter=user)
        
        # Auto-assign to company admins if ticket has a company
        if ticket.company:
            company_admins = ticket.company.admins.all()
            if company_admins.exists():
                ticket.assignees.set(company_admins)
                print(f"   👥 Auto-assigned to {company_admins.count()} company admin(s)")
    
    def _capture_state(self, instance):
        """Capture current state of ticket for history tracking"""
        return {
            'name': instance.name,
            'description': instance.description,
            'status': instance.get_status_display(),
            'priority': instance.get_priority_id_display(),
            'urgency': instance.get_urgency_display(),
            'importance': instance.get_importance_display(),
            'column_id': instance.column_id,
            'column_name': instance.column.name if instance.column else None,
            'assignees': list(instance.assignees.all().values_list('username', flat=True)),
            'type': instance.get_type_display(),
            'due_date': instance.due_date,
            'start_date': instance.start_date,
            'project_id': instance.project_id,
            'project_name': instance.project.name if instance.project else None,
            'company_id': instance.company_id,
            'company_name': instance.company.name if instance.company else None,
            'tags': list(instance.tags.all().values_list('name', flat=True)),
            'reporter': instance.reporter.username if instance.reporter else None,
        }

    def _record_changes(self, old_state, new_instance, user):
        """Compare old state with new instance and record history"""
        changes = []
        
        # Simple fields mapping (field_name, display_name/value_getter)
        simple_checks = [
            ('name', 'Title', lambda x: x.name),
            ('due_date', 'Due Date', lambda x: x.due_date),
            ('start_date', 'Start Date', lambda x: x.start_date),
        ]

        for field, label, getter in simple_checks:
            new_val = getter(new_instance)
            if old_state.get(field) != new_val:
                changes.append(TicketHistory(
                    ticket=new_instance, user=user, field=field,
                    old_value=str(old_state.get(field)) if old_state.get(field) is not None else None,
                    new_value=str(new_val) if new_val is not None else None
                ))

        # Description (special handling to avoid storing large text)
        if old_state.get('description') != new_instance.description:
             changes.append(TicketHistory(
                ticket=new_instance, user=user, field='description',
                old_value=None,
                new_value="Description updated"
            ))

        # Choice fields with display values
        choice_checks = [
            ('status', 'Status', lambda x: x.get_status_display()),
            ('priority', 'Priority', lambda x: x.get_priority_id_display()),
            ('urgency', 'Urgency', lambda x: x.get_urgency_display()),
            ('importance', 'Importance', lambda x: x.get_importance_display()),
            ('type', 'Type', lambda x: x.get_type_display()),
        ]

        for field, label, getter in choice_checks:
            new_val = getter(new_instance)
            if old_state.get(field) != new_val:
                changes.append(TicketHistory(
                    ticket=new_instance, user=user, field=field,
                    old_value=old_state.get(field),
                    new_value=new_val
                ))

        # Foreign Keys
        if old_state['column_id'] != new_instance.column_id:
             new_col_name = new_instance.column.name if new_instance.column else None
             changes.append(TicketHistory(
                ticket=new_instance, user=user, field='column',
                old_value=old_state['column_name'], new_value=new_col_name
            ))
            
        if old_state['project_id'] != new_instance.project_id:
             new_proj_name = new_instance.project.name if new_instance.project else None
             changes.append(TicketHistory(
                ticket=new_instance, user=user, field='project',
                old_value=old_state['project_name'], new_value=new_proj_name
            ))

        if old_state['company_id'] != new_instance.company_id:
             new_comp_name = new_instance.company.name if new_instance.company else None
             changes.append(TicketHistory(
                ticket=new_instance, user=user, field='company',
                old_value=old_state['company_name'], new_value=new_comp_name
            ))

        if old_state['reporter'] != (new_instance.reporter.username if new_instance.reporter else None):
             changes.append(TicketHistory(
                ticket=new_instance, user=user, field='reporter',
                old_value=old_state['reporter'], 
                new_value=new_instance.reporter.username if new_instance.reporter else None
            ))

        # M2M Fields
        new_assignees = list(new_instance.assignees.all().values_list('username', flat=True))
        if set(old_state['assignees']) != set(new_assignees):
             changes.append(TicketHistory(
                ticket=new_instance, user=user, field='assignees',
                old_value=", ".join(old_state['assignees']), new_value=", ".join(new_assignees)
            ))
            
        new_tags = list(new_instance.tags.all().values_list('name', flat=True))
        if set(old_state['tags']) != set(new_tags):
             changes.append(TicketHistory(
                ticket=new_instance, user=user, field='tags',
                old_value=", ".join(old_state['tags']), new_value=", ".join(new_tags)
            ))
            
        if changes:
            TicketHistory.objects.bulk_create(changes)

    def update(self, request, *args, **kwargs):
        """
        Custom update to handle column_order when provided.
        If both 'column' and 'order' are provided, use move_to_position for atomic updates.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Capture state before update
        old_state = self._capture_state(instance)
        
        # Check if both column and order are being updated
        column_id = request.data.get('column')
        order = request.data.get('order')
        
        print(f"📥 PATCH /api/tickets/{instance.id}/ received:", {
            'ticket': instance.ticket_key,
            'current_column': instance.column_id,
            'current_order': instance.column_order,
            'requested_column': column_id,
            'requested_order': order,
            'full_data': request.data,
        })
        
        if column_id is not None and order is not None:
            # Use move_to_position for atomic column+order update
            print(f"🎯 Using move_to_position: ticket={instance.ticket_key}, column={column_id}, order={order}")
            instance.move_to_position(column_id, order)
            
            # Refresh and serialize the updated instance
            instance.refresh_from_db()
            
            # Record history
            self._record_changes(old_state, instance, request.user)
            
            serializer = self.get_serializer(instance)
            
            print(f"📤 Returning updated ticket:", {
                'ticket': instance.ticket_key,
                'final_column': instance.column_id,
                'final_order': instance.column_order,
            })
            
            return Response(serializer.data)
        
        # Otherwise, use standard update logic
        print(f"⚙️ Using standard update (no order provided)")
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Refresh to get M2M updates if any
        instance.refresh_from_db()
        self._record_changes(old_state, instance, request.user)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get history for a ticket, including comments"""
        ticket = self.get_object()
        
        # Get history records
        history_qs = ticket.history.select_related('user').all()
        history_data = TicketHistorySerializer(history_qs, many=True).data
        for item in history_data:
            item['type'] = 'history'
            
        # Get comments
        comments_qs = ticket.comments.select_related('user').all()
        comments_data = CommentSerializer(comments_qs, many=True).data
        for item in comments_data:
            item['type'] = 'comment'
            
        # Combine and sort by created_at descending
        combined = history_data + comments_data
        combined.sort(key=lambda x: x['created_at'], reverse=True)
        
        return Response(combined)

    @action(detail=True, methods=['post'])
    def move_to_column(self, request, pk=None):
        """Move ticket to a different column with proper positioning"""
        ticket = self.get_object()
        column_id = request.data.get('column_id')
        new_order = request.data.get('order')  # Optional: specify exact position
        
        try:
            column = Column.objects.get(id=column_id)
            
            if new_order is not None:
                # Use the model's positioning method for consistent ordering
                ticket.move_to_position(column_id, new_order)
            else:
                # Just change column, let save() handle positioning at end
                ticket.column = column
                ticket.save()
            
            return Response({
                'status': 'ticket moved',
                'column': column.name,
                'order': ticket.column_order
            })
        except Column.DoesNotExist:
            return Response(
                {'error': 'Column not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def reorder_tickets(self, request):
        """
        Reorder tickets within a column or across columns.
        Uses direct updates for performance (bypassing move_to_position logic).
        Body: {
            "updates": [
                {"ticket_id": 1, "column_id": 2, "order": 0},
                {"ticket_id": 2, "column_id": 2, "order": 1},
                ...
            ]
        }
        """
        updates = request.data.get('updates', [])
        
        if not updates:
            return Response(
                {'error': 'updates array is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.db import transaction
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            from .models import TicketPosition
            
            updated_tickets = []
            affected_columns = set()
            project_id = None
            
            with transaction.atomic():
                for update in updates:
                    ticket_id = update.get('ticket_id')
                    column_id = update.get('column_id')
                    order = update.get('order')
                    
                    if ticket_id is None or order is None:
                        continue
                    
                    if column_id is not None:
                        affected_columns.add(column_id)
                    
                    # We need to get the project_id from at least one ticket
                    if project_id is None:
                        try:
                            ticket = Ticket.objects.get(id=ticket_id)
                            project_id = ticket.project_id
                            # Also add current column just in case
                            affected_columns.add(ticket.column_id)
                        except Ticket.DoesNotExist:
                            continue

                    # Direct update for performance
                    # 1. Update TicketPosition
                    if column_id is not None:
                        TicketPosition.objects.update_or_create(
                            ticket_id=ticket_id,
                            defaults={'column_id': column_id, 'order': order}
                        )
                        # 2. Update Ticket (sync)
                        Ticket.objects.filter(id=ticket_id).update(
                            column_id=column_id, 
                            column_order=order
                        )
                    else:
                        # Same column reorder
                        TicketPosition.objects.update_or_create(
                            ticket_id=ticket_id,
                            defaults={'order': order}
                        )
                        Ticket.objects.filter(id=ticket_id).update(
                            column_order=order
                        )
                    
                    updated_tickets.append(ticket_id)
            
            # Broadcast once after all updates are committed
            if project_id and affected_columns:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'project_{project_id}_tickets',
                    {
                        'type': 'column_refresh',
                        'column_ids': list(affected_columns),
                    }
                )
            
            return Response({
                'status': 'tickets reordered',
                'updated': updated_tickets
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def toggle_follow(self, request, pk=None):
        """Toggle following status of a ticket"""
        ticket = self.get_object()
        ticket.following = not ticket.following
        ticket.save()
        return Response({'following': ticket.following})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Manually archive a ticket."""
        ticket = self.get_object()
        if ticket.is_archived:
            return Response({'detail': 'Ticket is already archived.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason')
        ticket.archive(archived_by=request.user, reason=reason)
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='archived')
    def archived(self, request):
        """Return paginated archived tickets accessible to the user."""
        project_id = request.query_params.get('project')
        try:
            project_id_int = int(project_id) if project_id else None
        except (TypeError, ValueError):
            project_id_int = None

        auto_archive_completed_tickets(project_id_int)

        queryset = self._get_accessible_queryset().filter(is_archived=True)
        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore a ticket from the archive."""
        ticket = self.get_object()
        if not ticket.is_archived:
            return Response({'detail': 'Ticket is not archived.'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.restore()
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)


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
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Support nested route: /tickets/{ticket_id}/comments/
        ticket_id = self.kwargs.get('ticket_id')
        if ticket_id is not None:
            queryset = queryset.filter(ticket_id=ticket_id)
        return queryset
    
    def perform_create(self, serializer):
        # Set the user to the current user (when authentication is enabled)
        # Support nested route by setting ticket from URL parameter
        ticket_id = self.kwargs.get('ticket_id')
        print(f"💬 [CommentViewSet] Creating comment for ticket_id={ticket_id}")
        
        if ticket_id:
            from .models import Ticket
            try:
                ticket = Ticket.objects.get(id=ticket_id)
                print(f"✅ [CommentViewSet] Found ticket: {ticket}")
                user = self.request.user if self.request.user.is_authenticated else None
                print(f"👤 [CommentViewSet] User: {user}")
                
                serializer.save(
                    user=user,
                    ticket=ticket
                )
                print(f"✅ [CommentViewSet] Comment saved successfully")
            except Ticket.DoesNotExist:
                print(f"❌ [CommentViewSet] Ticket {ticket_id} not found")
                raise
            except Exception as e:
                print(f"❌ [CommentViewSet] Error saving comment: {e}")
                raise
        else:
            print(f"⚠️ [CommentViewSet] No ticket_id in URL kwargs")
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
        attachment = serializer.save(uploaded_by=self.request.user if self.request.user.is_authenticated else None)
        
        TicketHistory.objects.create(
            ticket=attachment.ticket,
            user=self.request.user if self.request.user.is_authenticated else None,
            field='attachment',
            old_value=None,
            new_value=f"Uploaded file: {attachment.filename}"
        )

    def perform_destroy(self, instance):
        ticket = instance.ticket
        filename = instance.filename
        instance.delete()
        
        TicketHistory.objects.create(
            ticket=ticket,
            user=self.request.user if self.request.user.is_authenticated else None,
            field='attachment',
            old_value=f"File: {filename}",
            new_value="Deleted file"
        )


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


class TicketSubtaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TicketSubtask - subtasks within tickets
    """
    queryset = TicketSubtask.objects.select_related('ticket', 'assignee', 'created_by')
    serializer_class = TicketSubtaskSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ticket', 'assignee', 'is_complete']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        ticket_id = self.request.query_params.get('ticket', None)
        if ticket_id:
            queryset = queryset.filter(ticket_id=ticket_id)
        return queryset.order_by('order', 'created_at')
    
    def perform_create(self, serializer):
        subtask = serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)
        
        # Record history on parent ticket
        TicketHistory.objects.create(
            ticket=subtask.ticket,
            user=self.request.user if self.request.user.is_authenticated else None,
            field='subtask',
            old_value=None,
            new_value=f"Added subtask: {subtask.title}"
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_is_complete = instance.is_complete
        subtask = serializer.save()
        
        if old_is_complete != subtask.is_complete:
            status = "completed" if subtask.is_complete else "reopened"
            TicketHistory.objects.create(
                ticket=subtask.ticket,
                user=self.request.user if self.request.user.is_authenticated else None,
                field='subtask',
                old_value=None,
                new_value=f"Subtask {status}: {subtask.title}"
            )

    def perform_destroy(self, instance):
        ticket = instance.ticket
        title = instance.title
        instance.delete()
        
        TicketHistory.objects.create(
            ticket=ticket,
            user=self.request.user if self.request.user.is_authenticated else None,
            field='subtask',
            old_value=f"Subtask: {title}",
            new_value="Deleted subtask"
        )


class IssueLinkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for IssueLink - linked work items between tickets
    """
    queryset = IssueLink.objects.select_related(
        'source_ticket', 'target_ticket', 'created_by',
        'source_ticket__project', 'target_ticket__project'
    )
    serializer_class = IssueLinkSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['source_ticket', 'target_ticket', 'link_type']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        ticket_id = self.request.query_params.get('ticket', None)
        if ticket_id:
            # Return links where the ticket is either source or target
            queryset = queryset.filter(
                Q(source_ticket_id=ticket_id) | Q(target_ticket_id=ticket_id)
            )
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        link = serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)
        
        # Record history on source ticket
        TicketHistory.objects.create(
            ticket=link.source_ticket,
            user=self.request.user if self.request.user.is_authenticated else None,
            field='link',
            old_value=None,
            new_value=f"Linked to {link.target_ticket.ticket_key} ({link.link_type})"
        )
        
        # Record history on target ticket
        TicketHistory.objects.create(
            ticket=link.target_ticket,
            user=self.request.user if self.request.user.is_authenticated else None,
            field='link',
            old_value=None,
            new_value=f"Linked from {link.source_ticket.ticket_key} ({link.link_type})"
        )

    def perform_destroy(self, instance):
        source = instance.source_ticket
        target = instance.target_ticket
        link_type = instance.link_type
        instance.delete()
        
        TicketHistory.objects.create(
            ticket=source,
            user=self.request.user if self.request.user.is_authenticated else None,
            field='link',
            old_value=f"Linked to {target.ticket_key} ({link_type})",
            new_value="Removed link"
        )
        
        TicketHistory.objects.create(
            ticket=target,
            user=self.request.user if self.request.user.is_authenticated else None,
            field='link',
            old_value=f"Linked from {source.ticket_key} ({link_type})",
            new_value="Removed link"
        )


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Notification - user notifications
    
    Provides:
    - List: GET /api/tickets/notifications/ - Get current user's notifications
    - Retrieve: GET /api/tickets/notifications/{id}/ - Get specific notification
    - Delete: DELETE /api/tickets/notifications/{id}/ - Delete notification
    - mark_read: POST /api/tickets/notifications/{id}/mark_read/ - Mark as read
    - mark_all_read: POST /api/tickets/notifications/mark_all_read/ - Mark all as read
    - unread_count: GET /api/tickets/notifications/unread_count/ - Get unread count
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return only notifications for the current user"""
        return Notification.objects.filter(user=self.request.user).select_related('user')
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a specific notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all user's notifications as read"""
        updated_count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        return Response({
            'success': True,
            'updated_count': updated_count,
            'message': f'{updated_count} notifications marked as read'
        })
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        return Response({'unread_count': count})


class ProjectInvitationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing project invitations
    """
    serializer_class = ProjectInvitationSerializer
    permission_classes = [IsAuthenticated]
    queryset = ProjectInvitation.objects.all()
    
    def get_queryset(self):
        """Filter invitations based on user permissions"""
        user = self.request.user
        
        # Superusers see all
        if user.is_superuser:
            return ProjectInvitation.objects.all()
        
        # Users see invitations for projects they're members of
        return ProjectInvitation.objects.filter(
            project__members=user
        )
    
    @action(detail=False, methods=['post'], url_path='send')
    def send_invitation(self, request):
        """
        Add an existing user to project by email (simplified - no email sending)
        
        POST /api/tickets/invitations/send/
        Body: {
            "project_id": 1,
            "email": "user@example.com",
            "role": "user"  # optional, defaults to 'user'
        }
        """
        serializer = InviteUserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        project_id = request.data.get('project_id')
        email = serializer.validated_data['email']
        role = serializer.validated_data.get('role', 'user')
        
        # Get project
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user has permission to invite to this project
        if not request.user.is_superuser and request.user not in project.members.all():
            return Response(
                {'error': 'You do not have permission to invite users to this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if user with this email exists
        try:
            user_to_add = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'User with this email not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is already a member
        if user_to_add in project.members.all():
            return Response(
                {'error': 'User is already a member of this project'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add user to project instantly
        project.members.add(user_to_add)
        
        # Optionally create an invitation record for tracking (marked as accepted immediately)
        invitation = ProjectInvitation.objects.create(
            project=project,
            email=email,
            role=role,
            invited_by=request.user,
            accepted_by=user_to_add,
            status='accepted'
        )
        
        return Response({
            'success': True,
            'message': f'{user_to_add.first_name} {user_to_add.last_name} ({email}) has been added to {project.name}',
            'user': {
                'id': user_to_add.id,
                'email': user_to_add.email,
                'first_name': user_to_add.first_name,
                'last_name': user_to_add.last_name
            },
            'project': {
                'id': project.id,
                'name': project.name,
                'key': project.key
            }
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='accept', permission_classes=[IsAuthenticated])
    def accept_invitation(self, request):
        """
        Accept a project invitation
        
        POST /api/tickets/invitations/accept/
        Body: {
            "token": "unique_token_string"
        }
        """
        serializer = AcceptInvitationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        token = serializer.validated_data['token']
        
        # Get invitation
        try:
            invitation = ProjectInvitation.objects.get(token=token)
        except ProjectInvitation.DoesNotExist:
            return Response(
                {'error': 'Invalid invitation token'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if valid
        if not invitation.is_valid():
            return Response(
                {'error': f'Invitation is {invitation.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Accept invitation
        try:
            invitation.accept(request.user)
            return Response({
                'success': True,
                'message': f'You have been added to {invitation.project.name}',
                'project': {
                    'id': invitation.project.id,
                    'name': invitation.project.name,
                    'key': invitation.project.key
                },
                'role': invitation.role
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], url_path='check', permission_classes=[AllowAny])
    def check_invitation(self, request):
        """
        Check if an invitation is valid without accepting it
        
        GET /api/tickets/invitations/check/?token=xyz
        """
        token = request.query_params.get('token')
        if not token:
            return Response(
                {'error': 'Token parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invitation = ProjectInvitation.objects.get(token=token)
        except ProjectInvitation.DoesNotExist:
            return Response(
                {'error': 'Invalid invitation token'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'valid': invitation.is_valid(),
            'status': invitation.status,
            'project_name': invitation.project.name,
            'project_key': invitation.project.key,
            'role': invitation.get_role_display(),
            'email': invitation.email,
            'expires_at': invitation.expires_at,
            'invited_by': invitation.invited_by.username if invitation.invited_by else None
        })
    
    @action(detail=True, methods=['post'], url_path='revoke')
    def revoke_invitation(self, request, pk=None):
        """
        Revoke a pending invitation
        
        POST /api/tickets/invitations/{id}/revoke/
        """
        invitation = self.get_object()
        
        # Check permission
        if not request.user.is_superuser and request.user != invitation.invited_by:
            return Response(
                {'error': 'You do not have permission to revoke this invitation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if invitation.status != 'pending':
            return Response(
                {'error': f'Cannot revoke {invitation.status} invitation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invitation.status = 'revoked'
        invitation.save(update_fields=['status', 'updated_at'])
        
        return Response({
            'success': True,
            'message': 'Invitation revoked'
        })


# ==================== Dashboard Views ====================

# Priority ID to name mapping (matches Ticket.PRIORITY_CHOICES)
PRIORITY_NAMES = {1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical'}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_company_health(request):
    """
    Get company health data for dashboard.
    Returns ticket counts by status for each company associated with the project.
    
    GET /api/tickets/dashboard/company-health/
    Query params:
        - project: Filter by project ID (required for project-based view)
    """
    user = request.user
    project_id = request.query_params.get('project')
    
    # Get companies - if project specified, get all companies in that project
    # Otherwise fall back to companies user has access to
    if project_id:
        # Get all companies associated with this project
        companies = Company.objects.filter(projects__id=project_id).distinct()
    else:
        # Fallback: Get companies user has access to
        companies = Company.objects.filter(
            Q(admins=user) | Q(users=user)
        ).distinct()
    
    company_data = []
    for company in companies:
        # Get tickets for this company
        tickets_qs = Ticket.objects.filter(company=company)
        if project_id:
            tickets_qs = tickets_qs.filter(project_id=project_id)
        
        # Count by status (using column names as status)
        tickets_by_status = {}
        for ticket in tickets_qs.select_related('column'):
            column_name = ticket.column.name if ticket.column else 'No Column'
            tickets_by_status[column_name] = tickets_by_status.get(column_name, 0) + 1
        
        # Count priority levels (using priority_id field)
        tickets_by_priority = {}
        for ticket in tickets_qs:
            priority_name = PRIORITY_NAMES.get(ticket.priority_id, 'Unknown')
            tickets_by_priority[priority_name] = tickets_by_priority.get(priority_name, 0) + 1
        
        # Get overdue tickets (due_date in the past, not in Done column)
        overdue_count = tickets_qs.filter(
            due_date__lt=timezone.now().date()
        ).exclude(
            column__name__icontains='done'
        ).exclude(
            column__name__icontains='complete'
        ).count()
        
        # Get unassigned tickets (no assignees)
        unassigned_count = 0
        for ticket in tickets_qs.prefetch_related('assignees'):
            if not ticket.assignees.exists():
                unassigned_count += 1
        
        company_data.append({
            'id': company.id,
            'name': company.name,
            'logo_url': request.build_absolute_uri(company.logo.url) if company.logo else None,
            'logo_thumbnail_url': request.build_absolute_uri(company.logo_thumbnail.url) if company.logo_thumbnail else None,
            'total_tickets': tickets_qs.count(),
            'tickets_by_status': tickets_by_status,
            'tickets_by_priority': tickets_by_priority,
            'overdue_count': overdue_count,
            'unassigned_count': unassigned_count,
        })
    
    return Response(company_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_attention_needed(request):
    """
    Get tickets that need attention (overdue, unassigned critical, stale).
    
    GET /api/tickets/dashboard/attention-needed/
    Query params:
        - project: Filter by project ID (optional)
        - limit: Max number of tickets (default 10)
    """
    user = request.user
    project_id = request.query_params.get('project')
    limit = int(request.query_params.get('limit', 10))
    
    # Base queryset - tickets user can access
    # If project is specified and user is a project member, show ALL tickets in project
    # Otherwise use the more restrictive filter
    if project_id:
        try:
            project = Project.objects.get(id=project_id)
            if project.members.filter(id=user.id).exists():
                # User is project member - can see all project tickets
                tickets_qs = Ticket.objects.filter(project_id=project_id)
            else:
                # User is not project member - only see their own/company tickets
                tickets_qs = Ticket.objects.filter(
                    Q(company__admins=user) | Q(company__users=user) | Q(reporter=user) | Q(assignees=user)
                ).filter(project_id=project_id).distinct()
        except Project.DoesNotExist:
            tickets_qs = Ticket.objects.none()
    else:
        tickets_qs = Ticket.objects.filter(
            Q(company__admins=user) | Q(company__users=user) | Q(reporter=user) | Q(assignees=user) | Q(project__members=user)
        ).distinct()
    
    # Exclude completed tickets
    tickets_qs = tickets_qs.exclude(
        column__name__icontains='done'
    ).exclude(
        column__name__icontains='complete'
    )
    
    # Overdue tickets
    overdue = tickets_qs.filter(
        due_date__lt=timezone.now().date()
    ).select_related(
        'company', 'column', 'project'
    ).prefetch_related('assignees').order_by('due_date')[:limit]
    
    # Unassigned critical/high priority (priority_id 3=High, 4=Critical)
    # We need to filter tickets with no assignees - need to annotate
    unassigned_qs = tickets_qs.annotate(
        assignee_count=models.Count('assignees')
    ).filter(
        assignee_count=0,
        priority_id__in=[3, 4]  # High or Critical
    ).select_related(
        'company', 'column', 'project'
    ).order_by('-created_at')[:limit]
    
    # Stale tickets (no updates in 7+ days)
    stale_threshold = timezone.now() - timedelta(days=7)
    stale = tickets_qs.filter(
        updated_at__lt=stale_threshold
    ).select_related(
        'company', 'column', 'project'
    ).prefetch_related('assignees').order_by('updated_at')[:limit]
    
    def serialize_ticket(ticket):
        # Get first assignee if any
        first_assignee = ticket.assignees.first() if hasattr(ticket, 'assignees') else None
        return {
            'id': ticket.id,
            'title': ticket.name,  # Ticket model uses 'name' not 'title'
            'key': ticket.ticket_key,
            'status': ticket.column.name if ticket.column else None,
            'priority': PRIORITY_NAMES.get(ticket.priority_id),
            'assignee': {
                'id': first_assignee.id,
                'username': first_assignee.username,
                'first_name': first_assignee.first_name,
                'last_name': first_assignee.last_name,
            } if first_assignee else None,
            'company': {
                'id': ticket.company.id,
                'name': ticket.company.name,
                'logo_url': request.build_absolute_uri(ticket.company.logo.url) if ticket.company and ticket.company.logo else None,
            } if ticket.company else None,
            'due_date': ticket.due_date.isoformat() if ticket.due_date else None,
            'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None,
            'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
        }

    return Response({
        'overdue': [serialize_ticket(t) for t in overdue],
        'unassigned_critical': [serialize_ticket(t) for t in unassigned_qs],
        'stale': [serialize_ticket(t) for t in stale],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_newest_tickets(request):
    """
    Get the newest tickets.
    
    GET /api/tickets/dashboard/newest/
    Query params:
        - project: Filter by project ID (optional)
        - company: Filter by company ID (optional)
        - limit: Max number of tickets (default 10)
    """
    user = request.user
    project_id = request.query_params.get('project')
    company_id = request.query_params.get('company')
    limit = int(request.query_params.get('limit', 10))
    
    # Base queryset - tickets user can access
    # If project is specified and user is a project member (or superuser), show ALL tickets in project
    if project_id:
        try:
            project = Project.objects.get(id=project_id)
            if user.is_superuser or project.members.filter(id=user.id).exists():
                # User is superuser or project member - can see all project tickets
                tickets_qs = Ticket.objects.filter(project_id=project_id)
            else:
                # User is not project member - only see their own/company tickets
                tickets_qs = Ticket.objects.filter(
                    Q(company__admins=user) | Q(company__users=user) | Q(reporter=user) | Q(assignees=user)
                ).filter(project_id=project_id).distinct()
        except Project.DoesNotExist:
            tickets_qs = Ticket.objects.none()
    else:
        tickets_qs = Ticket.objects.filter(
            Q(company__admins=user) | Q(company__users=user) | Q(reporter=user) | Q(assignees=user) | Q(project__members=user)
        ).distinct()
    
    if company_id:
        tickets_qs = tickets_qs.filter(company_id=company_id)
    
    newest = tickets_qs.select_related(
        'reporter', 'company', 'column', 'project'
    ).prefetch_related('assignees').order_by('-created_at')[:limit]
    
    data = []
    for ticket in newest:
        first_assignee = ticket.assignees.first()
        data.append({
            'id': ticket.id,
            'title': ticket.name,  # Ticket model uses 'name' not 'title'
            'key': ticket.ticket_key,
            'status': ticket.column.name if ticket.column else None,
            'priority': PRIORITY_NAMES.get(ticket.priority_id),
            'type': ticket.type,
            'assignee': {
                'id': first_assignee.id,
                'username': first_assignee.username,
                'first_name': first_assignee.first_name,
                'last_name': first_assignee.last_name,
            } if first_assignee else None,
            'reporter': {
                'id': ticket.reporter.id,
                'username': ticket.reporter.username,
                'first_name': ticket.reporter.first_name,
                'last_name': ticket.reporter.last_name,
            } if ticket.reporter else None,
            'company': {
                'id': ticket.company.id,
                'name': ticket.company.name,
                'logo_url': request.build_absolute_uri(ticket.company.logo.url) if ticket.company and ticket.company.logo else None,
            } if ticket.company else None,
            'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
        })
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_live_activity(request):
    """
    Get recent activity (ticket history) for live feed.
    
    GET /api/tickets/dashboard/activity/
    Query params:
        - project: Filter by project ID (optional)
        - company: Filter by company ID (optional)
        - limit: Max number of activities (default 20)
    """
    user = request.user
    project_id = request.query_params.get('project')
    company_id = request.query_params.get('company')
    limit = int(request.query_params.get('limit', 20))
    
    # Get tickets user can access
    # If project is specified and user is a project member (or superuser), show ALL tickets in project
    if project_id:
        try:
            project = Project.objects.get(id=project_id)
            if user.is_superuser or project.members.filter(id=user.id).exists():
                # User is superuser or project member - can see all project tickets
                accessible_tickets = Ticket.objects.filter(project_id=project_id)
            else:
                # User is not project member - only see their own/company tickets
                accessible_tickets = Ticket.objects.filter(
                    Q(company__admins=user) | Q(company__users=user) | Q(reporter=user) | Q(assignees=user)
                ).filter(project_id=project_id).distinct()
        except Project.DoesNotExist:
            accessible_tickets = Ticket.objects.none()
    else:
        accessible_tickets = Ticket.objects.filter(
            Q(company__admins=user) | Q(company__users=user) | Q(reporter=user) | Q(assignees=user) | Q(project__members=user)
        ).distinct()
    
    if company_id:
        accessible_tickets = accessible_tickets.filter(company_id=company_id)
    
    # Get history for these tickets
    history = TicketHistory.objects.filter(
        ticket__in=accessible_tickets
    ).select_related(
        'ticket', 'ticket__company', 'ticket__project', 'user'
    ).order_by('-created_at')[:limit]
    
    data = []
    for entry in history:
        data.append({
            'id': entry.id,
            'ticket': {
                'id': entry.ticket.id,
                'key': entry.ticket.ticket_key,
                'title': entry.ticket.name,  # Ticket model uses 'name' not 'title'
                'company': {
                    'id': entry.ticket.company.id,
                    'name': entry.ticket.company.name,
                } if entry.ticket.company else None,
            },
            'field': entry.field,  # TicketHistory uses 'field' not 'field_name'
            'old_value': entry.old_value,
            'new_value': entry.new_value,
            'changed_by': {
                'id': entry.user.id,
                'username': entry.user.username,
                'first_name': entry.user.first_name,
                'last_name': entry.user.last_name,
            } if entry.user else None,
            'changed_at': entry.created_at.isoformat() if entry.created_at else None,  # TicketHistory uses 'created_at'
        })
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_agent_workload(request):
    """
    Get workload distribution across team members (IT staff only).
    
    GET /api/tickets/dashboard/workload/
    Query params:
        - project: Filter by project ID (optional)
        - company: Filter by company ID (optional)
        
    Note: Company users (client employees) are excluded from workload.
    Only IT staff (project members who are not company.users) are shown.
    """
    user = request.user
    project_id = request.query_params.get('project')
    company_id = request.query_params.get('company')
    
    # Get project members
    if project_id:
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get project members but exclude company users (client employees)
        # Company users are those who are in any company's "users" M2M field
        # Company relationship: Project.companies -> Company.users
        # related_name: User.member_companies points to companies where user is a client
        project_companies = project.companies.all()
        company_user_ids = User.objects.filter(
            member_companies__in=project_companies
        ).values_list('id', flat=True)
        
        members = project.members.exclude(id__in=company_user_ids)
    else:
        # Get all users from projects the user is part of
        user_projects = Project.objects.filter(members=user)
        members = User.objects.filter(project_memberships__in=user_projects).distinct()
    
    workload_data = []
    for member in members:
        # Get tickets assigned to this member (through ManyToMany)
        tickets_qs = Ticket.objects.filter(assignees=member)
        if project_id:
            tickets_qs = tickets_qs.filter(project_id=project_id)
        if company_id:
            tickets_qs = tickets_qs.filter(company_id=company_id)
        
        # Exclude completed
        active_tickets = tickets_qs.exclude(
            column__name__icontains='done'
        ).exclude(
            column__name__icontains='complete'
        )
        
        # Count by column
        by_status = {}
        for ticket in active_tickets.select_related('column'):
            col_name = ticket.column.name if ticket.column else 'No Column'
            by_status[col_name] = by_status.get(col_name, 0) + 1
        
        # Get overdue count
        overdue = active_tickets.filter(due_date__lt=timezone.now().date()).count()
        
        workload_data.append({
            'user': {
                'id': member.id,
                'username': member.username,
                'first_name': member.first_name,
                'last_name': member.last_name,
            },
            'total_active': active_tickets.count(),
            'by_status': by_status,
            'overdue': overdue,
        })
    
    # Sort by total active tickets descending
    workload_data.sort(key=lambda x: x['total_active'], reverse=True)
    
    return Response(workload_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_kanban_summary(request):
    """
    Get Kanban board summary (ticket counts per column).
    
    GET /api/tickets/dashboard/kanban-summary/
    Query params:
        - project: Filter by project ID (required)
        - company: Filter by company ID (optional)
    """
    user = request.user
    project_id = request.query_params.get('project')
    company_id = request.query_params.get('company')
    
    if not project_id:
        return Response({'error': 'project parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get columns for this project
    columns = Column.objects.filter(project=project).order_by('order')
    
    # Get tickets - superuser or project member can see all
    if user.is_superuser or project.members.filter(id=user.id).exists():
        tickets_qs = Ticket.objects.filter(project=project)
    else:
        tickets_qs = Ticket.objects.filter(project=project).filter(
            Q(company__admins=user) | Q(company__users=user) | Q(reporter=user) | Q(assignees=user)
        ).distinct()
    
    if company_id:
        tickets_qs = tickets_qs.filter(company_id=company_id)
    
    column_data = []
    for column in columns:
        column_tickets = tickets_qs.filter(column=column)
        column_data.append({
            'id': column.id,
            'name': column.name,
            'color': column.color,
            'position': column.order,
            'ticket_count': column_tickets.count(),
        })
    
    return Response({
        'project': {
            'id': project.id,
            'name': project.name,
            'key': project.key,
        },
        'columns': column_data,
        'total_tickets': tickets_qs.count(),
    })

