import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from tickets.models import Company, Project
from django.contrib.auth.models import User

username = 'Illia'
u = User.objects.get(username=username)

admin_companies = Company.objects.filter(admins=u)
user_companies = Company.objects.filter(users=u)
member_projects = Project.objects.filter(members=u)

print(f'User: {u.username} (ID: {u.id})')
print(f'Is superuser: {u.is_superuser}')
print(f'Admin of companies: {list(admin_companies.values_list("name", flat=True))}')
print(f'Member of companies: {list(user_companies.values_list("name", flat=True))}')
print(f'Member of projects: {list(member_projects.values_list("name", flat=True))}')

# Check if regular user only
user_admin_companies = Company.objects.filter(admins=u)
user_regular_companies = Company.objects.filter(users=u).exclude(admins=u)

print(f'\nIs company admin: {user_admin_companies.exists()}')
print(f'Is regular company user: {user_regular_companies.exists()}')
print(f'Is project member: {member_projects.exists()}')

# Check tickets
from tickets.models import Ticket
user_created_tickets = Ticket.objects.filter(reporter=u).count()
all_tickets = Ticket.objects.count()
print(f'\nTickets created by user: {user_created_tickets}')
print(f'Total tickets in system: {all_tickets}')
