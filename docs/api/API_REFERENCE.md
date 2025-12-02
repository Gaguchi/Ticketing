# Ticketing System API Documentation for LLMs

This document provides comprehensive information about the Ticketing System API, including all endpoints, request/response formats, authentication methods, and expected behaviors. This is designed to help AI assistants understand how to interact with the API.

## Base URL

```
Production: http://31.97.181.167/api
Development: http://localhost:8000/api
```

## Authentication

The API supports two authentication methods:

### 1. JWT Bearer Token Authentication (Production)

**How it works:**

1. Login or register to get access and refresh tokens
2. Include access token in Authorization header: `Authorization: Bearer <access_token>`
3. Access tokens expire after 24 hours
4. Refresh tokens expire after 7 days
5. Use refresh endpoint to get new access token

**Login Flow:**

```http
POST /tickets/auth/login/
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}

Response 200 OK:
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "first_name": "",
    "last_name": ""
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

### 2. Super Secret Key Authentication (Testing/Development Only)

**How it works:**

- Add custom header: `X-Super-Secret-Key: dev-super-secret-key-12345`
- Bypasses JWT authentication
- Automatically authenticates as first superuser
- **WARNING: Only use in development! Never in production!**

**Example:**

```http
GET /tickets/tickets/
X-Super-Secret-Key: dev-super-secret-key-12345

Response: Returns tickets without requiring JWT token
```

**Environment Variable:**

```bash
SUPER_SECRET_KEY=dev-super-secret-key-12345
```

---

## Permission System

### User Roles (Project-Specific)

**IMPORTANT:** Roles are **per-project**, not global. The same user can have different roles in different projects.

**Roles:**

- **superadmin**: Project owner with full control (auto-assigned when creating a project)
- **admin**: IT staff who can manage tickets, assign work, view all tickets
- **user**: Regular member who can create/edit own tickets, see company tickets
- **manager**: Read-only oversight role with access to all KPIs and reports

**Role Assignment:**
When a user creates a project, they are **automatically assigned as 'superadmin'** for that project.

**Permission Matrix:**

| Action                   | Superadmin | Admin | User | Manager |
| ------------------------ | ---------- | ----- | ---- | ------- |
| **Projects**             |
| Create project           | ✅         | ❌    | ❌   | ❌      |
| Edit own project         | ✅         | ❌    | ❌   | ❌      |
| Delete own project       | ✅         | ❌    | ❌   | ❌      |
| Manage project members   | ✅         | ❌    | ❌   | ❌      |
| View project             | ✅         | ✅    | ✅   | ✅      |
| **Companies**            |
| Create company           | ✅         | ❌    | ❌   | ❌      |
| Edit company             | ✅         | ❌    | ❌   | ❌      |
| Delete company           | ✅         | ❌    | ❌   | ❌      |
| View companies           | ✅         | ✅    | ✅   | ✅      |
| **Tags**                 |
| Create tag               | ✅         | ❌    | ❌   | ❌      |
| Edit tag                 | ✅         | ❌    | ❌   | ❌      |
| Delete tag               | ✅         | ❌    | ❌   | ❌      |
| View tags                | ✅         | ✅    | ✅   | ✅      |
| **Tickets**              |
| View all project tickets | ✅         | ✅    | ❌   | ✅      |
| Create ticket            | ✅         | ✅    | ✅   | ❌      |
| Edit own ticket          | ✅         | ✅    | ✅   | ❌      |
| Edit others' tickets     | ✅         | ❌    | ❌   | ❌      |
| Delete own ticket        | ✅         | ✅    | ✅   | ❌      |
| Assign tickets           | ✅         | ✅    | ❌   | ❌      |
| Comment on tickets       | ✅         | ✅    | ✅   | ✅      |

---

## API Endpoints Reference

### Authentication Endpoints

#### POST `/tickets/auth/register/`

Create a new user account and setup default project.

**Request:**

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "project_key": "PROJ",
  "project_name": "My Project"
}
```

