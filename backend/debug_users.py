"""
Debug script to compare users 'dima' and 'gaga' and identify why one can see companies and the other cannot.
"""
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Disable DEBUG SQL logging
import logging
logging.disable(logging.DEBUG)

from tickets.models import Company, Project, UserRole
from django.contrib.auth.models import User

print("=" * 70)
print("USER COMPARISON: DIMA vs GAGA")
print("=" * 70)

# Find both users
try:
    dima = User.objects.get(username__iexact='dima')
    print(f"\n[USER: DIMA]")
    print(f"  ID: {dima.id}")
    print(f"  Username: {dima.username}")
    print(f"  Email: {dima.email}")
    print(f"  is_superuser: {dima.is_superuser}")
    print(f"  is_staff: {dima.is_staff}")
    print(f"  is_active: {dima.is_active}")
except User.DoesNotExist:
    print("User 'dima' not found!")
    dima = None

try:
    gaga = User.objects.get(username__iexact='gaga')
    print(f"\n[USER: GAGA]")
    print(f"  ID: {gaga.id}")
    print(f"  Username: {gaga.username}")
    print(f"  Email: {gaga.email}")
    print(f"  is_superuser: {gaga.is_superuser}")
    print(f"  is_staff: {gaga.is_staff}")
    print(f"  is_active: {gaga.is_active}")
except User.DoesNotExist:
    print("User 'gaga' not found!")
    gaga = None

print("\n" + "=" * 70)
print("PROJECT MEMBERSHIPS")
print("=" * 70)

projects = Project.objects.all()
for project in projects:
    print(f"\nProject: {project.name} (ID: {project.id})")
    members = project.members.all()
    print(f"  Members: {list(members.values_list('username', flat=True))}")
    
    if dima and dima in members:
        print(f"  -> DIMA is a member")
    if gaga and gaga in members:
        print(f"  -> GAGA is a member")

print("\n" + "=" * 70)
print("USER ROLES")
print("=" * 70)

if dima:
    dima_roles = UserRole.objects.filter(user=dima)
    print(f"\nDIMA's roles:")
    for role in dima_roles:
        print(f"  Project: {role.project.name}, Role: {role.role}")

if gaga:
    gaga_roles = UserRole.objects.filter(user=gaga)
    print(f"\nGAGA's roles:")
    for role in gaga_roles:
        print(f"  Project: {role.project.name}, Role: {role.role}")

print("\n" + "=" * 70)
print("COMPANY ADMIN/USER ASSIGNMENTS")
print("=" * 70)

companies = Company.objects.all()
for company in companies:
    print(f"\nCompany: {company.name} (ID: {company.id})")
    admins = company.admins.all()
    users = company.users.all()
    company_projects = company.projects.all()
    
    print(f"  Admins: {list(admins.values_list('username', flat=True))}")
    print(f"  Users: {list(users.values_list('username', flat=True))}")
    print(f"  Projects: {list(company_projects.values_list('id', 'name'))}")
    
    if dima:
        if dima in admins:
            print(f"  -> DIMA is admin of this company")
        if dima in users:
            print(f"  -> DIMA is user of this company")
    if gaga:
        if gaga in admins:
            print(f"  -> GAGA is admin of this company")
        if gaga in users:
            print(f"  -> GAGA is user of this company")

print("\n" + "=" * 70)
print("SIMULATING COMPANY QUERYSET FOR EACH USER")
print("=" * 70)

from django.db.models import Q

def get_companies_for_user(user):
    """Simulate CompanyViewSet.get_queryset()"""
    if user.is_superuser:
        return Company.objects.all()
    else:
        return Company.objects.filter(
            Q(admins=user) | Q(users=user)
        ).distinct()

if dima:
    dima_companies = get_companies_for_user(dima)
    print(f"\nCompanies visible to DIMA (is_superuser={dima.is_superuser}):")
    for c in dima_companies:
        print(f"  - {c.name} (ID: {c.id})")
    if not dima_companies.exists():
        print("  (NONE)")

if gaga:
    gaga_companies = get_companies_for_user(gaga)
    print(f"\nCompanies visible to GAGA (is_superuser={gaga.is_superuser}):")
    for c in gaga_companies:
        print(f"  - {c.name} (ID: {c.id})")
    if not gaga_companies.exists():
        print("  (NONE)")

print("\n" + "=" * 70)
print("KEY DIFFERENCE CHECK")
print("=" * 70)

if dima and gaga:
    if dima.is_superuser != gaga.is_superuser:
        print(f"*** DIFFERENCE FOUND: is_superuser")
        print(f"    DIMA is_superuser: {dima.is_superuser}")
        print(f"    GAGA is_superuser: {gaga.is_superuser}")
    if dima.is_active != gaga.is_active:
        print(f"*** DIFFERENCE FOUND: is_active")
        print(f"    DIMA is_active: {dima.is_active}")
        print(f"    GAGA is_active: {gaga.is_active}")
