"""
Test cases for company permissions, user creation, and project associations.
"""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from io import BytesIO

from tickets.models import Column, Company, Project, UserRole


class CompanyPermissionTests(APITestCase):
    """Test company visibility based on user roles and permissions."""
    
    def setUp(self):
        # Create users with different roles
        self.superuser = User.objects.create_superuser(
            username="superadmin",
            email="superadmin@example.com",
            password="password123"
        )
        self.it_admin = User.objects.create_user(
            username="itadmin",
            email="itadmin@example.com",
            password="password123"
        )
        self.company_user = User.objects.create_user(
            username="companyuser",
            email="companyuser@example.com",
            password="password123"
        )
        self.regular_user = User.objects.create_user(
            username="regularuser",
            email="regularuser@example.com",
            password="password123"
        )
        
        # Create projects
        self.project1 = Project.objects.create(key="P1", name="Project 1")
        self.project2 = Project.objects.create(key="P2", name="Project 2")
        
        # Create companies
        self.company1 = Company.objects.create(name="Company Alpha")
        self.company2 = Company.objects.create(name="Company Beta")
        self.company3 = Company.objects.create(name="Company Gamma")  # Not assigned to any project
        
        # Assign companies to projects
        self.project1.companies.add(self.company1)
        self.project2.companies.add(self.company2)
        
        # Assign IT admin to company1
        self.company1.admins.add(self.it_admin)
        
        # Assign company user to company1
        self.company1.users.add(self.company_user)
        
        # Create user roles
        UserRole.objects.create(user=self.it_admin, project=self.project1, role='admin')
        UserRole.objects.create(user=self.company_user, project=self.project1, role='user')
        
        self.client = APIClient()
    
    def test_superuser_sees_all_companies_without_filter(self):
        """Superuser can see all companies when no project filter is applied."""
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get('/api/tickets/companies/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        company_ids = [c['id'] for c in response.data['results']]
        self.assertIn(self.company1.id, company_ids)
        self.assertIn(self.company2.id, company_ids)
        self.assertIn(self.company3.id, company_ids)  # Even unassigned companies
    
    def test_superuser_sees_filtered_companies_with_project(self):
        """Superuser only sees companies assigned to specified project."""
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get(f'/api/tickets/companies/?project={self.project1.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        company_ids = [c['id'] for c in response.data['results']]
        self.assertIn(self.company1.id, company_ids)
        self.assertNotIn(self.company2.id, company_ids)
        self.assertNotIn(self.company3.id, company_ids)
    
    def test_it_admin_sees_only_assigned_companies(self):
        """IT Admin only sees companies where they are an admin."""
        self.client.force_authenticate(user=self.it_admin)
        response = self.client.get('/api/tickets/companies/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        company_ids = [c['id'] for c in response.data['results']]
        self.assertIn(self.company1.id, company_ids)
        self.assertNotIn(self.company2.id, company_ids)
        self.assertNotIn(self.company3.id, company_ids)
    
    def test_company_user_sees_only_their_company(self):
        """Company user only sees their assigned company."""
        self.client.force_authenticate(user=self.company_user)
        response = self.client.get('/api/tickets/companies/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        company_ids = [c['id'] for c in response.data['results']]
        self.assertIn(self.company1.id, company_ids)
        self.assertNotIn(self.company2.id, company_ids)


class CompanyCreationTests(APITestCase):
    """Test company creation with project assignment."""
    
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            username="superadmin",
            email="superadmin@example.com",
            password="password123"
        )
        self.project = Project.objects.create(key="P1", name="Project 1")
        self.client = APIClient()
        self.client.force_authenticate(user=self.superuser)
    
    def test_create_company_with_project_ids_json(self):
        """Company created with project_ids is assigned to project (JSON)."""
        response = self.client.post('/api/tickets/companies/', {
            'name': 'New Company',
            'project_ids': [self.project.id]
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify company is assigned to project
        company = Company.objects.get(id=response.data['id'])
        self.assertIn(self.project, company.projects.all())
    
    def test_create_company_with_project_ids_formdata(self):
        """Company created with project_ids via FormData is assigned to project."""
        response = self.client.post('/api/tickets/companies/', {
            'name': 'FormData Company',
            'project_ids': self.project.id  # Single value
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify company is assigned to project
        company = Company.objects.get(id=response.data['id'])
        self.assertIn(self.project, company.projects.all())
    
    def test_create_company_appears_in_filtered_list(self):
        """Newly created company appears in project-filtered list."""
        # Create company
        response = self.client.post('/api/tickets/companies/', {
            'name': 'FilterTest Company',
            'project_ids': [self.project.id]
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_company_id = response.data['id']
        
        # List companies with project filter
        list_response = self.client.get(f'/api/tickets/companies/?project={self.project.id}')
        company_ids = [c['id'] for c in list_response.data['results']]
        
        self.assertIn(new_company_id, company_ids)


class UserCreationTests(APITestCase):
    """Test user creation via company endpoint."""
    
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            username="superadmin",
            email="superadmin@example.com",
            password="password123"
        )
        self.project = Project.objects.create(key="P1", name="Project 1")
        self.company = Company.objects.create(name="Test Company")
        self.project.companies.add(self.company)
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.superuser)
    
    def test_create_user_assigns_to_company(self):
        """Created user is assigned to the company."""
        response = self.client.post(f'/api/tickets/companies/{self.company.id}/create_user/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'password123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify user is in company
        new_user = User.objects.get(username='newuser')
        self.assertIn(new_user, self.company.users.all())
    
    def test_create_user_gets_project_role(self):
        """Created user gets UserRole for company's projects."""
        response = self.client.post(f'/api/tickets/companies/{self.company.id}/create_user/', {
            'username': 'projuser',
            'email': 'projuser@example.com',
            'password': 'password123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify user has UserRole for the project
        new_user = User.objects.get(username='projuser')
        role = UserRole.objects.filter(user=new_user, project=self.project).first()
        
        self.assertIsNotNone(role)
        self.assertEqual(role.role, 'user')
    
    def test_create_user_visible_in_company_detail(self):
        """Created user appears in company detail response."""
        self.client.post(f'/api/tickets/companies/{self.company.id}/create_user/', {
            'username': 'visibleuser',
            'email': 'visibleuser@example.com',
            'password': 'password123'
        })
        
        # Fetch company detail
        response = self.client.get(f'/api/tickets/companies/{self.company.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = [u['id'] for u in response.data.get('users', [])]
        
        new_user = User.objects.get(username='visibleuser')
        self.assertIn(new_user.id, user_ids)