**Response 201 Created:**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 5,
    "username": "newuser",
    "email": "newuser@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "project": {
    "id": 3,
    "name": "My Project",
    "key": "PROJ"
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

**Errors:**

- 400: Password mismatch, username taken, invalid project key format

#### POST `/tickets/auth/login/`

Authenticate user and receive JWT tokens.

**Request:**

```json
{
  "username": "admin",
  "password": "admin"
}
```

**Response 200 OK:** (same as register response)

**Errors:**

- 400: Invalid credentials
- 400: Missing username or password

#### POST `/tickets/auth/token/refresh/`

Get a new access token using refresh token.

**Request:**

```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response 200 OK:**

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Errors:**

- 401: Token is invalid or expired

#### GET `/tickets/auth/me/`

Get current authenticated user information.

**Headers:** `Authorization: Bearer <access_token>`

**Response 200 OK:**

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "first_name": "",
  "last_name": "",
  "is_superuser": true,
  "is_staff": true
}
```

---

### Tickets Endpoints

#### GET `/tickets/tickets/`

List all tickets with pagination, filtering, and search.

**Query Parameters:**

- `page` (int): Page number (default: 1)
- `page_size` (int): Items per page (default: 20, max: 100)
- `search` (string): Search in name and description
- `status` (string): Filter by status
- `type` (string): Filter by type (task, bug, story, epic)
- `priority_id` (int): Filter by priority (1-4)
- `column` (int): Filter by column ID
- `tags` (int): Filter by tag ID (can use multiple: `?tags=1&tags=2`)
- `ordering` (string): Order by field (prefix with `-` for descending)
  - Options: `created_at`, `-created_at`, `updated_at`, `-updated_at`, `priority_id`, `-priority_id`, `name`, `-name`

**Response 200 OK:**

```json
{
  "count": 42,
  "next": "http://31.97.181.167/api/tickets/tickets/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Fix login page error",
      "description": "Users getting 500 error",
      "type": "bug",
      "status": "in_progress",
      "priority_id": 4,
      "urgency": "high",
      "importance": "critical",
      "project": 1,
      "project_key": "DEMO",
      "column": 2,
      "column_name": "In Progress",
      "assignee_ids": [1, 2],
      "following": false,
      "comments_count": 3,
      "tag_names": ["backend", "authentication"],
      "due_date": "2025-10-25",
      "start_date": "2025-10-20",
      "created_at": "2025-10-20T10:30:00Z",
      "updated_at": "2025-10-21T14:20:00Z"
    }
  ]
}
```

**Important Fields:**

- `priority_id`: 1=Lowest, 2=Low, 3=Medium, 4=High, 5=Highest
- `type`: task, bug, story, epic
- `urgency`: low, medium, high, critical
- `importance`: low, medium, high, critical
- `following`: true if current user is following this ticket
- `tag_names`: Array of tag names (read-only, use tag_ids to update)

#### POST `/tickets/tickets/`

Create a new ticket.

**Request:**

```json
{
  "name": "Fix homepage loading issue",
  "description": "Homepage is slow to load for mobile users",
  "type": "bug",
  "priority_id": 3,
  "urgency": "high",
  "importance": "medium",
  "column": 1,
  "assignee_ids": [1, 2],
  "tag_names": ["frontend", "performance"],
  "due_date": "2025-11-01",
  "start_date": "2025-10-25"
}
```

**Response 201 Created:**

```json
{
  "id": 15,
  "name": "Fix homepage loading issue",
  "description": "Homepage is slow to load for mobile users",
  "type": "bug",
  "status": "new",
  "priority_id": 3,
  "urgency": "high",
  "importance": "medium",
  "project": 1,
  "project_key": "DEMO",
  "column": 1,
  "column_name": "New",
  "assignee_ids": [1, 2],
  "following": false,
  "comments_count": 0,
  "tag_names": ["frontend", "performance"],
  "due_date": "2025-11-01",
  "start_date": "2025-10-25",
  "created_at": "2025-10-25T09:00:00Z",
  "updated_at": "2025-10-25T09:00:00Z"
}
```

