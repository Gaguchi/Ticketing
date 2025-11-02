"""
Script to assign 'superadmin' role to existing project creators.
This is a one-time migration script for projects created before the auto-assignment feature.

Run this script after implementing the UserRole auto-assignment feature.
"""

import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from tickets.models import Project, UserRole

def fix_existing_projects():
    """
    For each existing project:
    1. Find the project creator (first member or lead_username)
    2. Check if they have a UserRole
    3. If not, create UserRole with role='superadmin'
    """
    
    projects = Project.objects.all()
    fixed_count = 0
    skipped_count = 0
    
    print(f"\n🔍 Checking {projects.count()} projects...\n")
    
    for project in projects:
        print(f"📁 Project: {project.key} - {project.name}")
        
        # Try to determine the project creator
        creator = None
        
        # Method 1: Check lead_username
        if project.lead_username:
            try:
                creator = User.objects.get(username=project.lead_username)
                print(f"   → Found lead: {creator.username}")
            except User.DoesNotExist:
                print(f"   ⚠️  Lead username '{project.lead_username}' not found")
        
        # Method 2: If no lead, use first member
        if not creator and project.members.exists():
            creator = project.members.first()
            print(f"   → Using first member: {creator.username}")
        
        if not creator:
            print(f"   ❌ No creator found - skipping")
            skipped_count += 1
            continue
        
        # Check if UserRole already exists
        existing_role = UserRole.objects.filter(
            user=creator,
            project=project
        ).first()
        
        if existing_role:
            print(f"   ✅ UserRole already exists: {existing_role.role}")
            skipped_count += 1
            continue
        
        # Create UserRole with 'superadmin'
        UserRole.objects.create(
            user=creator,
            project=project,
            role='superadmin',
            assigned_by=creator  # Self-assigned
        )
        
        print(f"   🎉 Created UserRole: {creator.username} as 'superadmin'")
        fixed_count += 1
    
    print(f"\n" + "="*60)
    print(f"✅ Fixed: {fixed_count} projects")
    print(f"⏭️  Skipped: {skipped_count} projects (already have roles)")
    print(f"📊 Total: {projects.count()} projects")
    print("="*60 + "\n")

if __name__ == '__main__':
    fix_existing_projects()
