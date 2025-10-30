# User Permissions System Documentation

## Overview

This document defines the role-based access control (RBAC) system for the multi-tenant ticketing system. The system supports four distinct user roles with specific permissions for projects and companies.

---

## User Roles

### 1. Superadmin (Project Owner)

**Context**: Project-specific role (not Django superuser)  
**Assignment**: User who creates a project OR explicitly assigned as superadmin  
**Scope**: Full control over THEIR projects only

#### Permissions:

- ✅ **Project Management**:
  - Create projects
  - Delete projects they own
  - Edit project settings (name, description, key)
  - Manage project members (add/remove admins, managers, users)
  - Assign/remove other superadmins to their projects
- ✅ **Company Management**:
  - Create companies
  - Edit/delete companies
  - Assign companies to their projects
  - Manage company admins and users
- ✅ **Ticket Management**:
  - View all tickets in their projects (across all companies)
  - Create tickets
  - Edit tickets they created
  - Delete tickets they created
  - Assign tickets to any user in the project
  - Comment on any ticket
  - Set due dates on tickets
- ✅ **Tag Management** (Project-level):
  - Create/edit/delete tags
  - Manage tag contacts
  - Assign tags to tickets
- ✅ **Analytics**:
  - View all KPIs for the entire project
  - View individual user KPIs
  - View company-specific KPIs
  - Export reports

#### Important Restrictions:

- ⛔ **Role Inheritance**: If a superadmin is added to ANOTHER project as an admin/manager/user, they have ONLY those permissions in that project (superadmin privileges do NOT transfer)
- ⛔ **Scope Limitation**: Cannot manage projects they don't own
- ⛔ **Cannot Edit Other's Tickets**: Can only edit tickets they personally created

---

### 2. Admin (IT Staff / Support Agent)

**Context**: Project-specific role  
**Assignment**: Assigned by superadmin  
**Scope**: Support and ticket management within assigned project

#### Permissions:

- ✅ **Ticket Management**:
  - View all tickets in the project (regardless of who created them)
  - Create new tickets
  - Edit ONLY tickets they created
  - Delete ONLY tickets they created
  - Assign tickets to other users in the project
  - Comment on any ticket in the project
  - Set due dates on tickets they create
- ✅ **Company Tickets**:
  - View tickets for companies they're assigned to (as company admin)
  - Auto-assigned to tickets when created for their companies
- ✅ **Analytics**:
  - View their own KPIs only
  - Cannot view other users' individual KPIs
  - Can view aggregate project stats (total tickets, resolution time, etc.)

#### Restrictions:

- ⛔ **No Project Management**: Cannot edit project settings or manage members
- ⛔ **No Company Management**: Cannot create/edit/delete companies
- ⛔ **No Tag Management**: Cannot create/edit/delete tags (can only use existing tags)
- ⛔ **Cannot Edit Others' Tickets**: Can only edit tickets they personally created
- ⛔ **No User KPIs**: Cannot view individual performance metrics of other users

---

### 3. User (Client / End User)

**Context**: Project member OR company member  
**Assignment**: Added to project by superadmin/admin OR added to company  
**Scope**: Limited to their own tickets + company tickets

#### Permissions:

- ✅ **Own Tickets**:
  - Create new tickets
  - View tickets they created
  - Edit tickets they created
  - Delete tickets they created
  - Comment on tickets they created
  - Set due dates on their tickets
- ✅ **Company Tickets** (if member of a company):
  - View ALL tickets from their company (even if created by other company users)
  - Comment on any ticket from their company
  - Cannot edit tickets created by other company users
- ✅ **Analytics**:
  - View their own KPIs only (tickets created, resolution time, etc.)

#### Restrictions:

- ⛔ **No Ticket Assignment**: Cannot assign or reassign tickets to anyone (not even themselves)
- ⛔ **Limited Visibility**: Cannot see tickets outside their company (unless they created them)
- ⛔ **No Project Management**: Cannot manage project or company settings
- ⛔ **No Tag Management**: Cannot create tags (can only view existing tags)
- ⛔ **Cannot Edit Others' Tickets**: Even within their company, can only edit their own tickets
- ⛔ **No Other Users' KPIs**: Cannot view performance metrics of other users

