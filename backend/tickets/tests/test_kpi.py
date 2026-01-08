"""
Test cases for KPI endpoints and User Reviews.
"""
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import timedelta

from tickets.models import (
    Column, Company, Project, UserRole, Ticket, Status, StatusCategory, UserReview
)


class KPIUserMetricsTest(APITestCase):
    """Test KPI user metrics endpoint permissions and data."""
    
    def setUp(self):
        """Set up test data."""
        # Create test users
        self.superadmin = User.objects.create_user(
            username="superadmin",
            email="superadmin@example.com",
            password="password123"
        )
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@example.com",
            password="password123"
        )
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="password123"
        )
        self.regular_user = User.objects.create_user(
            username="regularuser",
            email="regularuser@example.com",
            password="password123"
        )
        
        # Create project
        self.project = Project.objects.create(key="TEST", name="Test Project")
        
        # Add members
        self.project.members.add(
            self.superadmin, self.manager, self.admin, self.regular_user
        )
        
        # Assign roles
        UserRole.objects.create(
            user=self.superadmin, project=self.project, role='superadmin'
        )
        UserRole.objects.create(
            user=self.manager, project=self.project, role='manager'
        )
        UserRole.objects.create(
            user=self.admin, project=self.project, role='admin'
        )
        UserRole.objects.create(
            user=self.regular_user, project=self.project, role='user'
        )
        
        # Get or create statuses (may already exist from migrations)
        self.status_open, _ = Status.objects.get_or_create(
            key='open', 
            defaults={'name': 'Open', 'category': StatusCategory.TODO}
        )
        self.status_done, _ = Status.objects.get_or_create(
            key='done', 
            defaults={'name': 'Done', 'category': StatusCategory.DONE}
        )
        
        # Create column for tickets
        self.column = Column.objects.create(
            name="To Do", project=self.project, order=0
        )
        
        self.client = APIClient()
    
    def test_superadmin_can_see_all_user_metrics(self):
        """Superadmin should see all user KPIs in their project."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(
            f'/api/tickets/kpi/user-metrics/?project={self.project.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        # Should see all 4 users
        self.assertEqual(len(response.data), 4)
        
    def test_manager_can_see_all_user_metrics(self):
        """Manager should see all user KPIs in their assigned project."""
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(
            f'/api/tickets/kpi/user-metrics/?project={self.project.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        # Should see all 4 users
        self.assertEqual(len(response.data), 4)
        
    def test_admin_cannot_see_other_user_metrics(self):
        """Admin should only see their own metrics."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(
            f'/api/tickets/kpi/user-metrics/?project={self.project.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        # Should only see their own metrics
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'admin')
        
    def test_user_cannot_see_other_user_metrics(self):
        """Regular user should only see their own metrics."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(
            f'/api/tickets/kpi/user-metrics/?project={self.project.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        # Should only see their own metrics
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'regularuser')
    
    def test_project_required_for_user_metrics(self):
        """Project parameter should be required."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/tickets/kpi/user-metrics/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_my_metrics_returns_own_data(self):
        """my-metrics should return current user's metrics."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(
            f'/api/tickets/kpi/my-metrics/?project={self.project.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'regularuser')
        # Should NOT include admin review data
        self.assertNotIn('avg_admin_rating', response.data)
        self.assertNotIn('total_admin_reviews', response.data)


class UserReviewAccessTest(APITestCase):
    """Test User Review access control - users cannot see their own reviews."""
    
    def setUp(self):
        """Set up test data."""
        # Create test users
        self.superadmin = User.objects.create_user(
            username="superadmin",
            email="superadmin@example.com",
            password="password123"
        )
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@example.com",
            password="password123"
        )
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="password123"
        )
        self.regular_user = User.objects.create_user(
            username="regularuser",
            email="regularuser@example.com",
            password="password123"
        )
        
        # Create project
        self.project = Project.objects.create(key="TEST", name="Test Project")
        
        # Add members
        self.project.members.add(
            self.superadmin, self.manager, self.admin, self.regular_user
        )
        
        # Assign roles
        UserRole.objects.create(
            user=self.superadmin, project=self.project, role='superadmin'
        )
        UserRole.objects.create(
            user=self.manager, project=self.project, role='manager'
        )
        UserRole.objects.create(
            user=self.admin, project=self.project, role='admin'
        )
        UserRole.objects.create(
            user=self.regular_user, project=self.project, role='user'
        )
        
        # Create a review of the regular user by the admin
        self.review = UserReview.objects.create(
            user=self.regular_user,
            reviewer=self.admin,
            project=self.project,
            rating=4,
            feedback="Good work on the ticket"
        )
        
        self.client = APIClient()
    
    def test_user_cannot_see_own_reviews(self):
        """Users should NOT be able to see reviews about themselves."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/tickets/user-reviews/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Regular user has no elevated role, should see empty list
        # Response is paginated, results are in 'results' key
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)
    
    def test_user_cannot_access_own_reviews_via_for_user_endpoint(self):
        """Users cannot access their own reviews via for-user endpoint."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(
            f'/api/tickets/user-reviews/for-user/{self.regular_user.id}/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_admin_can_create_review(self):
        """Admins should be able to create reviews for users."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/tickets/user-reviews/', {
            'user': self.manager.id,  # Reviewing the manager
            'project': self.project.id,
            'rating': 5,
            'feedback': 'Excellent management'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rating'], 5)
    
    def test_superadmin_can_create_review(self):
        """Superadmins should be able to create reviews for users."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.post('/api/tickets/user-reviews/', {
            'user': self.admin.id,
            'project': self.project.id,
            'rating': 3,
            'feedback': 'Room for improvement'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_regular_user_cannot_create_review(self):
        """Regular users should NOT be able to create reviews."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post('/api/tickets/user-reviews/', {
            'user': self.admin.id,
            'project': self.project.id,
            'rating': 2,
            'feedback': 'Should not work'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_manager_can_view_all_reviews(self):
        """Managers should see all reviews in their project."""
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(
            f'/api/tickets/user-reviews/?project={self.project.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is paginated, results are in 'results' key
        results = response.data.get('results', response.data)
        review_ids = [r['id'] for r in results]
        self.assertIn(self.review.id, review_ids)
    
    def test_superadmin_can_view_all_reviews(self):
        """Superadmins should see all reviews in their project."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(
            f'/api/tickets/user-reviews/?project={self.project.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is paginated, results are in 'results' key
        results = response.data.get('results', response.data)
        review_ids = [r['id'] for r in results]
        self.assertIn(self.review.id, review_ids)
    
    def test_cannot_review_yourself(self):
        """Users should not be able to review themselves."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/tickets/user-reviews/', {
            'user': self.admin.id,  # Trying to review self
            'project': self.project.id,
            'rating': 5,
            'feedback': 'Self-review should fail'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_reviewer_can_update_own_review(self):
        """Reviewer should be able to update their own review."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/tickets/user-reviews/{self.review.id}/',
            {'rating': 5, 'feedback': 'Updated feedback'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_other_user_cannot_update_review(self):
        """Other users should not be able to update reviews they didn't create."""
        self.client.force_authenticate(user=self.manager)
        response = self.client.patch(
            f'/api/tickets/user-reviews/{self.review.id}/',
            {'rating': 1}
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_superadmin_can_update_any_review(self):
        """Superadmin should be able to update any review."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.patch(
            f'/api/tickets/user-reviews/{self.review.id}/',
            {'rating': 2}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class KPIProjectSummaryTest(APITestCase):
    """Test KPI project summary endpoint."""
    
    def setUp(self):
        """Set up test data."""
        self.superadmin = User.objects.create_user(
            username="superadmin",
            email="superadmin@example.com",
            password="password123"
        )
        self.regular_user = User.objects.create_user(
            username="regularuser",
            email="regularuser@example.com",
            password="password123"
        )
        
        self.project = Project.objects.create(key="TEST", name="Test Project")
        self.project.members.add(self.superadmin, self.regular_user)
        
        UserRole.objects.create(
            user=self.superadmin, project=self.project, role='superadmin'
        )
        UserRole.objects.create(
            user=self.regular_user, project=self.project, role='user'
        )
        
        self.client = APIClient()
    
    def test_superadmin_can_access_project_summary(self):
        """Superadmin should be able to access project summary."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(
            f'/api/tickets/kpi/project-summary/?project={self.project.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_tickets', response.data)
        self.assertIn('tickets_by_category', response.data)
        self.assertIn('top_performers', response.data)
    
    def test_regular_user_cannot_access_project_summary(self):
        """Regular user should NOT be able to access project summary."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(
            f'/api/tickets/kpi/project-summary/?project={self.project.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UserReviewPendingPromptsTest(APITestCase):
    """Test the pending-prompts endpoint for review prompts."""
    
    def setUp(self):
        """Set up test data."""
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="password123"
        )
        self.worker = User.objects.create_user(
            username="worker",
            email="worker@example.com",
            password="password123"
        )
        self.regular_user = User.objects.create_user(
            username="regularuser",
            email="regularuser@example.com",
            password="password123"
        )
        
        self.project = Project.objects.create(key="TEST", name="Test Project")
        self.project.members.add(self.admin, self.worker, self.regular_user)
        
        UserRole.objects.create(user=self.admin, project=self.project, role='admin')
        UserRole.objects.create(user=self.worker, project=self.project, role='user')
        UserRole.objects.create(user=self.regular_user, project=self.project, role='user')
        
        # Get or create status (may already exist from migrations)
        self.status_done, _ = Status.objects.get_or_create(
            key='done', 
            defaults={'name': 'Done', 'category': StatusCategory.DONE}
        )
        
        # Create column
        self.column = Column.objects.create(name="Done", project=self.project, order=0)
        
        # Create a resolved ticket assigned to worker
        self.ticket = Ticket.objects.create(
            name="Resolved Ticket",
            project=self.project,
            column=self.column,
            ticket_status=self.status_done,
            done_at=timezone.now() - timedelta(days=1)
        )
        self.ticket.assignees.add(self.worker)
        
        self.client = APIClient()
    
    def test_admin_sees_pending_prompts(self):
        """Admin should see pending review prompts for resolved tickets."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(
            f'/api/tickets/user-reviews/pending-prompts/?project={self.project.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        # Should see prompt to review worker for the resolved ticket
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['user_id'], self.worker.id)
    
    def test_regular_user_cannot_see_pending_prompts(self):
        """Regular user should NOT be able to access pending prompts."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(
            f'/api/tickets/user-reviews/pending-prompts/?project={self.project.id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
