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
from .models import Ticket, Project, UserRole, UserReview, StatusCategory


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
        - overdue_count: Tickets past due date
        - acceptance_rate: % of resolutions accepted on first try
        - avg_rating: Average customer satisfaction rating
        - active_tickets: Currently assigned open tickets
        """
        # Base querysets for the project
        tickets_qs = Ticket.objects.filter(project_id=project_id, is_archived=False)
        
        # Apply date filters if provided
        if date_from:
            tickets_qs = tickets_qs.filter(created_at__gte=date_from)
        if date_to:
            tickets_qs = tickets_qs.filter(created_at__lte=date_to)
        
        # Tickets created by user
        tickets_created = tickets_qs.filter(reporter=user).count()
        
        # Tickets resolved by user (assigned to user and in Done status category)
        resolved_tickets = tickets_qs.filter(
            assignees=user,
            ticket_status__category=StatusCategory.DONE
        )
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
        
        # Overdue tickets (past due date, not in Done)
        overdue_count = tickets_qs.filter(
            assignees=user,
            due_date__lt=timezone.now().date()
        ).exclude(
            ticket_status__category=StatusCategory.DONE
        ).count()
        
        # Acceptance rate - tickets accepted on first try
        resolved_with_feedback = resolved_tickets.filter(
            resolution_status__in=['accepted', 'rejected']
        )
        accepted_first_try = resolved_tickets.filter(resolution_status='accepted').count()
        total_reviewed = resolved_with_feedback.count()
        acceptance_rate = (
            (accepted_first_try / total_reviewed * 100) 
            if total_reviewed > 0 else None
        )
        
        # Average rating from customer feedback
        avg_rating = resolved_tickets.filter(
            resolution_rating__isnull=False
        ).aggregate(avg=Avg('resolution_rating'))['avg']
        
        # Active tickets (assigned and not in Done)
        active_tickets = tickets_qs.filter(
            assignees=user
        ).exclude(
            ticket_status__category=StatusCategory.DONE
        ).count()
        
        # Get admin reviews for this user (only if viewer has permission)
        avg_admin_rating = UserReview.objects.filter(
            user=user,
            project_id=project_id
        ).aggregate(avg=Avg('rating'))['avg']
        
        total_reviews = UserReview.objects.filter(
            user=user,
            project_id=project_id
        ).count()
        
        return {
            'user_id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'tickets_created': tickets_created,
            'tickets_resolved': tickets_resolved,
            'avg_resolution_hours': round(avg_resolution_hours, 2) if avg_resolution_hours else None,
            'overdue_count': overdue_count,
            'acceptance_rate': round(acceptance_rate, 1) if acceptance_rate else None,
            'avg_customer_rating': round(avg_rating, 2) if avg_rating else None,
            'active_tickets': active_tickets,
            'avg_admin_rating': round(avg_admin_rating, 2) if avg_admin_rating else None,
            'total_admin_reviews': total_reviews,
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
            # Remove admin review data - users shouldn't see their own reviews
            metrics.pop('avg_admin_rating', None)
            metrics.pop('total_admin_reviews', None)
            metrics['project_id'] = project.id
            metrics['project_name'] = project.name
            metrics['project_key'] = project.key
            return Response(metrics)
        
        # All projects user is member of
        user_roles = UserRole.objects.filter(user=request.user).select_related('project')
        results = []
        
        for role in user_roles:
            metrics = self._calculate_user_metrics(request.user, role.project.id, date_from, date_to)
            # Remove admin review data - users shouldn't see their own reviews
            metrics.pop('avg_admin_rating', None)
            metrics.pop('total_admin_reviews', None)
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
        
        # Base queryset
        tickets_qs = Ticket.objects.filter(project_id=project_id, is_archived=False)
        
        if date_from:
            tickets_qs = tickets_qs.filter(created_at__gte=date_from)
        if date_to:
            tickets_qs = tickets_qs.filter(created_at__lte=date_to)
        
        # Total tickets
        total_tickets = tickets_qs.count()
        
        # Tickets by status category
        by_category = {
            'todo': tickets_qs.filter(ticket_status__category=StatusCategory.TODO).count(),
            'in_progress': tickets_qs.filter(ticket_status__category=StatusCategory.IN_PROGRESS).count(),
            'done': tickets_qs.filter(ticket_status__category=StatusCategory.DONE).count(),
        }
        
        # Tickets by priority
        by_priority = {
            'low': tickets_qs.filter(priority_id=1).count(),
            'medium': tickets_qs.filter(priority_id=2).count(),
            'high': tickets_qs.filter(priority_id=3).count(),
            'critical': tickets_qs.filter(priority_id=4).count(),
        }
        
        # Average resolution time
        resolved = tickets_qs.filter(
            done_at__isnull=False,
            ticket_status__category=StatusCategory.DONE
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
        
        # Overdue count
        overdue_count = tickets_qs.filter(
            due_date__lt=timezone.now().date()
        ).exclude(
            ticket_status__category=StatusCategory.DONE
        ).count()
        
        # Unassigned tickets
        unassigned_count = tickets_qs.annotate(
            assignee_count=Count('assignees')
        ).filter(assignee_count=0).exclude(
            ticket_status__category=StatusCategory.DONE
        ).count()
        
        # Average customer rating
        avg_customer_rating = tickets_qs.filter(
            resolution_rating__isnull=False
        ).aggregate(avg=Avg('resolution_rating'))['avg']
        
        # Top performers (top 5 by resolved tickets)
        members = project.members.all()
        performer_metrics = []
        for member in members:
            resolved_count = tickets_qs.filter(
                assignees=member,
                ticket_status__category=StatusCategory.DONE
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
        
        # Get resolved tickets where user was assignee
        tickets_qs = Ticket.objects.filter(
            project_id=project_id,
            assignees=request.user,
            ticket_status__category=StatusCategory.DONE,
            is_archived=False
        ).select_related('ticket_status').order_by('-done_at', '-updated_at')
        
        if date_from:
            tickets_qs = tickets_qs.filter(done_at__gte=date_from)
        if date_to:
            tickets_qs = tickets_qs.filter(done_at__lte=date_to)
        
        tickets_qs = tickets_qs[:limit]
        
        results = []
        for ticket in tickets_qs:
            # Calculate resolution time
            resolution_hours = None
            if ticket.done_at and ticket.created_at:
                delta = ticket.done_at - ticket.created_at
                resolution_hours = round(delta.total_seconds() / 3600, 2)
            
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
                'resolution_hours': resolution_hours,
                'customer_rating': ticket.resolution_rating,
                'resolution_status': ticket.resolution_status,
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
            })
        
        return Response({
            'count': len(results),
            'results': results,
        })