**Errors:**

- 400: Missing required field (name, column)
- 400: Invalid column ID or assignee ID

#### GET `/tickets/tickets/{id}/`

Get detailed information about a specific ticket.

**Response 200 OK:**

```json
{
  "id": 1,
  "name": "Fix login page error",
  "description": "Users getting 500 error when logging in",
  "type": "bug",
  "status": "in_progress",
  "priority_id": 4,
  "urgency": "high",
  "importance": "critical",
  "project": 1,
  "project_key": "DEMO",
  "column": 2,
  "column_name": "In Progress",
  "assignee_ids": [1, 2],
  "following": true,
  "comments_count": 5,
  "tag_names": ["backend", "authentication", "urgent"],
  "due_date": "2025-10-25",
  "start_date": "2025-10-20",
  "created_at": "2025-10-20T10:30:00Z",
  "updated_at": "2025-10-21T14:20:00Z"
}
```

**Errors:**

- 404: Ticket not found

#### PATCH `/tickets/tickets/{id}/`

Partially update a ticket. Only send fields you want to change.

**Request:**

```json
{
  "column": 3,
  "priority_id": 4,
  "assignee_ids": [1, 2, 3]
}
```

**Response 200 OK:** (returns full ticket object with updates)

**Common Updates:**

- Move to different column: `{"column": 2}`
- Change priority: `{"priority_id": 4}`
- Update assignees: `{"assignee_ids": [1, 2]}`
- Mark as done: `{"column": 4}` (assuming column 4 is "Done")
- Update dates: `{"due_date": "2025-11-01"}`

#### DELETE `/tickets/tickets/{id}/`

Delete a ticket permanently.

**Response 204 No Content**

**Errors:**

- 404: Ticket not found

#### POST `/tickets/tickets/{id}/toggle_follow/`

Toggle following status for current user.

**Response 200 OK:**

```json
{
  "following": true
}
```

---

### Projects Endpoints

#### GET `/tickets/projects/`

List all projects for the current user.

**Response 200 OK:**

```json
[
  {
    "id": 1,
    "name": "Demo Project",
    "key": "DEMO",
    "description": "Demo project for testing",
    "created_by": 1,
    "created_at": "2025-10-01T00:00:00Z",
    "updated_at": "2025-10-01T00:00:00Z"
  }
]
```

#### POST `/tickets/projects/`

Create a new project.

**Request:**

```json
{
  "name": "Mobile App",
  "key": "MOB",
  "description": "Mobile application project"
}
```

**Response 201 Created:** (returns project object)

---

### Columns Endpoints

#### GET `/tickets/columns/`

Get all kanban columns for the user's project.

**Response 200 OK:**

```json
[
  {
    "id": 1,
    "name": "New",
    "order": 0,
    "color": "#0052cc",
    "project": 1,
    "tickets_count": 5,
    "created_at": "2025-10-01T00:00:00Z",
    "updated_at": "2025-10-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "In Progress",
    "order": 1,
    "color": "#ff9800",
    "project": 1,
    "tickets_count": 12,
    "created_at": "2025-10-01T00:00:00Z",
    "updated_at": "2025-10-01T00:00:00Z"
  }
]
```

#### POST `/tickets/columns/`

Create a new column.

**Request:**

```json
{
  "name": "Testing",
  "order": 3,
  "color": "#9c27b0"
}
```

**Response 201 Created:** (returns column object)

#### POST `/tickets/columns/reorder/`

Reorder columns by providing new order.

**Request:**

```json
{
  "order": [
    { "id": 1, "order": 0 },
    { "id": 3, "order": 1 },
    { "id": 2, "order": 2 }
  ]
}
```

**Response 200 OK:**

