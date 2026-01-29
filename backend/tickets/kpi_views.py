"""
KPI (Key Performance Indicators) Views

Provides endpoints for user metrics, project summaries, and performance data.
Access is role-based:
- superadmin/manager: Can view all user metrics in their projects
- admin/user: Can only view their own metrics
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Count, Avg, Q, F
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
from .models import Ticket, Project, UserRole, StatusCategory, Status, KPIConfig, KPIIndicator, TicketHistory, Column
from .kpi_constants import AVAILABLE_INDICATORS
from .serializers import KPIConfigSerializer, KPIConfigCreateUpdateSerializer


class KPIViewSet(viewsets.ViewSet):
    """
    ViewSet for KPI (Key Performance Indicator) data.
    
    Provides role-based access to user and project metrics.
    """
    permission_classes = [IsAuthenticated]
    
    def _get_user_role_in_project(self, user, project_id):
        """Get user's role in a specific project."""
        try:
            user_role = UserRole.objects.get(user=user, project_id=project_id)
            return user_role.role
        except UserRole.DoesNotExist:
            return None
    
    def _can_view_all_metrics(self, user, project_id):
        """Check if user can view all user metrics (superadmin/manager)."""
        if user.is_superuser:
            return True
        role = self._get_user_role_in_project(user, project_id)
        return role in ['superadmin', 'manager']
    
    def _calculate_user_metrics(self, user, project_id, date_from=None, date_to=None):
        """
        Calculate metrics for a specific user in a project.

        Returns dict with:
        - tickets_created: Total tickets created by user
        - tickets_resolved: Tickets moved to Done (by assignee)
        - avg_resolution_hours: Average time from created → done
        - avg_customer_rating: Average customer satisfaction rating
        - avg_first_response_hours: Average time to first assignee comment
        - sla_compliance_rate: % of tickets resolved before due date
        - reopen_rate: % of resolved tickets that were reopened
        """
        # Base queryset for ALL tickets including archived - used for resolved/completed metrics
        # Archived tickets represent completed work that should count toward KPIs
        all_tickets_qs = Ticket.objects.filter(project_id=project_id)

        # Annotate with completion date for filtering resolved tickets
        all_tickets_qs = all_tickets_qs.annotate(
            completion_date=Coalesce('done_at', 'archived_at', 'updated_at')
        )
        
        # Tickets created by user (all tickets including archived)
        # For created count, filter by created_at
        created_qs = Ticket.objects.filter(project_id=project_id, reporter=user)
        if date_from:
            created_qs = created_qs.filter(created_at__gte=date_from)
        if date_to:
            created_qs = created_qs.filter(created_at__lte=date_to)
        tickets_created = created_qs.count()
        
        # Tickets resolved by user - include archived since they represent completed work
        # A ticket is "resolved" if it's in Done status OR has been archived (which means it was completed)
        # 
        # IMPORTANT: We count tickets where:
        # 1. User is an assignee (worked on it), OR
        # 2. User is the reporter AND there are no assignees (they handled it themselves)
        #
        # This handles the common case where tickets are completed without formal assignment.
        done_filter = Q(ticket_status__category=StatusCategory.DONE) | Q(is_archived=True)
        
        # Subquery to check if ticket has any assignees
        from django.db.models import Exists, OuterRef
        from tickets.models import Ticket as TicketModel
        
        has_assignees_subquery = TicketModel.objects.filter(
            id=OuterRef('id'),
            assignees__isnull=False
        )
        
        resolved_tickets = all_tickets_qs.filter(done_filter).filter(
            # User is assignee OR (user is reporter AND no assignees)
            Q(assignees=user) | (Q(reporter=user) & ~Exists(has_assignees_subquery))
        ).distinct()
        
        # Apply date filters to resolved tickets based on completion_date
        if date_from:
            resolved_tickets = resolved_tickets.filter(completion_date__gte=date_from)
        if date_to:
            resolved_tickets = resolved_tickets.filter(completion_date__lte=date_to)
        
        tickets_resolved = resolved_tickets.count()
        
        # Average resolution time (hours)
        resolution_times = []
        for ticket in resolved_tickets.filter(done_at__isnull=False):
            if ticket.done_at and ticket.created_at:
                delta = ticket.done_at - ticket.created_at
                resolution_times.append(delta.total_seconds() / 3600)  # Convert to hours
        
        avg_resolution_hours = (
            sum(resolution_times) / len(resolution_times) 
            if resolution_times else None
        )
        
        # Average rating from customer feedback
        avg_rating = resolved_tickets.filter(
            resolution_rating__isnull=False
        ).aggregate(avg=Avg('resolution_rating'))['avg']

        # First response time - avg time from ticket creation to first assignment of the user
        # Uses TicketHistory field='assignees' where new_value contains the user's username
        first_response_times = []
        for ticket in resolved_tickets:
            if not ticket.created_at:
                continue
            first_assign = TicketHistory.objects.filter(
                ticket=ticket,
                field='assignees',
                new_value__icontains=user.username,
            ).exclude(new_value='').order_by('created_at').first()
            if first_assign:
                delta = (first_assign.created_at - ticket.created_at).total_seconds() / 3600
                first_response_times.append(delta)
        avg_first_response_hours = (
            sum(first_response_times) / len(first_response_times)
            if first_response_times else None
        )

        # SLA compliance rate - % of resolved tickets done before due date
        resolved_with_due = resolved_tickets.filter(
            due_date__isnull=False, done_at__isnull=False
        )
        total_with_due = resolved_with_due.count()
        compliant = resolved_with_due.filter(done_at__date__lte=F('due_date')).count()
        sla_compliance_rate = (
            (compliant / total_with_due * 100) if total_with_due > 0 else None
        )

        # Reopen rate - % of resolved tickets that were reopened (Done column → non-Done column)
        # History tracks column changes with field='column' and column names as values
        done_column_names = list(
            Column.objects.filter(
                project_id=project_id,
                name__in=[s.name for s in Status.objects.filter(category=StatusCategory.DONE)]
            ).values_list('name', flat=True)
        )
        # Also include the literal "Done" if not already covered
        if 'Done' not in done_column_names:
            done_column_names.append('Done')
        reopened_count = 0
        total_resolved_for_reopen = resolved_tickets.count()
        if total_resolved_for_reopen > 0:
            for ticket in resolved_tickets:
                was_reopened = TicketHistory.objects.filter(
                    ticket=ticket,
                    field='column',
                    old_value__in=done_column_names
                ).exclude(new_value__in=done_column_names).exists()
                if was_reopened:
                    reopened_count += 1
        reopen_rate = (
            (reopened_count / total_resolved_for_reopen * 100)
            if total_resolved_for_reopen > 0 else None
        )

        return {
            'user_id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'tickets_created': tickets_created,
            'tickets_resolved': tickets_resolved,
            'avg_resolution_hours': round(avg_resolution_hours, 2) if avg_resolution_hours is not None else None,
            'avg_customer_rating': round(avg_rating, 2) if avg_rating is not None else None,
            'avg_first_response_hours': round(avg_first_response_hours, 2) if avg_first_response_hours is not None else None,
            'sla_compliance_rate': round(sla_compliance_rate, 1) if sla_compliance_rate is not None else None,
            'reopen_rate': round(reopen_rate, 1) if reopen_rate is not None else None,
        }
    
    def _parse_date_filters(self, request):
        """Parse date_from and date_to from query params."""
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if date_from:
            try:
                date_from = timezone.datetime.strptime(date_from, '%Y-%m-%d')
                date_from = timezone.make_aware(date_from)
            except ValueError:
                date_from = None
        
        if date_to:
            try:
                date_to = timezone.datetime.strptime(date_to, '%Y-%m-%d')
                date_to = timezone.make_aware(date_to)
                # Include the entire day
                date_to = date_to + timedelta(days=1)
            except ValueError:
                date_to = None
        
        return date_from, date_to
    
    @action(detail=False, methods=['get'], url_path='user-metrics')
    def user_metrics(self, request):
        """
        Get per-user KPI metrics.
        
        Superadmin/manager can see all users in their projects.
        Admin/user can only see their own metrics.
        
        Query params:
            - project: Required - Project ID
            - date_from: Optional - Filter start date (YYYY-MM-DD)
            - date_to: Optional - Filter end date (YYYY-MM-DD)
            - user_id: Optional - Specific user ID (superadmin/manager only)
        """
        project_id = request.query_params.get('project')
        user_id = request.query_params.get('user_id')
        date_from, date_to = self._parse_date_filters(request)
        
        if not project_id:
            return Response(
                {'error': 'project parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is member of this project
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check project membership
        if not (request.user.is_superuser or 
                project.members.filter(id=request.user.id).exists() or
                UserRole.objects.filter(user=request.user, project=project).exists()):
            return Response(
                {'error': 'You do not have access to this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        can_view_all = self._can_view_all_metrics(request.user, project_id)
        
        # If user_id specified and user can view all, get that user's metrics
        if user_id and can_view_all:
            try:
                target_user = User.objects.get(id=user_id)
                metrics = self._calculate_user_metrics(target_user, project_id, date_from, date_to)
                return Response(metrics)
            except User.DoesNotExist:
                return Response(
                    {'error': 'User not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # If can view all, return all project members' metrics
        if can_view_all:
            members = project.members.all()
            results = []
            for member in members:
                metrics = self._calculate_user_metrics(member, project_id, date_from, date_to)
                results.append(metrics)
            
            # Sort by tickets_resolved descending
            results.sort(key=lambda x: x['tickets_resolved'] or 0, reverse=True)
            return Response(results)
        
        # Otherwise, return only current user's metrics
        metrics = self._calculate_user_metrics(request.user, project_id, date_from, date_to)
        return Response([metrics])
    
    @action(detail=False, methods=['get'], url_path='my-metrics')
    def my_metrics(self, request):
        """
        Get current user's own KPI metrics across all their projects.
        
        Query params:
            - project: Optional - Filter by specific project ID
            - date_from: Optional - Filter start date (YYYY-MM-DD)
            - date_to: Optional - Filter end date (YYYY-MM-DD)
        """
        project_id = request.query_params.get('project')
        date_from, date_to = self._parse_date_filters(request)
        
        if project_id:
            # Single project metrics
            try:
                project = Project.objects.get(id=project_id)
            except Project.DoesNotExist:
                return Response(
                    {'error': 'Project not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            metrics = self._calculate_user_metrics(request.user, project_id, date_from, date_to)
            metrics['project_id'] = project.id
            metrics['project_name'] = project.name
            metrics['project_key'] = project.key
            # Include role for frontend tab visibility
            role = self._get_user_role_in_project(request.user, project_id)
            metrics['role'] = role
            return Response(metrics)
        
        # All projects user is member of
        user_roles = UserRole.objects.filter(user=request.user).select_related('project')
        results = []
        
        for role in user_roles:
            metrics = self._calculate_user_metrics(request.user, role.project.id, date_from, date_to)
            metrics['project_id'] = role.project.id
            metrics['project_name'] = role.project.name
            metrics['project_key'] = role.project.key
            metrics['role'] = role.role
            results.append(metrics)
        
        return Response(results)
    
    @action(detail=False, methods=['get'], url_path='project-summary')
    def project_summary(self, request):
        """
        Get aggregate project KPIs (superadmin/admin/manager only).
        
        Provides high-level project statistics:
        - Total tickets
        - Tickets by status category
        - Average resolution time
        - Overdue tickets
        - Top performers
        
        Query params:
            - project: Required - Project ID
            - date_from: Optional - Filter start date (YYYY-MM-DD)
            - date_to: Optional - Filter end date (YYYY-MM-DD)
        """
        project_id = request.query_params.get('project')
        date_from, date_to = self._parse_date_filters(request)
        
        if not project_id:
            return Response(
                {'error': 'project parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check project access
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check role - only superadmin/admin/manager can see project summary
        role = self._get_user_role_in_project(request.user, project_id)
        if not request.user.is_superuser and role not in ['superadmin', 'admin', 'manager']:
            return Response(
                {'error': 'You do not have permission to view project summary'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Base querysets - include archived for totals/completed metrics
        all_tickets_qs = Ticket.objects.filter(project_id=project_id)
        active_tickets_qs = Ticket.objects.filter(project_id=project_id, is_archived=False)
        
        if date_from:
            all_tickets_qs = all_tickets_qs.filter(created_at__gte=date_from)
            active_tickets_qs = active_tickets_qs.filter(created_at__gte=date_from)
        if date_to:
            all_tickets_qs = all_tickets_qs.filter(created_at__lte=date_to)
            active_tickets_qs = active_tickets_qs.filter(created_at__lte=date_to)
        
        # Total tickets (including archived - represents all work)
        total_tickets = all_tickets_qs.count()
        
        # Tickets by status category - for active tickets only (shows current state)
        by_category = {
            'todo': active_tickets_qs.filter(ticket_status__category=StatusCategory.TODO).count(),
            'in_progress': active_tickets_qs.filter(ticket_status__category=StatusCategory.IN_PROGRESS).count(),
            # Done count includes archived tickets (completed work)
            'done': all_tickets_qs.filter(
                Q(ticket_status__category=StatusCategory.DONE) | Q(is_archived=True)
            ).count(),
        }
        
        # Tickets by priority (all tickets)
        by_priority = {
            'low': all_tickets_qs.filter(priority_id=1).count(),
            'medium': all_tickets_qs.filter(priority_id=2).count(),
            'high': all_tickets_qs.filter(priority_id=3).count(),
            'critical': all_tickets_qs.filter(priority_id=4).count(),
        }
        
        # Average resolution time - include archived (they have done_at)
        resolved = all_tickets_qs.filter(
            done_at__isnull=False
        ).filter(
            Q(ticket_status__category=StatusCategory.DONE) | Q(is_archived=True)
        )
        resolution_times = []
        for ticket in resolved:
            if ticket.done_at and ticket.created_at:
                delta = ticket.done_at - ticket.created_at
                resolution_times.append(delta.total_seconds() / 3600)
        
        avg_resolution_hours = (
            sum(resolution_times) / len(resolution_times) 
            if resolution_times else None
        )
        
        # Overdue count - only active (non-archived) tickets
        overdue_count = active_tickets_qs.filter(
            due_date__lt=timezone.now().date()
        ).exclude(
            ticket_status__category=StatusCategory.DONE
        ).count()
        
        # Unassigned tickets - only active
        unassigned_count = active_tickets_qs.annotate(
            assignee_count=Count('assignees')
        ).filter(assignee_count=0).exclude(
            ticket_status__category=StatusCategory.DONE
        ).count()
        
        # Average customer rating - include archived (completed work has ratings)
        avg_customer_rating = all_tickets_qs.filter(
            resolution_rating__isnull=False
        ).aggregate(avg=Avg('resolution_rating'))['avg']
        
        # Top performers (top 5 by resolved tickets) - include archived
        members = project.members.all()
        performer_metrics = []
        for member in members:
            resolved_count = all_tickets_qs.filter(
                assignees=member
            ).filter(
                Q(ticket_status__category=StatusCategory.DONE) | Q(is_archived=True)
            ).count()
            performer_metrics.append({
                'user_id': member.id,
                'username': member.username,
                'first_name': member.first_name,
                'last_name': member.last_name,
                'tickets_resolved': resolved_count,
            })
        
        performer_metrics.sort(key=lambda x: x['tickets_resolved'], reverse=True)
        top_performers = performer_metrics[:5]
        
        return Response({
            'project_id': project.id,
            'project_name': project.name,
            'project_key': project.key,
            'total_tickets': total_tickets,
            'tickets_by_category': by_category,
            'tickets_by_priority': by_priority,
            'avg_resolution_hours': round(avg_resolution_hours, 2) if avg_resolution_hours else None,
            'overdue_count': overdue_count,
            'unassigned_count': unassigned_count,
            'avg_customer_rating': round(avg_customer_rating, 2) if avg_customer_rating else None,
            'top_performers': top_performers,
        })
    
    @action(detail=False, methods=['get'], url_path='my-tickets')
    def my_tickets(self, request):
        """
        Get list of tickets resolved by the current user with timing details.
        
        Returns tickets where the user was an assignee and ticket is in Done status.
        Includes timing information for each ticket.
        
        Query params:
            - project: Required - Project ID
            - date_from: Optional - Filter start date (YYYY-MM-DD)
            - date_to: Optional - Filter end date (YYYY-MM-DD)
            - limit: Optional - Max results (default 50)
        """
        project_id = request.query_params.get('project')
        date_from, date_to = self._parse_date_filters(request)
        limit = int(request.query_params.get('limit', 50))
        
        if not project_id:
            return Response(
                {'error': 'project parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify project exists and user has access
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check project membership
        if not (request.user.is_superuser or 
                project.members.filter(id=request.user.id).exists() or
                UserRole.objects.filter(user=request.user, project=project).exists()):
            return Response(
                {'error': 'You do not have access to this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get resolved tickets where user was assignee or reporter (if no assignees)
        # INCLUDE archived tickets - they represent completed work that should count toward KPIs
        # A ticket is considered "resolved" if it's in Done status OR has been archived
        #
        # We count tickets where:
        # 1. User is an assignee (worked on it), OR
        # 2. User is the reporter AND there are no assignees (they handled it themselves)
        from django.db.models import Exists, OuterRef
        
        done_filter = Q(ticket_status__category=StatusCategory.DONE) | Q(is_archived=True)
        
        # Subquery to check if ticket has any assignees
        has_assignees_subquery = Ticket.objects.filter(
            id=OuterRef('id'),
            assignees__isnull=False
        )
        
        tickets_qs = Ticket.objects.filter(
            project_id=project_id,
        ).filter(done_filter).filter(
            # User is assignee OR (user is reporter AND no assignees)
            Q(assignees=request.user) | (Q(reporter=request.user) & ~Exists(has_assignees_subquery))
        ).distinct().select_related('ticket_status').prefetch_related('assignees')

        # Use annotated completion date for filtering and sorting
        # Fall back to archived_at, then updated_at if done_at is NULL
        tickets_qs = tickets_qs.annotate(
            completion_date=Coalesce('done_at', 'archived_at', 'updated_at')
        ).order_by('-completion_date')
        
        if date_from:
            # Filter by completion date (done_at OR archived_at OR updated_at)
            tickets_qs = tickets_qs.filter(completion_date__gte=date_from)
        if date_to:
            tickets_qs = tickets_qs.filter(completion_date__lte=date_to)
        
        tickets_qs = tickets_qs[:limit]

        # Pre-compute done column names for reopen detection
        done_column_names = list(
            Column.objects.filter(
                project_id=project_id,
                name__in=[s.name for s in Status.objects.filter(category=StatusCategory.DONE)]
            ).values_list('name', flat=True)
        )
        if 'Done' not in done_column_names:
            done_column_names.append('Done')

        results = []
        for ticket in tickets_qs:
            # Calculate resolution time
            resolution_hours = None
            if ticket.done_at and ticket.created_at:
                delta = ticket.done_at - ticket.created_at
                resolution_hours = round(delta.total_seconds() / 3600, 2)

            # SLA compliance: done before due date?
            sla_met = None
            if ticket.due_date and ticket.done_at:
                sla_met = ticket.done_at.date() <= ticket.due_date

            # Reopen detection
            was_reopened = TicketHistory.objects.filter(
                ticket=ticket,
                field='column',
                old_value__in=done_column_names
            ).exclude(new_value__in=done_column_names).exists()

            # First response time - time from creation to first assignment of the current user
            first_response_hours = None
            if ticket.created_at:
                first_assign = TicketHistory.objects.filter(
                    ticket=ticket,
                    field='assignees',
                    new_value__icontains=request.user.username,
                ).exclude(new_value='').order_by('created_at').first()
                if first_assign:
                    first_response_hours = round(
                        (first_assign.created_at - ticket.created_at).total_seconds() / 3600, 2
                    )

            # Priority colors based on level
            priority_colors = {1: '#52c41a', 2: '#1890ff', 3: '#faad14', 4: '#f5222d'}

            results.append({
                'ticket_id': ticket.id,
                'key': ticket.ticket_key,
                'name': ticket.name,
                'priority': {
                    'id': ticket.priority_id,
                    'name': ticket.get_priority_id_display(),
                    'color': priority_colors.get(ticket.priority_id, '#1890ff'),
                } if ticket.priority_id else None,
                'status': {
                    'id': ticket.ticket_status.id if ticket.ticket_status else None,
                    'name': ticket.ticket_status.name if ticket.ticket_status else None,
                    'color': ticket.ticket_status.color if ticket.ticket_status else None,
                } if ticket.ticket_status else None,
                'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
                'done_at': ticket.done_at.isoformat() if ticket.done_at else None,
                'due_date': ticket.due_date.isoformat() if ticket.due_date else None,
                'resolution_hours': resolution_hours,
                'customer_rating': ticket.resolution_rating,
                'resolution_status': ticket.resolution_status,
                'sla_met': sla_met,
                'was_reopened': was_reopened,
                'first_response_hours': first_response_hours,
            })
        
        return Response({
            'count': len(results),
            'results': results,
        })
    
    @action(detail=False, methods=['get'], url_path='my-active')
    def my_active(self, request):
        """
        Get list of active tickets assigned to the current user.
        
        Returns tickets where the user is an assignee and ticket is NOT in Done status.
        
        Query params:
            - project: Required - Project ID
            - limit: Optional - Max results (default 50)
        """
        project_id = request.query_params.get('project')
        limit = int(request.query_params.get('limit', 50))
        
        if not project_id:
            return Response(
                {'error': 'project parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify project exists and user has access
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check project membership
        if not (request.user.is_superuser or 
                project.members.filter(id=request.user.id).exists() or
                UserRole.objects.filter(user=request.user, project=project).exists()):
            return Response(
                {'error': 'You do not have access to this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get active tickets where user is assignee
        tickets_qs = Ticket.objects.filter(
            project_id=project_id,
            assignees=request.user,
            is_archived=False
        ).exclude(
            ticket_status__category=StatusCategory.DONE
        ).select_related('ticket_status').order_by('due_date', '-created_at')
        
        tickets_qs = tickets_qs[:limit]
        
        results = []
        now = timezone.now()
        today = now.date()
        
        for ticket in tickets_qs:
            # Calculate days open
            days_open = None
            if ticket.created_at:
                delta = now - ticket.created_at
                days_open = delta.days
            
            # Check if overdue
            is_overdue = False
            days_until_due = None
            if ticket.due_date:
                if ticket.due_date < today:
                    is_overdue = True
                    days_until_due = (ticket.due_date - today).days  # Will be negative
                else:
                    days_until_due = (ticket.due_date - today).days
            
            # Priority colors based on level
            priority_colors = {1: '#52c41a', 2: '#1890ff', 3: '#faad14', 4: '#f5222d'}
            
            results.append({
                'ticket_id': ticket.id,
                'key': ticket.ticket_key,
                'name': ticket.name,
                'priority': {
                    'id': ticket.priority_id,
                    'name': ticket.get_priority_id_display(),
                    'color': priority_colors.get(ticket.priority_id, '#1890ff'),
                } if ticket.priority_id else None,
                'status': {
                    'id': ticket.ticket_status.id if ticket.ticket_status else None,
                    'name': ticket.ticket_status.name if ticket.ticket_status else None,
                    'color': ticket.ticket_status.color if ticket.ticket_status else None,
                    'category': ticket.ticket_status.category if ticket.ticket_status else None,
                } if ticket.ticket_status else None,
                'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
                'due_date': ticket.due_date.isoformat() if ticket.due_date else None,
                'days_open': days_open,
                'days_until_due': days_until_due,
                'is_overdue': is_overdue,
                'stale_hours': round((now - ticket.updated_at).total_seconds() / 3600, 2) if ticket.updated_at else None,
            })
        
        return Response({
            'count': len(results),
            'results': results,
        })

    @action(detail=False, methods=['get'], url_path='project-trends')
    def project_trends(self, request):
        """
        Get daily trend data for project KPIs.
        Can be filtered by user to get personal trends ("My Trends").
        
        Query params:
            - project: Required - Project ID
            - user_id: Optional - Filter by specific user (for personal charts)
            - days: Optional - Number of days to look back (default 30)
        """
        project_id = request.query_params.get('project')
        target_user_id = request.query_params.get('user_id')
        
        try:
            days = int(request.query_params.get('days', 30))
        except ValueError:
            days = 30
            
        if not project_id:
            return Response(
                {'error': 'project parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Check project access
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Check permission:
        # - If viewing project-wide trends (no user_id): Need admin/manager role
        # - If viewing personal trends (user_id provided):
        #   - Can view own trends
        #   - Admin/manager can view anyone's trends
        
        current_role = self._get_user_role_in_project(request.user, project_id)
        is_manager = request.user.is_superuser or current_role in ['superadmin', 'admin', 'manager']
        
        if target_user_id:
            # Viewing for specific user
            if str(target_user_id) != str(request.user.id) and not is_manager:
                 return Response(
                    {'error': 'You do not have permission to view these metrics'},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            # Viewing project-wide
            if not is_manager:
                return Response(
                    {'error': 'You do not have permission to view project trends'},
                    status=status.HTTP_403_FORBIDDEN
                )

        
        # Calculate date range
        end_date = timezone.now().date() + timedelta(days=1)
        start_date = end_date - timedelta(days=days)
        
        dates = [start_date + timedelta(days=x) for x in range(days)]
        results = []
        
        # Include archived tickets - they represent completed work that should appear in trends
        tickets_qs = Ticket.objects.filter(project_id=project_id)
        
        if target_user_id:
             # Filter for specific user
             # Created: tickets they reported? or tickets they are assigned to? 
             # Usually "My Performance" = tickets I resolved.
             # "Tickets Created" -> Tickets where reporter = user
             # BUT usually KPI charts show "Work done".
             # Let's stick to:
             # - Created: Tickets assigned to them (Workload incoming) OR Tickets they reported?
             #   Let's use "Assigned To" for 'Incoming Work' context if filtering by user, 
             #   OR stick to "Created by" if strictly following "Tickets Created".
             #   Reflecting on typical dashboards: "My Output" is Resolved. "My Input" is Assigned.
             #   However, to keep consistent with "Tickets Created" label, let's filter by reporter if that's the metric.
             #   Actually, for a "Performance" dashboard, "Assigned" is more relevant than "Reported".
             #   Let's check the existing metrics. `user_metrics` uses `tickets_created` (reported) and `tickets_resolved` (done).
             #   So we will use Reporter for Created, and Assignee for Resolved.
             pass

        for date_obj in dates:
            day_start = timezone.make_aware(timezone.datetime.combine(date_obj, timezone.datetime.min.time()))
            day_end = timezone.make_aware(timezone.datetime.combine(date_obj, timezone.datetime.max.time()))
            
            # Base filters
            created_filter = {'created_at__range': (day_start, day_end)}
            resolved_filter = {
                'done_at__range': (day_start, day_end), 
                'ticket_status__category': StatusCategory.DONE
            }

            if target_user_id:
                # For personal metrics:
                # Created -> Tickets Reported by user
                # Resolved -> Tickets Assigned to user that are done
                # Ensure we use the correct field names for the Ticket model
                # Assuming 'created_by' (reporter) and 'assigned_to' (assignee)
                try:
                    uid = int(target_user_id)
                    created_filter['created_by_id'] = uid
                    resolved_filter['assigned_to_id'] = uid
                except (ValueError, TypeError):
                    pass # Ignore invalid user_id
            
            # Created count
            created_count = tickets_qs.filter(**created_filter).count()
            
            # Resolved count & time
            resolved_in_day = tickets_qs.filter(**resolved_filter)
            resolved_count = resolved_in_day.count()
            
            resolution_times = []
            for t in resolved_in_day:
                if t.created_at and t.done_at:
                    delta = t.done_at - t.created_at
                    resolution_times.append(delta.total_seconds() / 3600)
            
            avg_time = (sum(resolution_times) / len(resolution_times)) if resolution_times else 0
            
            results.append({
                'date': date_obj.strftime('%Y-%m-%d'),
                'created': created_count,
                'resolved': resolved_count,
                'avg_resolution_hours': round(avg_time, 2)
            })
            
        return Response(results)

    # ========================================================================
    # KPI Builder Endpoints
    # ========================================================================

    @action(detail=False, methods=['get'], url_path='available-indicators')
    def available_indicators(self, request):
        """List all available KPI indicator definitions."""
        indicators = []
        for key, meta in AVAILABLE_INDICATORS.items():
            indicators.append({
                'key': key,
                'name': meta['name'],
                'description': meta['description'],
                'formula': meta.get('formula', ''),
                'higher_is_better': meta['higher_is_better'],
                'unit': meta['unit'],
                'config': meta.get('config', {}),
            })
        return Response(indicators)

    @action(detail=False, methods=['get'], url_path='config')
    def kpi_config(self, request):
        """Get the KPI configuration for a project."""
        project_id = request.query_params.get('project')
        if not project_id:
            return Response(
                {'error': 'project parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Any project member can read the config
        if not (request.user.is_superuser or
                project.members.filter(id=request.user.id).exists() or
                UserRole.objects.filter(user=request.user, project=project).exists()):
            return Response(
                {'error': 'You do not have access to this project'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            config = KPIConfig.objects.prefetch_related('indicators').get(project=project)
            serializer = KPIConfigSerializer(config)
            return Response(serializer.data)
        except KPIConfig.DoesNotExist:
            return Response(
                {'detail': 'No KPI configuration for this project'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'], url_path='config/save')
    def save_kpi_config(self, request):
        """Create or update KPI configuration for a project. Superadmin only."""
        serializer = KPIConfigCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_id = serializer.validated_data['project']
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Only superadmin can save config
        role = self._get_user_role_in_project(request.user, project_id)
        if role != 'superadmin' and not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmins can configure KPIs'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Upsert config
        config, _ = KPIConfig.objects.update_or_create(
            project=project,
            defaults={
                'name': serializer.validated_data.get('name', 'Default KPI Configuration'),
                'created_by': request.user,
            }
        )

        # Replace all indicators
        KPIIndicator.objects.filter(config=config).delete()
        indicators_data = serializer.validated_data['indicators']
        for idx, item in enumerate(indicators_data):
            KPIIndicator.objects.create(
                config=config,
                metric_key=item['metric_key'],
                weight=item.get('weight', 10),
                is_active=item.get('is_active', True),
                order=idx,
                threshold_green=item.get('threshold_green'),
                threshold_red=None,  # Derived at scoring time from config type
            )

        # Return the saved config
        config.refresh_from_db()
        result = KPIConfigSerializer(config).data
        return Response(result, status=status.HTTP_200_OK)

    def _derive_bounds(self, indicator, meta):
        """
        Derive green (100%) and red (0%) bounds from the indicator's
        stored config value and the indicator config type.

        Returns (green, red) tuple or (None, None) if not configured.
        """
        config_value = indicator.threshold_green  # Single user-facing value
        if config_value is None:
            return None, None

        config = meta.get('config', {})
        config_type = config.get('type', 'target')

        if config_type == 'target':
            # "Achieve X" → green=X, red=0
            return config_value, 0
        elif config_type == 'sla':
            # "Under X hours" → green=X, red=X*3
            return config_value, config_value * 3
        elif config_type == 'min_rating':
            # "At least X stars" → green=X, red=1.0
            return config_value, 1.0
        elif config_type == 'min_percent':
            # "At least X%" → green=X, red=0
            return config_value, 0
        elif config_type == 'max_count':
            # "Max X allowed" → 0=100%, X=0%; each overdue costs equal share
            # Zero tolerance: 0=100%, 1+=0%
            if config_value == 0:
                return 0, 1
            return 0, config_value
        elif config_type == 'max_capacity':
            # "Under X" → green=0, red=X
            return 0, config_value
        elif config_type == 'max_percent':
            # "Max X% allowed" → 0%=100% score, X%=0% score
            return 0, config_value

        return None, None

    def _normalize_metric(self, value, meta, all_values, indicator=None):
        """
        Normalize a metric value to 0-1 range.

        If the indicator has a configured threshold value, derives scoring bounds
        from the config type and uses linear interpolation.
        Otherwise falls back to team-relative normalization strategies.
        """
        if value is None:
            return 0.0

        # Absolute threshold normalization (superadmin-configured)
        if indicator and indicator.threshold_green is not None:
            green, red = self._derive_bounds(indicator, meta)
            if green is not None and red is not None:
                if green == red:
                    return 1.0 if value == green else 0.0
                normalized = (value - red) / (green - red)
                return max(0.0, min(normalized, 1.0))

        # Legacy team-relative normalization
        strategy = meta['normalization']

        if strategy == 'percentage':
            return max(0, min(value / 100.0, 1.0))

        if strategy == 'fixed_range':
            min_val = meta.get('min_value', 0)
            max_val = meta.get('max_value', 5)
            if max_val == min_val:
                return 0.0
            return max(0.0, min((value - min_val) / (max_val - min_val), 1.0))

        # Team-relative strategies need non-None values
        non_none = [v for v in all_values if v is not None]
        if not non_none:
            return 0.0

        if strategy == 'team_max':
            team_max = max(non_none)
            return (value / team_max) if team_max > 0 else 0.0

        if strategy == 'team_max_inverted':
            team_max = max(non_none)
            if team_max == 0:
                return 1.0  # No one has any - perfect
            return 1.0 - (value / team_max)

        if strategy == 'team_min_max':
            # Lower is better: best = min, worst = max
            team_min = min(non_none)
            team_max = max(non_none)
            if team_max == team_min:
                return 1.0  # Everyone equal
            return (team_max - value) / (team_max - team_min)

        return 0.0

    @action(detail=False, methods=['get'], url_path='scoreboard')
    def scoreboard(self, request):
        """
        Compute weighted KPI scores for all project members.
        Superadmin and manager only.
        """
        project_id = request.query_params.get('project')
        if not project_id:
            return Response(
                {'error': 'project parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not self._can_view_all_metrics(request.user, project_id):
            return Response(
                {'error': 'Only superadmins and managers can view the scoreboard'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get config
        try:
            config = KPIConfig.objects.prefetch_related('indicators').get(project=project)
        except KPIConfig.DoesNotExist:
            return Response(
                {'error': 'No KPI configuration exists for this project. A superadmin must configure it first.'},
                status=status.HTTP_404_NOT_FOUND
            )

        active_indicators = list(config.indicators.filter(is_active=True))
        if not active_indicators:
            return Response(
                {'error': 'No active indicators in the KPI configuration'},
                status=status.HTTP_400_BAD_REQUEST
            )

        date_from, date_to = self._parse_date_filters(request)

        # Only include superadmins and admins in the scoreboard
        admin_role_user_ids = UserRole.objects.filter(
            project=project,
            role__in=['superadmin', 'admin']
        ).values_list('user_id', flat=True)
        members = project.members.filter(id__in=admin_role_user_ids)
        member_metrics = {}
        for member in members:
            member_metrics[member.id] = {
                'user_id': member.id,
                'username': member.username,
                'first_name': member.first_name,
                'last_name': member.last_name,
                'raw': self._calculate_user_metrics(member, project_id, date_from, date_to),
            }

        # For each active indicator, collect all raw values for normalization
        raw_values_by_metric = {}
        for indicator in active_indicators:
            key = indicator.metric_key
            raw_values_by_metric[key] = [
                m['raw'].get(key) for m in member_metrics.values()
            ]

        # Compute scores
        total_weight = sum(ind.weight for ind in active_indicators)
        results = []
        for member_id, data in member_metrics.items():
            indicator_scores = []
            total_score = 0.0

            for indicator in active_indicators:
                key = indicator.metric_key
                meta = AVAILABLE_INDICATORS.get(key, {})
                raw_value = data['raw'].get(key)
                normalized = self._normalize_metric(
                    raw_value, meta, raw_values_by_metric[key], indicator=indicator
                )
                weighted = normalized * indicator.weight
                total_score += weighted

                indicator_scores.append({
                    'metric_key': key,
                    'raw_value': raw_value,
                    'normalized': round(normalized, 4),
                    'weight': indicator.weight,
                    'weighted_score': round(weighted, 2),
                })

            score_pct = (total_score / total_weight * 100) if total_weight > 0 else 0

            results.append({
                'user_id': data['user_id'],
                'username': data['username'],
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'total_score': round(total_score, 2),
                'score_percentage': round(score_pct, 1),
                'indicators': indicator_scores,
            })

        # Sort by total_score descending and assign rank
        results.sort(key=lambda x: x['total_score'], reverse=True)
        for idx, r in enumerate(results):
            r['rank'] = idx + 1

        return Response({
            'config_name': config.name,
            'total_weight': total_weight,
            'team_size': len(results),
            'active_indicators': [
                {
                    'metric_key': ind.metric_key,
                    'name': AVAILABLE_INDICATORS.get(ind.metric_key, {}).get('name', ind.metric_key),
                    'weight': ind.weight,
                    'higher_is_better': AVAILABLE_INDICATORS.get(ind.metric_key, {}).get('higher_is_better', True),
                }
                for ind in active_indicators
            ],
            'scores': results,
        })

    @action(detail=False, methods=['get'], url_path='scoreboard-members')
    def scoreboard_members(self, request):
        """
        Return list of users with superadmin/admin roles in the project.
        Used for the user selector dropdown. Superadmin/manager only.
        """
        project_id = request.query_params.get('project')
        if not project_id:
            return Response(
                {'error': 'project parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not self._can_view_all_metrics(request.user, project_id):
            return Response(
                {'error': 'Only superadmins and managers can view scoreboard members'},
                status=status.HTTP_403_FORBIDDEN
            )

        roles = UserRole.objects.filter(
            project=project,
            role__in=['superadmin', 'admin']
        ).select_related('user')

        members = [
            {
                'id': r.user.id,
                'username': r.user.username,
                'first_name': r.user.first_name,
                'last_name': r.user.last_name,
                'role': r.role,
            }
            for r in roles
        ]

        return Response(members)

    @action(detail=False, methods=['get'], url_path='my-score')
    def my_score(self, request):
        """
        Get the current user's personal KPI score with per-indicator breakdown.
        Returns normalized and weighted scores using the project's KPI config.
        """
        project_id = request.query_params.get('project')
        if not project_id:
            return Response(
                {'error': 'project parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Any project member can view their own score
        if not (request.user.is_superuser or
                project.members.filter(id=request.user.id).exists() or
                UserRole.objects.filter(user=request.user, project=project).exists()):
            return Response(
                {'error': 'You do not have access to this project'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            config = KPIConfig.objects.prefetch_related('indicators').get(project=project)
        except KPIConfig.DoesNotExist:
            return Response(
                {'detail': 'No KPI configuration for this project'},
                status=status.HTTP_404_NOT_FOUND
            )

        active_indicators = list(config.indicators.filter(is_active=True))
        if not active_indicators:
            return Response(
                {'error': 'No active indicators in the KPI configuration'},
                status=status.HTTP_400_BAD_REQUEST
            )

        date_from, date_to = self._parse_date_filters(request)

        # Determine target user: allow superadmins/managers to view other users
        target_user = request.user
        requested_user_id = request.query_params.get('user_id')
        if requested_user_id:
            if self._can_view_all_metrics(request.user, project_id):
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    target_user = User.objects.get(id=requested_user_id)
                except User.DoesNotExist:
                    return Response(
                        {'error': 'User not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            # Non-privileged users silently ignore user_id param

        # Calculate target user's metrics
        my_metrics = self._calculate_user_metrics(target_user, project_id, date_from, date_to)

        # For team-relative normalization, collect all members' raw values
        members = project.members.all()
        all_member_metrics = {}
        for member in members:
            all_member_metrics[member.id] = self._calculate_user_metrics(
                member, project_id, date_from, date_to
            )

        raw_values_by_metric = {}
        for indicator in active_indicators:
            key = indicator.metric_key
            raw_values_by_metric[key] = [
                m.get(key) for m in all_member_metrics.values()
            ]

        # Compute scores for current user
        total_weight = sum(ind.weight for ind in active_indicators)
        indicator_scores = []
        total_score = 0.0

        def _score_color(normalized_val):
            if normalized_val is None:
                return '#BDC3C7'
            if normalized_val >= 0.7:
                return '#27AE60'
            if normalized_val >= 0.4:
                return '#F39C12'
            return '#E74C3C'

        for indicator in active_indicators:
            key = indicator.metric_key
            meta = AVAILABLE_INDICATORS.get(key, {})
            raw_value = my_metrics.get(key)
            normalized = self._normalize_metric(
                raw_value, meta, raw_values_by_metric[key], indicator=indicator
            )
            weighted = normalized * indicator.weight
            total_score += weighted

            indicator_scores.append({
                'metric_key': key,
                'name': meta.get('name', key),
                'description': meta.get('description', ''),
                'formula': meta.get('formula', ''),
                'higher_is_better': meta.get('higher_is_better', True),
                'unit': meta.get('unit', ''),
                'weight': indicator.weight,
                'raw_value': raw_value,
                'normalized': round(normalized, 4),
                'weighted_score': round(weighted, 2),
                'color': _score_color(normalized if raw_value is not None else None),
            })

        score_pct = (total_score / total_weight * 100) if total_weight > 0 else 0

        return Response({
            'total_score': round(total_score, 2),
            'total_weight': total_weight,
            'score_percentage': round(score_pct, 1),
            'indicators': indicator_scores,
        })

