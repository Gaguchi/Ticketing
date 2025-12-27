"""
Quick diagnostic script to verify company-project associations
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from tickets.models import Company, Project, UserRole
from django.contrib.auth.models import User

print("=" * 60)
print("COMPANY-PROJECT ASSOCIATION DIAGNOSTIC")
print("=" * 60)

# Check all companies and their project associations
companies = Company.objects.all()
print(f"\nTotal companies: {companies.count()}")

for company in companies[:10]:  # Limit to first 10
    projects = company.projects.all()
    print(f"\nCompany: {company.name} (ID: {company.id})")
    print(f"  Projects: {list(projects.values_list('id', 'name'))}")
    print(f"  Admins: {list(company.admins.values_list('username', flat=True))}")
    print(f"  Users: {list(company.users.values_list('username', flat=True))}")

print("\n" + "=" * 60)
print("PROJECTS AND THEIR COMPANIES")
print("=" * 60)

projects = Project.objects.all()
for project in projects[:5]:  # Limit to first 5
    companies = project.companies.all()
    print(f"\nProject: {project.name} (ID: {project.id})")
    print(f"  Companies: {list(companies.values_list('id', 'name'))}")
    print(f"  Members: {list(project.members.values_list('username', flat=True))}")

print("\n" + "=" * 60)
print("USER ROLES CHECK")
print("=" * 60)

# Check if there are any UserRole entries for company users
user_roles = UserRole.objects.all()[:20]
for role in user_roles:
    print(f"User: {role.user.username}, Project: {role.project.name}, Role: {role.role}")
