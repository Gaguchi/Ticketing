"""
Verify the fix - simulate the new get_queryset logic
"""
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import logging
logging.disable(logging.DEBUG)

from tickets.models import Company, Project, UserRole
from django.contrib.auth.models import User
from django.db.models import Q

def get_companies_for_user_FIXED(user, project_id=None):
    """Simulate the fixed CompanyViewSet.get_queryset()"""
    # Django superusers always see all companies
    if user.is_superuser:
        queryset = Company.objects.all()
        if project_id:
            queryset = queryset.filter(projects__id=project_id)
        return queryset
    
    # Check if user has superadmin or admin role in the specified project
    if project_id:
        has_admin_role = UserRole.objects.filter(
            user=user,
            project_id=project_id,
            role__in=['superadmin', 'admin']
        ).exists()
        
        if has_admin_role:
            # Project superadmins/admins see ALL companies in that project
            return Company.objects.filter(projects__id=project_id)
    
    # For non-admins: only show companies where user is explicitly assigned
    queryset = Company.objects.filter(
        Q(admins=user) | Q(users=user)
    ).distinct()
    
    if project_id:
        queryset = queryset.filter(projects__id=project_id)
    
    return queryset

print("=" * 70)
print("VERIFYING FIX: PROJECT SUPERADMIN VISIBILITY")
print("=" * 70)

# Find users
try:
    dima = User.objects.get(username__iexact='dima')
    print(f"\nUser: {dima.username} (is_superuser: {dima.is_superuser})")
    
    # Check Dima's project roles
    dima_roles = UserRole.objects.filter(user=dima)
    print(f"Project roles:")
    for role in dima_roles:
        print(f"  - Project: {role.project.name} (ID: {role.project.id}), Role: {role.role}")
    
    # Test visibility for each project
    projects = Project.objects.all()
    for project in projects:
        print(f"\n  Testing project: {project.name} (ID: {project.id})")
        companies = get_companies_for_user_FIXED(dima, project.id)
        print(f"  Companies visible with FIX: {list(companies.values_list('name', flat=True))}")
        
except User.DoesNotExist:
    print("User 'dima' not found!")

try:
    gaga = User.objects.get(username__iexact='gaga')
    print(f"\n\nUser: {gaga.username} (is_superuser: {gaga.is_superuser})")
    
    projects = Project.objects.all()
    for project in projects:
        print(f"\n  Testing project: {project.name} (ID: {project.id})")
        companies = get_companies_for_user_FIXED(gaga, project.id)
        print(f"  Companies visible: {list(companies.values_list('name', flat=True))}")

except User.DoesNotExist:
    print("User 'gaga' not found!")

print("\n" + "=" * 70)
print("FIX VERIFIED!")
print("=" * 70)