---

### 4. Manager (Project Manager / Team Lead)

**Context**: Project-specific role  
**Assignment**: Assigned by superadmin  
**Scope**: Read-only oversight of assigned project

#### Permissions:

- ✅ **Viewing**:
  - View all tickets in the project (read-only)
  - View all comments
  - View all project members
  - View all companies and company tickets
- ✅ **Analytics**:
  - View ALL user KPIs within their assigned project
  - View team performance metrics
  - View company-specific KPIs
  - Generate reports
  - Export data

#### Restrictions:

- ⛔ **No Editing**: Cannot edit ANY tickets (including their own, if they create any)
- ⛔ **No Ticket Creation**: Cannot create tickets
- ⛔ **No Management**: Cannot manage project members or companies
- ⛔ **No Tag Management**: Cannot create/edit/delete tags
- ⛔ **Project-Specific**: Only see KPIs for projects they're assigned to as manager
- ⛔ **No Cross-Project Access**: Manager role does not grant access to other projects

---

## Multi-Tenant (Company) Behavior

### Company Membership

- Users can belong to **multiple companies** simultaneously
- Each company has:
  - **Company Admins**: IT staff assigned to manage the company's tickets
  - **Company Users**: Client employees who can view/create company tickets

### Ticket Visibility Rules

#### For Company Users:

```
IF user is member of Company A:
  CAN SEE:
    - All tickets WHERE company = Company A
    - All tickets WHERE reporter = user (regardless of company)

  CANNOT SEE:
    - Tickets from Company B (unless user is also member of Company B)
    - General project tickets (where company = null)
```

#### For Company Admins (IT Staff):

```
IF user is admin of Company A:
  CAN SEE:
    - All tickets in the project (regardless of company)

  AUTO-ASSIGNED:
    - New tickets created with company = Company A
```

#### For Project Members (Non-Company):

```
IF user is project member but NOT in any company:
  CAN SEE:
    - Only tickets they created
    - Tickets assigned to them
```

---

## Permission Matrix

| Action                     | Superadmin | Admin  | User | Manager |
| -------------------------- | ---------- | ------ | ---- | ------- |
| **Projects**               |
| Create project             | ✅         | ❌     | ❌   | ❌      |
| Edit own project           | ✅         | ❌     | ❌   | ❌      |
| Delete own project         | ✅         | ❌     | ❌   | ❌      |
| Manage project members     | ✅         | ❌     | ❌   | ❌      |
| View project               | ✅         | ✅     | ✅   | ✅      |
| **Companies**              |
| Create company             | ✅         | ❌     | ❌   | ❌      |
| Edit company               | ✅         | ❌     | ❌   | ❌      |
| Delete company             | ✅         | ❌     | ❌   | ❌      |
| Manage company members     | ✅         | ❌     | ❌   | ❌      |
| View assigned companies    | ✅         | ✅     | ✅   | ✅      |
| **Tickets**                |
| Create ticket              | ✅         | ✅     | ✅   | ❌      |
| Edit own ticket            | ✅         | ✅     | ✅   | ❌      |
| Edit others' tickets       | ❌         | ❌     | ❌   | ❌      |
| Delete own ticket          | ✅         | ✅     | ✅   | ❌      |
| Delete others' tickets     | ❌         | ❌     | ❌   | ❌      |
| View all project tickets   | ✅         | ✅     | ❌   | ✅      |
| View company tickets       | ✅         | ✅     | ✅\* | ✅      |
| View own tickets           | ✅         | ✅     | ✅   | ✅      |
| Assign tickets             | ✅         | ✅     | ❌   | ❌      |
| Set due date               | ✅         | ✅     | ✅   | ❌      |
| **Comments**               |
| Comment on own tickets     | ✅         | ✅     | ✅   | ❌      |
| Comment on project tickets | ✅         | ✅     | ❌   | ❌      |
| Comment on company tickets | ✅         | ✅     | ✅\* | ❌      |
| **Tags**                   |
| Create/edit/delete tags    | ✅         | ❌     | ❌   | ❌      |
| Assign tags to tickets     | ✅         | ✅     | ✅   | ❌      |
| View tags                  | ✅         | ✅     | ✅   | ✅      |
| **Analytics**              |
| View own KPIs              | ✅         | ✅     | ✅   | ✅      |
| View all user KPIs         | ✅         | ❌     | ❌   | ✅      |
| View project KPIs          | ✅         | ✅\*\* | ❌   | ✅      |
| View company KPIs          | ✅         | ✅\*\* | ❌   | ✅      |
| Export reports             | ✅         | ❌     | ❌   | ✅      |