```json
{
  "status": "columns reordered"
}
```

---

### Tags Endpoints

#### GET `/tickets/tags/`

Get all tags (project-specific organizational units).

**Query Parameters:**

- `project` (int): Filter by project ID
- `search` (string): Search in tag name and description

**Response 200 OK:**

```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "name": "Nikora",
      "description": "Nikora supermarket chain tickets",
      "color": "#0052cc",
      "project": 1,
      "project_name": "Main Project",
      "tickets_count": 12,
      "contacts_count": 2,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### POST `/tickets/tags/`

Create a new tag (superadmin only).

**Request:**

```json
{
  "name": "Nokia",
  "description": "Nokia telecommunications tickets",
  "color": "#0052cc",
  "project": 1
}
```

**Response 201 Created:** (returns tag object)

#### POST `/tickets/tags/{id}/add_contact/`

Associate a contact with a tag.

**Request:**

```json
{
  "contact_id": 1,
  "role": "Primary Contact"
}
```

**Response 201 Created:**

```json
{
  "id": 1,
  "tag": 1,
  "contact": {
    "id": 1,
    "name": "Giorgi Beridze",
    "email": "g.beridze@example.com"
  },
  "role": "Primary Contact",
  "added_at": "2025-10-25T10:00:00Z"
}
```

---

### Contacts Endpoints

#### GET `/tickets/contacts/`

List all contacts.

**Query Parameters:**

- `search` (string): Search in name, email, title, department

**Response 200 OK:**

```json
{
  "count": 3,
  "results": [
    {
      "id": 1,
      "name": "Giorgi Beridze",
      "email": "g.beridze@example.com",
      "phone": "+995 555 123 456",
      "title": "IT Manager",
      "department": "IT Department",
      "description": "Primary technical contact",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### POST `/tickets/contacts/`

Create a new contact.

**Request:**

```json
{
  "name": "John Smith",
  "email": "j.smith@example.com",
  "phone": "+995 555 999 888",
  "title": "Project Manager",
  "department": "Operations",
  "description": "Main point of contact for project"
}
```

**Response 201 Created:** (returns contact object)

---

### Comments Endpoints

#### GET `/tickets/comments/?ticket={ticket_id}`

Get comments for a specific ticket.

**Response 200 OK:**

```json
[
  {
    "id": 1,
    "ticket": 5,
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "first_name": "",
      "last_name": ""
    },
    "content": "I've started working on this issue.",
    "created_at": "2025-10-21T09:00:00Z",
    "updated_at": "2025-10-21T09:00:00Z"
  }
]
```

#### POST `/tickets/comments/`

Add a comment to a ticket.

**Request:**

```json
{
  "ticket": 5,
  "content": "This has been fixed and deployed to production."
}
```

**Response 201 Created:** (returns comment object)

---

### Attachments Endpoints

#### POST `/tickets/attachments/`

Upload a file attachment to a ticket.

**Content-Type:** `multipart/form-data`

**Form Fields:**

- `ticket` (int): Ticket ID
- `file` (file): File to upload
- `filename` (string): Original filename

**Response 201 Created:**

```json
{
  "id": 3,
  "ticket": 5,
  "file": "http://31.97.181.167/media/attachments/2025/10/21/screenshot.png",
  "filename": "screenshot.png",
  "uploaded_by": {
    "id": 1,
    "username": "admin"
  },
  "uploaded_at": "2025-10-21T16:15:00Z"
}
```

#### GET `/tickets/attachments/?ticket={ticket_id}`

Get attachments for a specific ticket.

**Response 200 OK:** (returns array of attachment objects)

---

### Company Endpoints

Companies represent client organizations that the IT business services. Each company can have multiple users (clients) and admins (IT staff assigned to manage their tickets).

#### GET `/tickets/companies/`

List all companies (filtered by permissions and project).

**Query Parameters:**

- `project` (int): Filter by project ID (required for project-specific views)
- `search` (string): Search in name and description

**Response 200 OK:**

```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 5,
      "name": "Nikora",
      "description": "Nikora supermarket chain",
      "logo_url": "http://localhost:8000/media/company_logos/nikora.png",
      "logo_thumbnail_url": "http://localhost:8000/media/company_logos/thumbs/thumb_nikora.png",
      "primary_contact_email": "support@nikora.com",
      "phone": "555-1234",
      "admin_count": 2,
      "user_count": 5,
      "ticket_count": 12,
      "project_count": 1,
      "admin_names": ["John Smith", "Jane Doe"],
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-20T14:30:00Z"
    }
  ]
}
```

#### GET `/tickets/companies/{id}/`

Get full company details with users and admins.

**Response 200 OK:**

```json
{
  "id": 5,
  "name": "Nikora",
  "description": "Nikora supermarket chain",
  "logo": "http://localhost:8000/media/company_logos/nikora.png",
  "logo_url": "http://localhost:8000/media/company_logos/nikora.png",
  "logo_thumbnail": null,
  "logo_thumbnail_url": null,
  "primary_contact_email": "support@nikora.com",
  "phone": "555-1234",
  "admins": [
    {
      "id": 2,
      "username": "john",
      "email": "john@it.com",
      "first_name": "John",
      "last_name": "Smith"
    }
  ],
  "admin_count": 1,
  "users": [
    {
      "id": 9,
      "username": "client1",
      "email": "client@nikora.com",
      "first_name": "Client",
      "last_name": "User"
    }
  ],
  "user_count": 1,
  "ticket_count": 12,
  "project_count": 1,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-20T14:30:00Z"
}
```

#### POST `/tickets/companies/`

Create a new company (superadmin only).

**Request (JSON or multipart/form-data for logo upload):**

```json
{
  "name": "Acme Corp",
  "description": "Acme Corporation",
  "primary_contact_email": "support@acme.com",
  "phone": "555-9999",
  "admin_ids": [2, 3],
  "user_ids": [10, 11],
  "project_ids": [1]
}
```

**Response 201 Created:** (returns full company object)

#### PATCH `/tickets/companies/{id}/`

Update company details. Supports both JSON and multipart/form-data.

**Request (JSON):**

```json
{
  "name": "Nikora Updated",
  "primary_contact_email": "newsupport@nikora.com",
  "phone": "555-4321"
}
```

**Request (multipart/form-data for logo upload):**

```
name=Nikora Updated
logo=<file>
primary_contact_email=newsupport@nikora.com
```

**Response 200 OK:** (returns updated company object)

#### DELETE `/tickets/companies/{id}/`

Delete a company (superadmin only).

**Response 204 No Content**

#### GET `/tickets/companies/{id}/stats/`

Get company health statistics for dashboard display.

**Query Parameters:**

- `project` (int): Filter stats by project ID (optional)

**Response 200 OK:**

```json
{
  "open_tickets": 12,
  "urgent_tickets": 3,
  "overdue_tickets": 2,
  "resolved_this_month": 45,
  "total_tickets": 57,
  "user_count": 5,
  "admin_count": 2,
  "health_status": "critical",
  "last_activity": "2025-12-02T14:30:00Z"
}
```

**Health Status Values:**

- `critical`: Any P1/Critical priority ticket OR >3 overdue tickets
- `attention`: 1-3 overdue tickets OR any urgent unassigned tickets
- `healthy`: No critical issues
- `inactive`: No tickets in 30+ days

#### POST `/tickets/companies/{id}/assign_admin/`

Assign an IT admin to this company. **Also assigns admin role to all projects the company is associated with.**

**Request:**

```json
{
  "user_id": 5
}
```

**Response 200 OK:**

```json
{
  "message": "john assigned as admin to Nikora",
  "company": { ... }
}
```

**Side Effects:**

- User is added to `company.admins` M2M relationship
- UserRole created/updated with `role='admin'` for each project the company is in

#### POST `/tickets/companies/{id}/remove_admin/`

Remove an IT admin from this company.

**Request:**

```json
{
  "user_id": 5
}
```

**Response 200 OK:**

```json
{
  "message": "john removed from Nikora admins",
  "company": { ... }
}
```

**Side Effects:**

- If user is no longer admin of any company in a project, their role is downgraded to 'user' (if they're a company user) or removed entirely

#### POST `/tickets/companies/{id}/assign_user/`

Assign an existing user to this company. **Also assigns user role to all projects the company is associated with.**

**Request:**

```json
{
  "user_id": 10
}
```

**Response 200 OK:**

```json
{
  "message": "client1 assigned to Nikora",
  "company": { ... }
}
```

#### POST `/tickets/companies/{id}/remove_user/`

Remove a company user from this company.

**Request:**

```json
{
  "user_id": 10
}
```

**Response 200 OK:**

```json
{
  "message": "client1 removed from Nikora",
  "company": { ... }
}
```

**Side Effects:**

- If user is no longer associated with any company in a project, their 'user' role is removed

#### POST `/tickets/companies/{id}/create_user/`

Create a new user account AND assign them to this company. Used for creating client/customer accounts.

**Request:**

```json
{
  "username": "newclient",
  "email": "newclient@nikora.com",
  "password": "SecurePass123!",
  "first_name": "New",
  "last_name": "Client"
}
```

**Response 201 Created:**

```json
{
  "message": "User newclient created and assigned to Nikora",
  "user": {
    "id": 15,
    "username": "newclient",
    "email": "newclient@nikora.com",
    "first_name": "New",
    "last_name": "Client"
  }
}
```

**Side Effects:**

- Creates Django User account
- Adds user to `company.users`
- Creates UserRole with `role='user'` for each project the company is in

#### GET `/tickets/companies/{id}/tickets/`

Get all tickets for this company.

**Response 200 OK:** (returns array of ticket objects)

---

### User Management Endpoints

User management for superadmins and staff to manage users across the system.

#### GET `/tickets/users/`

List users. Visibility depends on permissions:

- Superusers see all users
- Staff see all users (read-only for non-superusers)
- Regular users only see users from shared projects

**Query Parameters:**

- `search` (string): Search in username, email, first_name, last_name
- `ordering` (string): Order by field (`username`, `email`, `date_joined`, `last_login`)

**Response 200 OK:**

```json
{
  "count": 10,
  "results": [
    {
      "id": 5,
      "username": "john",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_active": true,
      "is_staff": false,
      "is_superuser": false,
      "date_joined": "2025-01-10T10:00:00Z",
      "last_login": "2025-12-01T08:30:00Z",
      "project_roles": [
        { "project_id": 1, "project_name": "IT-Tech", "role": "admin" }
      ],
      "administered_companies": [{ "id": 5, "name": "Nikora" }],
      "member_companies": []
    }
  ]
}
```

#### GET `/tickets/users/{id}/`

Get detailed user information.

**Response 200 OK:** (same as list item with full details)

#### POST `/tickets/users/`

Create a new user (superadmin/staff only).

**Request:**

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "first_name": "New",
  "last_name": "User",
  "is_active": true,
  "is_staff": false
}
```

**Response 201 Created:** (returns user object)

#### PATCH `/tickets/users/{id}/`

Update user details (superadmin/staff only).

**Request:**

```json
{
  "first_name": "Updated",
  "last_name": "Name",
  "email": "newemail@example.com"
}
```

**Response 200 OK:** (returns updated user object)

#### DELETE `/tickets/users/{id}/`

Delete a user (superadmin only).

**Response 204 No Content**

#### POST `/tickets/users/{id}/assign_role/`

Assign or update a project role for a user.

**Request:**

```json
{
  "project_id": 1,
  "role": "admin"
}
```

**Valid Roles:** `superadmin`, `admin`, `user`, `manager`

**Response 200/201:**

```json
{
  "message": "john assigned as admin in IT-Tech",
  "user_role": {
    "id": 10,
    "user": 5,
    "project": 1,
    "role": "admin",
    "assigned_at": "2025-12-02T10:00:00Z",
    "assigned_by": 1
  },
  "created": true
}
```

#### POST `/tickets/users/{id}/remove_role/`

Remove a project role from a user.

**Request:**

```json
{
  "project_id": 1
}
```

**Response 200 OK:**

```json
{
  "message": "Role removed for john"
}
```

#### POST `/tickets/users/{id}/set_password/`

Set or reset password for a user (superadmin only).

**Request:**

```json
{
  "password": "NewSecurePass123!"
}
```

**Response 200 OK:**

```json
{
  "message": "Password updated for john"
}
```

#### POST `/tickets/users/{id}/toggle_active/`

Enable or disable a user account.

**Response 200 OK:**

```json
{
  "message": "User john is now inactive",
  "is_active": false
}
```

#### GET `/tickets/users/{id}/roles/`

Get all project roles for a user.

**Response 200 OK:**

```json
{
  "roles": [
    {
      "id": 10,
      "project_id": 1,
      "project_name": "IT-Tech",
      "project_key": "ITT",
      "role": "admin",
      "assigned_at": "2025-12-02T10:00:00Z"
    }
  ]
}
```

---

### Dashboard Endpoints

Dashboard endpoints for quick access to aggregated statistics.

#### GET `/tickets/dashboard/company-health/`

Get health status of all companies for the selected project.

**Query Parameters:**

- `project` (int): Project ID (required)

**Response 200 OK:**

```json
{
  "companies": [
    {
      "id": 5,
      "name": "Nikora",
      "health_status": "critical",
      "open_tickets": 12,
      "urgent_tickets": 3,
      "overdue_tickets": 2
    }
  ]
}
```

#### GET `/tickets/dashboard/attention-needed/`

Get tickets that need immediate attention.

**Query Parameters:**

- `project` (int): Project ID (required)
- `limit` (int): Maximum number of tickets (default: 10)

**Response 200 OK:** (returns array of urgent/overdue tickets)

#### GET `/tickets/dashboard/newest/`

Get most recently created tickets.

**Query Parameters:**

- `project` (int): Project ID (required)
- `limit` (int): Maximum number of tickets (default: 10)

**Response 200 OK:** (returns array of newest tickets)

#### GET `/tickets/dashboard/activity/`

Get recent activity/changes across all tickets.

**Query Parameters:**

- `project` (int): Project ID (required)
- `limit` (int): Maximum number of activities (default: 20)

**Response 200 OK:** (returns array of recent activities)

#### GET `/tickets/dashboard/workload/`

Get agent workload distribution.

**Query Parameters:**

- `project` (int): Project ID (required)

**Response 200 OK:**

```json
{
  "agents": [
    {
      "id": 2,
      "username": "john",
      "assigned_count": 15,
      "in_progress_count": 5,
      "resolved_today": 3
    }
  ]
}
```

#### GET `/tickets/dashboard/kanban-summary/`

Get summary counts for kanban columns.

**Query Parameters:**

- `project` (int): Project ID (required)

**Response 200 OK:**

```json
{
  "columns": [
    { "id": 1, "name": "To Do", "count": 8 },
    { "id": 2, "name": "In Progress", "count": 5 },
    { "id": 3, "name": "Review", "count": 3 },
    { "id": 4, "name": "Done", "count": 45 }
  ]
}
```

---

## Error Responses

All API endpoints return consistent error responses:

### 400 Bad Request

Invalid input data or validation errors.

```json
{
  "name": ["This field is required."],
  "column": ["Invalid pk \"999\" - object does not exist."]
}
```

### 401 Unauthorized

Missing or invalid authentication credentials.

```json
{
  "detail": "Authentication credentials were not provided."
}
```

or

```json
{
  "detail": "Given token not valid for any token type",
  "code": "token_not_valid",
  "messages": [
    {
      "token_class": "AccessToken",
      "token_type": "access",
      "message": "Token is invalid or expired"
    }
  ]
}
```

### 403 Forbidden

User doesn't have permission to perform this action.

```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found

Resource doesn't exist.

```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error

Server error occurred.

```json
{
  "detail": "Internal server error."
}
```

---

## Common Patterns for LLMs

### 1. Creating a Ticket with Tags and Assignees

```http
POST /tickets/tickets/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Implement user authentication",
  "description": "Add JWT-based authentication to the API",
  "type": "task",
  "priority_id": 3,
  "column": 1,
  "assignee_ids": [1, 2],
  "tag_names": ["backend", "security"],
  "due_date": "2025-11-15"
}
```

### 2. Moving a Ticket to Different Column (Kanban Drag-Drop)

```http
PATCH /tickets/tickets/15/
Authorization: Bearer <token>
Content-Type: application/json

{
  "column": 3
}
```

### 3. Searching and Filtering Tickets

```http
GET /tickets/tickets/?search=authentication&type=bug&priority_id=4&ordering=-created_at
Authorization: Bearer <token>
```

### 4. Adding a Comment to a Ticket

```http
POST /tickets/comments/
Authorization: Bearer <token>
Content-Type: application/json

{
  "ticket": 15,
  "content": "I've reviewed the code and it looks good to merge."
}
```

### 5. Getting Ticket with All Details

```http
GET /tickets/tickets/15/
Authorization: Bearer <token>
```

This returns the full ticket object with all relationships populated.

---

## Pagination

All list endpoints return paginated results:

```json
{
  "count": 150,
  "next": "http://31.97.181.167/api/tickets/tickets/?page=2",
  "previous": null,
  "results": [...]
}
```

- `count`: Total number of items
- `next`: URL for next page (null if last page)
- `previous`: URL for previous page (null if first page)
- `results`: Array of items for current page

**Query Parameters:**

- `page`: Page number (1-indexed)
- `page_size`: Items per page (default: 20, max: 100)

---

## Best Practices for LLMs

1. **Always check response status codes** - Don't assume success
2. **Handle pagination** - Use `next` and `previous` URLs for navigation
3. **Use PATCH for updates** - Only send fields that changed
4. **Include proper headers** - Authorization and Content-Type
5. **Validate before creating** - Check if resources exist first
6. **Use filtering** - Don't fetch all tickets if you only need specific ones
7. **Follow relationships** - Use IDs from responses to fetch related data
8. **Handle errors gracefully** - Parse error messages for user feedback
9. **Use super-secret-key for testing** - Skip JWT auth complexity in development
10. **Check token expiration** - Refresh tokens when access token expires

---

## Testing with cURL

```bash
# Using Super Secret Key (Development)
curl -H "X-Super-Secret-Key: dev-super-secret-key-12345" \
     http://31.97.181.167/api/tickets/tickets/

# Using JWT Token
curl -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
     http://31.97.181.167/api/tickets/tickets/

# Creating a ticket
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"New ticket","type":"task","column":1}' \
     http://31.97.181.167/api/tickets/tickets/
```

---

## Environment Variables

Create `.env` file in backend directory:

```bash
# Django Settings
SECRET_KEY=your-django-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,31.97.181.167

# Super Secret Key (Development Only!)
SUPER_SECRET_KEY=dev-super-secret-key-12345

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ticketing

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## Summary

This API provides a complete ticketing system with:

- JWT authentication + super-secret-key bypass for testing
- Full CRUD operations on tickets, projects, columns, tags, contacts
- Comments and attachments
- Kanban board functionality
- Tag-based organization
- Search, filtering, and pagination
- Consistent error handling

All endpoints follow REST principles and return JSON responses with appropriate HTTP status codes.
