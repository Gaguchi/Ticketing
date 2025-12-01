# Superadmin Company User Management

## Overview
This feature enables superadmins to manage IT admins and end-customer users for companies.

**Important Distinction:**
- **Company Admins** = IT staff who manage tickets (assigned from existing users)
- **Company Users** = End customers who need NEW accounts created for service desk access

## Changes Made

### Backend Changes (`backend/tickets/views.py`)

#### New Endpoint: Create Company User
Added `create_user` action to `CompanyViewSet`:
```python
@action(detail=True, methods=['post'])
def create_user(self, request, pk=None):
    """
    Create a new user account and assign to this company.
    Creates brand new user accounts for end customers.
    """
```

**Functionality:**
- Creates a new Django user account
- Assigns user to the company
- Auto-assigns 'user' role to all projects the company belongs to
- Validates username/email uniqueness
- Sets password as provided by superadmin

### Frontend Changes (`frontend/src/pages/Companies.tsx`)

#### 1. Updated Manage Users Modal
**Changed from:** Assigning existing users  
**Changed to:** Creating new user accounts

**New Form Fields:**
- Username (required, min 3 chars)
- Email (required, valid email)
- First Name (optional)
- Last Name (optional)
- Password (required, min 6 chars) with "Generate" button

#### 2. New Functions
- `handleCreateUser()` - Creates new user and assigns to company
- `generateRandomPassword()` - Generates secure random password (12 chars)

#### 3. Password Generator
- Button in password field
- Generates 12-character password with letters, numbers, and symbols
- Auto-fills the password field

### API Endpoints

#### Create Company User
```bash
POST /api/tickets/companies/{id}/create_user/
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "message": "User johndoe created and assigned to Company Name",
  "user": {
    "id": 10,
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "company": { /* full company data */ }
}
```

## User Flow

### Creating Company Users (End Customers)

1. **Navigate to Companies** page
2. **Select a company** → Click **Actions (⋮)** → **"Manage Users"**
3. **Fill in the form:**
   - Enter username (will be their login)
   - Enter email address
   - Enter first/last name (optional)
   - Set password OR click "Generate" for random password
4. **Click "Create User"**
5. **User is created** and automatically:
   - Added to the company
   - Assigned 'user' role in all company projects
   - Can now log in to service desk portal (when built)

### Managing IT Admins (Existing Staff)

1. **Navigate to Companies** page
2. **Select a company** → Click **Actions (⋮)** → **"Manage Admins"**
3. **Search for existing users** in your organization
4. **Click "Add as Admin"** to assign IT staff
5. **Admins can now** manage tickets for this company

## Permissions

### Who Can Create Company Users?
- ✅ Django superusers
- ✅ Project superadmins (users with 'superadmin' role)

### What Happens When User is Created?
1. New Django user account is created
2. User is added to `company.users`
3. User is assigned 'user' role in all projects the company belongs to
4. User can log in with provided credentials
5. User will access service desk portal (separate frontend, to be built)

## Company User Characteristics

### What Company Users CAN Do:
- ✅ Log in with username/password
- ✅ Create tickets for their company
- ✅ View ONLY their own tickets
- ✅ Comment on their own tickets
- ✅ See ticket status and assigned IT admin
- ✅ Change their password (in service desk portal)

### What Company Users CANNOT Do:
- ❌ Access the main ticketing frontend (this app)
- ❌ See other company users' tickets
- ❌ Assign tickets to anyone
- ❌ Manage company settings
- ❌ View company-wide tickets
- ❌ Access admin features

## Security Considerations

### Password Management
- Superadmin sets initial password
- Password must be at least 6 characters
- Random generator creates 12-char passwords with mixed characters
- Users will be able to change password in service desk portal
- No email verification required (B2B context)

### Account Validation
- Username must be unique across system
- Email must be unique across system
- Validates email format
- Returns clear error messages for duplicates

### Data Isolation
- Company users belong to ONE company only
- Users see ONLY their own tickets
- Project association is automatic via company→project relationship
- Cannot access other companies' data

## Testing Checklist

- [ ] Superadmin can open "Manage Users" modal
- [ ] Form validates required fields (username, email, password)
- [ ] "Generate" button creates random password
- [ ] Creating user with duplicate username shows error
- [ ] Creating user with duplicate email shows error
- [ ] Creating user with invalid email shows error
- [ ] Successfully created user appears in company user list
- [ ] User is auto-assigned to company's projects with 'user' role
- [ ] User can log in with created credentials
- [ ] Removing user from company works
- [ ] Company user count updates after creation/removal

## Future Enhancements (Service Desk Portal)

1. **Self-Service Portal**
   - Separate React app for end customers
   - Simplified UI for ticket submission
   - View my tickets, track status
   - Profile management (change password, update email)

2. **User Features**
   - Email notifications for ticket updates
   - File attachments on tickets
   - Ticket history and timeline
   - Knowledge base access

3. **Admin Features**
   - Bulk user import from CSV
   - User invitation emails
   - Password reset links
   - Account enable/disable
   - Usage analytics per company

4. **Authentication**
   - "Forgot password" flow
   - Optional 2FA
   - SSO integration for enterprise customers

## Related Files
- Backend: `backend/tickets/views.py` (CompanyViewSet.create_user)
- Frontend: `frontend/src/pages/Companies.tsx`
- API Config: `frontend/src/config/api.ts`
- Permissions: `backend/tickets/permissions.py` (IsCompanyAdminOrReadOnly)
- Models: `backend/tickets/models.py` (Company, UserRole)