**Notes:**

- \* Only if user is member of that company
- \*\* Admins can view aggregate stats, but not individual user KPIs

---

## Implementation Details

### Django User Model Extensions

We'll use a custom `UserRole` model to track project-specific roles:

```python
class UserRole(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    role = models.CharField(choices=[
        ('superadmin', 'Superadmin'),
        ('admin', 'Admin'),
        ('user', 'User'),
        ('manager', 'Manager'),
    ])
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        unique_together = ['user', 'project']
```

### Permission Classes (Django REST Framework)

#### Project-Level Permissions:

```python
class IsProjectSuperadmin(BasePermission):
    """Full access to superadmins of the project"""

class IsProjectAdmin(BasePermission):
    """Access for admins within project scope"""

class IsProjectManager(BasePermission):
    """Read-only access for managers"""

class IsProjectMember(BasePermission):
    """Basic access for project members"""
```

#### Company-Level Permissions:

```python
class IsCompanyAdmin(BasePermission):
    """IT staff managing company tickets"""

class IsCompanyMember(BasePermission):
    """Client company users"""
```

#### Ticket-Level Permissions:

```python
class CanEditTicket(BasePermission):
    def has_object_permission(self, request, view, obj):
        # Only creator can edit
        return obj.reporter == request.user

class CanViewTicket(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user

        # Project superadmin/admin/manager can view all
        if has_project_role(user, obj.project, ['superadmin', 'admin', 'manager']):
            return True

        # Creator can view
        if obj.reporter == user:
            return True

        # Company members can view company tickets
        if obj.company and obj.company.users.filter(id=user.id).exists():
            return True

        return False
```

### ViewSet Permission Configuration

```python
class TicketViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ['create']:
            # Superadmin, Admin, User can create
            return [IsAuthenticated(), IsNotManager()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            # Only creator can edit/delete
            return [IsAuthenticated(), IsTicketOwner()]
        elif self.action == 'list':
            # Everyone can list (filtered by queryset)
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user

        # Superadmins/Admins/Managers see all project tickets
        if has_project_role(user, role=['superadmin', 'admin', 'manager']):
            return Ticket.objects.filter(project__in=user_projects)

        # Company members see company tickets + own tickets
        company_tickets = Ticket.objects.filter(
            company__users=user
        )
        own_tickets = Ticket.objects.filter(reporter=user)

        return (company_tickets | own_tickets).distinct()
```

---

## Role Assignment Workflows

### 1. Creating a Project

```
1. User clicks "Create Project"
2. System creates project with user as superadmin
3. UserRole record created: (user, project, 'superadmin')
4. User can now manage project and assign roles
```

### 2. Adding Team Members

```
Superadmin workflow:
1. Navigate to Project Settings → Members
2. Click "Add Member"
3. Search for user by email/username
4. Select role: Admin | User | Manager
5. System creates UserRole record
6. User receives invitation email
```

### 3. Creating a Company

```
Superadmin workflow:
1. Navigate to Companies
2. Click "Create Company"
3. Fill in company details (name, description, contact info)
4. Assign IT staff as Company Admins (from project members)
5. System creates Company record
6. Company admins receive notification
```

### 4. Adding Company Users

```
Superadmin/Company Admin workflow:
1. Navigate to Company Details
2. Click "Add User"
3. Enter user email
4. System creates user account (if new) or links existing user
5. User added to company.users
6. User receives company access email
```

---

## Data Isolation Rules

### Project Isolation:

- Users can only see projects where they have a UserRole record
- Superadmin privileges are project-specific (no cross-project access)
- Tickets, tags, columns are scoped to projects

### Company Isolation:

- Company A users cannot see Company B tickets
- Exception: IT admins/superadmins see all tickets in their project
- Company data (users, tickets, KPIs) is strictly segregated

