# Fixing Existing Projects - User Role Assignment

## Problem

Before the auto-assignment feature was implemented, user "gaga" created the "Tickets" project but was not automatically assigned the 'superadmin' role. This prevents them from creating companies.

## Solution

We've created a Django management command that will:

1. Find all existing projects
2. Determine the project creator (from lead_username or first member)
3. Assign them the 'superadmin' role if they don't already have one

## How to Run

### Option 1: Django Management Command (Recommended)

Open a terminal in VS Code (make sure you're in the backend directory with venv activated):

```powershell
# Navigate to backend directory
cd E:\Work\WebDev\Ticketing\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run the command
python manage.py fix_project_roles
```

Expected output:

```
🔍 Checking X projects...

📁 Project: TICK - Tickets
   → Found lead: gaga
   🎉 Created UserRole: gaga as 'superadmin'

============================================================
✅ Fixed: 1 projects
⏭️  Skipped: 0 projects (already have roles)
📊 Total: 1 projects
============================================================
```

### Option 2: Manual Fix via Django Shell

If the management command doesn't work, you can manually fix it:

```powershell
# In backend directory with venv activated
python manage.py shell
```

Then in the Django shell:

```python
from django.contrib.auth.models import User
from tickets.models import Project, UserRole

# Get the user and project
user = User.objects.get(username='gaga')
project = Project.objects.get(key='TICK')

# Check if role already exists
existing = UserRole.objects.filter(user=user, project=project).first()

if existing:
    print(f"Role already exists: {existing.role}")
else:
    # Create the superadmin role
    UserRole.objects.create(
        user=user,
        project=project,
        role='superadmin',
        assigned_by=user
    )
    print(f"✅ Created UserRole: {user.username} as 'superadmin' for {project.name}")
```

### Verify the Fix

After running either option, verify that the role was created:

```python
# In Django shell
from django.contrib.auth.models import User
from tickets.models import UserRole

user = User.objects.get(username='gaga')
roles = UserRole.objects.filter(user=user)

for role in roles:
    print(f"{role.user.username} - {role.get_role_display()} in {role.project.name}")
```

Expected output:

```
gaga - Superadmin in Tickets
```

## Test the Fix

1. Log in as user "gaga"
2. Try to create a company:
   ```http
   POST /api/tickets/companies/
   {
     "name": "Test Company",
     "description": "Testing permissions"
   }
   ```
3. Should now return `201 Created` instead of `403 Forbidden`

## Files Created/Modified

1. **backend/tickets/views.py** - ProjectViewSet.create() now auto-assigns 'superadmin' role
2. **backend/tickets/permissions.py** - Updated to check UserRole instead of is_superuser
3. **backend/tickets/management/commands/fix_project_roles.py** - New management command
4. **docs/SYSTEM_ARCHITECTURE.md** - Updated to document UserRole system
5. **docs/api/API_REFERENCE.md** - Updated to document role-based permissions

## Future Projects

All new projects created after this fix will automatically assign the creator as 'superadmin'. No manual intervention needed!