### Ticket Visibility:

```sql
-- User's visible tickets
SELECT * FROM tickets WHERE
  -- Own tickets
  reporter_id = current_user.id
  OR
  -- Company tickets (if user is company member)
  company_id IN (SELECT company_id FROM company_users WHERE user_id = current_user.id)
  OR
  -- All project tickets (if user is admin/superadmin/manager)
  project_id IN (
    SELECT project_id FROM user_roles
    WHERE user_id = current_user.id
    AND role IN ('superadmin', 'admin', 'manager')
  )
```

---

## KPI & Analytics Access

### Individual KPIs (User-Level):

**Metrics**: Tickets created, tickets resolved, avg resolution time, tickets overdue

**Access**:

- **Own KPIs**: Everyone can see their own
- **All User KPIs**: Superadmin and Manager only (within their project)
- **Company User KPIs**: Superadmin only

### Project KPIs (Aggregate):

**Metrics**: Total tickets, open tickets, resolution rate, avg time to resolve

**Access**:

- **Superadmin**: Full access to all project metrics
- **Admin**: Aggregate metrics only (no per-user breakdown)
- **Manager**: Full access including per-user breakdown
- **User**: No access to project-level KPIs

### Company KPIs:

**Metrics**: Company tickets created, resolution time, customer satisfaction

**Access**:

- **Superadmin**: All companies
- **Manager**: All companies in their project
- **Company Admin**: Only their assigned companies (aggregate only)
- **Company User**: No access

---

## Edge Cases & Special Scenarios

### 1. User Belongs to Multiple Companies

```
Scenario: John is member of Company A and Company B
Visibility:
  - Sees ALL tickets from Company A
  - Sees ALL tickets from Company B
  - Sees tickets he created (even if no company assigned)
```

### 2. Superadmin Added as Admin to Another Project

```
Scenario: Alice is superadmin of Project X, added as admin to Project Y
Project X: Full superadmin privileges
Project Y: ONLY admin privileges (no superadmin powers)
```

### 3. Admin Promoted to Superadmin

```
Scenario: Bob is admin, then promoted to superadmin
Result:
  - UserRole.role updated to 'superadmin'
  - Immediately gains full project management access
  - Can now manage members, companies, tags
```

### 4. Company Admin Who Is Also Company User

```
Scenario: Carol is company admin (IT staff) AND member of Company A
Result:
  - IT staff permissions take precedence
  - Can see all project tickets (not just Company A)
  - Auto-assigned to Company A tickets
```

### 5. User Creates Ticket Without Company

```
Scenario: User creates ticket, doesn't select a company
Visibility:
  - Ticket visible to all project admins/superadmins
  - Ticket visible to creator
  - NOT visible to company users (since no company assigned)
```

### 6. Manager Tries to Edit Ticket

```
Scenario: Manager role attempts to update ticket
Result:
  - API returns 403 Forbidden
  - Permission denied (managers are read-only)
  - Frontend hides edit buttons for managers
```

---

## Security Considerations

### 1. Role Escalation Prevention

- Users cannot assign themselves higher roles
- Only superadmins can assign superadmin role
- UserRole changes are logged with `assigned_by` field

### 2. Cross-Project Data Leakage

- All queries filtered by project membership
- API endpoints verify project access before returning data
- Frontend stores active project in context

### 3. Company Data Isolation

- Company membership checked on every ticket query
- Company admins cannot escalate to superadmin
- Company users cannot access other companies' data

### 4. Audit Trail

- All ticket edits logged with user and timestamp
- Role changes logged in UserRole model
- Company membership changes logged

---

## Testing Checklist

### Superadmin Tests:

- [ ] Can create/edit/delete projects they own
- [ ] Cannot edit projects they don't own
- [ ] Can assign other superadmins
- [ ] Can create companies
- [ ] Can view all project tickets
- [ ] Cannot edit tickets created by others
- [ ] Privileges don't transfer to other projects

### Admin Tests:

- [ ] Can create tickets
- [ ] Can assign tickets to others
- [ ] Can edit only their own tickets
- [ ] Can delete only their own tickets
- [ ] Can view all project tickets
- [ ] Cannot manage project settings
- [ ] Can view own KPIs only

### User Tests:

- [ ] Can create tickets
- [ ] Can edit own tickets
- [ ] Can delete own tickets
- [ ] Cannot assign tickets
- [ ] Can see company tickets (if company member)
- [ ] Cannot see other users' tickets (unless same company)
- [ ] Can comment on company tickets
- [ ] Cannot edit company tickets created by others

### Manager Tests:

- [ ] Can view all project tickets (read-only)
- [ ] Cannot create tickets
- [ ] Cannot edit any tickets
- [ ] Can view all user KPIs in project
- [ ] Cannot manage project or companies
- [ ] Can export reports

### Company Isolation Tests:

- [ ] Company A users cannot see Company B tickets
- [ ] Multi-company users see all their companies' tickets
- [ ] Company admins auto-assigned to company tickets
- [ ] Company users can comment on company tickets
- [ ] General tickets (no company) not visible to company users

---

## Frontend Implementation Notes

### Role-Based UI

```typescript
// Show/hide based on role
const userRole = useUserRole(currentProject);

{
  userRole === "superadmin" && (
    <Button onClick={openProjectSettings}>Settings</Button>
  );
}

{
  ["superadmin", "admin"].includes(userRole) && (
    <Button onClick={assignTicket}>Assign</Button>
  );
}

{
  userRole !== "manager" && <Button onClick={createTicket}>New Ticket</Button>;
}
```

### Permission Checks

```typescript
const canEditTicket = (ticket: Ticket) => {
  return ticket.reporter.id === currentUser.id;
};

const canViewTicket = (ticket: Ticket) => {
  // Superadmin/Admin/Manager see all
  if (["superadmin", "admin", "manager"].includes(userRole)) {
    return true;
  }

  // Creator can view
  if (ticket.reporter.id === currentUser.id) {
    return true;
  }

  // Company member can view company tickets
  if (ticket.company && userCompanies.includes(ticket.company.id)) {
    return true;
  }

  return false;
};
```

---

## API Endpoint Summary

### Role-Protected Endpoints:

| Endpoint                     | Superadmin | Admin  | User   | Manager |
| ---------------------------- | ---------- | ------ | ------ | ------- |
| `POST /projects/`            | ✅         | ❌     | ❌     | ❌      |
| `PATCH /projects/{id}/`      | ✅\*       | ❌     | ❌     | ❌      |
| `DELETE /projects/{id}/`     | ✅\*       | ❌     | ❌     | ❌      |
| `POST /companies/`           | ✅         | ❌     | ❌     | ❌      |
| `POST /tickets/`             | ✅         | ✅     | ✅     | ❌      |
| `PATCH /tickets/{id}/`       | ✅\*\*     | ✅\*\* | ✅\*\* | ❌      |
| `DELETE /tickets/{id}/`      | ✅\*\*     | ✅\*\* | ✅\*\* | ❌      |
| `GET /kpis/users/`           | ✅         | ❌     | ❌     | ✅      |
| `POST /tickets/{id}/assign/` | ✅         | ✅     | ❌     | ❌      |

**Notes:**

- \* Only for projects they own
- \*\* Only for tickets they created

---

## Migration Strategy

### Phase 1: Add UserRole Model

1. Create migration for UserRole table
2. Default all existing project leads to 'superadmin'
3. Default all other project members to 'user'

### Phase 2: Update Permission Classes

1. Implement new permission classes
2. Update ViewSets with role checks
3. Add role-based queryset filtering

### Phase 3: Frontend Updates

1. Add role context provider
2. Update UI to show/hide based on role
3. Add role badges in user lists

### Phase 4: Testing & Rollout

1. Test each role scenario
2. Verify data isolation
3. Deploy to staging
4. Production deployment with monitoring

---

## Future Enhancements

1. **Custom Roles**: Allow superadmins to create custom roles with specific permissions
2. **Time-Limited Access**: Grant temporary elevated permissions
3. **Role Templates**: Pre-defined role sets for common scenarios
4. **Approval Workflows**: Require approval for sensitive operations
5. **Advanced KPIs**: More granular analytics with custom filters

---

**Document Version**: 1.0  
**Last Updated**: October 30, 2025  
**Author**: System Architect  
**Status**: Approved - Ready for Implementation
