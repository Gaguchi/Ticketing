# Ticketing System - Complete Architecture Guide

> **Last Updated**: October 29, 2025  
> **Version**: 2.0  
> **Status**: Current Implementation with Multi-Tenant Company Support

This document provides a clear, comprehensive understanding of how the Ticketing System works - focusing on **Projects**, **Companies**, **Users**, and **Tickets** as the core entities.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [System Architecture Overview](#system-architecture-overview)
3. [Data Model](#data-model)
4. [User System](#user-system)
5. [Company System](#company-system)
6. [Project System](#project-system)
7. [Ticket System](#ticket-system)
8. [Tag System](#tag-system)
9. [Workflow & Permissions](#workflow--permissions)
10. [API Architecture](#api-architecture)
11. [Frontend Architecture](#frontend-architecture)

---

## Core Concepts

### The Four Pillars

The entire system is built on four foundational entities:

1. **Users** - People who interact with the system
2. **Companies** - Client organizations being serviced
3. **Projects** - Containers that organize work and teams
4. **Tickets** - Units of work within projects

```
User ──manages──> Company ──associated with──> Project ──contains──> Tickets
     ──member of──>                                      ──optional──> Company
```

### Key Principles

- **Project-Centric**: Projects are the main workspace
- **Company Support**: Projects can be associated with multiple client companies
- **Flexible Tickets**: Tickets can be general project tickets or company-specific
- **User Roles**: IT staff manage companies, company users access their tickets
- **Kanban Workflow**: Tickets move through columns (workflow stages)
- **Multi-Assignment**: Tickets can have multiple assignees

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + TypeScript)            │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐     │
│  │  Dashboard  │  │   Kanban     │  │  Ticket Modal  │     │
│  │   Page      │  │   Board      │  │   (Detail)     │     │
│  └─────────────┘  └──────────────┘  └────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                Backend (Django + DRF)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │ Projects │  │ Tickets  │  │   Tags   │   │
│  │ ViewSets │  │ ViewSets │  │ ViewSets │  │ ViewSets │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Django ORM (Models Layer)               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────┐
│    User     │ (Django built-in)
│─────────────│
│ id          │
│ username    │
│ email       │
│ password    │
└─────────────┘
      │ │
      │ └──────────────────────────────┐
      │                                 │ members (M2M)
      │         ┌──────────────┐        │
      │         │   Company    │        │ admins/users (M2M)
      │         │──────────────│        │
      │         │ id           │◄───────┤
      │         │ name         │        │
      │         │ description  │        │
      │         │ admins (M2M) │────────┘
      │         │ users (M2M)  │────────┐
      │         └──────────────┘        │
      │                │                │
      │                │ companies (M2M)│
      │                ↓                │
      │         ┌─────────────┐         │
      │         │   Project   │         │
      │         │─────────────│         │
      │         │ id          │         │
      │         │ key         │◄────────┼──────────┐
      │         │ name        │         │          │ project (FK)
      │         │ description │         │          │
      │         │ lead_user   │         │          │
      │         │ members     │─────────┘          │
      │         │ companies   │────────────────────┘
      │         └─────────────┘
      │                │
      │                │ columns
      │                ↓
      │         ┌─────────────┐
      │         │   Column    │
      │         │─────────────│
      │         │ id          │
      │         │ name        │◄────────┐
      │         │ order       │         │
      │         │ color       │         │
      │         │ project_id  │─────────┘
      │         └─────────────┘
      │                │
      │                │ tickets
      │                ↓
      │         ┌─────────────┐
      │         │   Ticket    │
      │         │─────────────│
      │         │ id          │
      │         │ name        │
      │         │ description │
      │         │ type        │ task/bug/story/epic
      │         │ status      │
      │         │ priority_id │ 1-4
      │         │ urgency     │
      │         │ importance  │
      │         │ project_id  │─────────────────┐
      │         │ company_id  │─ (optional) ────┼──> Company
      │         │ column_id   │─────────────────┘
      │         │ reporter_id │──┐
      │         │ parent_id   │  │ (self-reference for subtasks)
      │         │ due_date    │  │
      │         └─────────────┘  │
      │                │         │
      │                │         │
      ├────assignees───┘         │
      │    (M2M)                 │
      │                          │
      └──reporter────────────────┘

      ┌─────────────┐
      │     Tag     │
      │─────────────│
      │ id          │
      │ name        │
      │ description │
      │ color       │
      │ project_id  │──> Project
      └─────────────┘
           │ │
           │ └──> TicketTag ──> Ticket
           │      (M2M through)
           │
           └────> UserTag ──> User
                  (M2M through)

      ┌─────────────┐
      │   Contact   │ (External contacts - not system users)
      │─────────────│
      │ id          │
      │ name        │
      │ email       │
      │ phone       │
      │ title       │
      └─────────────┘
           │
           └──> TagContact ──> Tag
                (M2M through)

      ┌─────────────┐
      │   Comment   │
      │─────────────│
      │ id          │
      │ ticket_id   │──> Ticket
      │ user_id     │──> User
      │ content     │
      │ created_at  │
      └─────────────┘

      ┌─────────────┐
      │ Attachment  │
      │─────────────│
      │ id          │
      │ ticket_id   │──> Ticket
      │ file        │
      │ filename    │
      │ uploaded_by │──> User
      └─────────────┘
```

### Core Models

| Model          | Purpose                        | Key Fields                                                           |
| -------------- | ------------------------------ | -------------------------------------------------------------------- |
| **User**       | System users (Django built-in) | username, email, password, is_superuser                              |
| **Company**    | Client organization            | name, description, admins (M2M), users (M2M)                         |
| **Project**    | Workspace container            | key (unique), name, lead_username, members (M2M), companies (M2M)    |
| **Column**     | Kanban workflow stage          | name, order, color, project (FK)                                     |
| **Ticket**     | Work item                      | name, type, status, priority_id, project (FK), company (FK optional) |
| **Tag**        | Organizational label           | name, color, project (FK)                                            |
| **Comment**    | Ticket discussion              | content, ticket (FK), user (FK)                                      |
| **Attachment** | File upload                    | file, ticket (FK), uploaded_by (FK)                                  |
| **Contact**    | External contact               | name, email, phone, title                                            |

---

## User System

### User Model

**Uses Django's built-in `User` model** from `django.contrib.auth.models`

```python
User:
  - id (auto)
  - username (unique)
  - email
  - password (hashed)
  - first_name
  - last_name
  - is_superuser (boolean)
  - is_staff (boolean)
  - is_active (boolean)
```

### User Relationships

1. **Project Membership** (M2M)

   - `User.project_memberships` → All projects user is a member of
   - `Project.members` → All users in the project

2. **Ticket Assignment** (M2M)

   - `User.assigned_tickets` → All tickets assigned to user
   - `Ticket.assignees` → All users assigned to ticket

3. **Ticket Reporting** (FK)

   - `User.reported_tickets` → All tickets created by user
   - `Ticket.reporter` → User who created the ticket

4. **Tag Membership** (M2M through UserTag)
   - `User.user_tags` → All tag memberships
   - Tags can represent teams (e.g., "Finances Team")

### Authentication Flow

```
1. User registers → POST /api/tickets/auth/register/
   - Creates User + Project + Default Columns
   - Returns JWT tokens

2. User logs in → POST /api/tickets/auth/login/
   - Validates credentials
   - Returns JWT access + refresh tokens

3. User makes requests
   - Header: Authorization: Bearer <access_token>
   - OR Header: X-Super-Secret-Key: dev-super-secret-key-12345 (dev only)

4. Token expires → POST /api/tickets/auth/token/refresh/
   - Sends refresh_token
   - Gets new access_token
```

### User Roles (Implicit)

While there are no explicit role models, user permissions are determined by:

- **Superuser** (`is_superuser=True`): Can manage tags, all projects, all companies
- **IT Admin** (company admin): Can manage assigned companies and their tickets
- **Company User** (company member): Can view/work on their company's tickets
- **Project Member**: Can create tickets, view project data
- **Ticket Assignee**: Can update assigned tickets
- **Ticket Reporter**: Created the ticket

---

## Company System

### Company Model

```python
Company:
  - id (auto)
  - name (unique) - e.g., "Acme Corp", "Nokia", "Enterprise Client"
  - description (optional) - Company details
  - admins (M2M to User) - IT staff managing this company
  - users (M2M to User) - Client company employees
  - created_at
  - updated_at
```

### Company Purpose

**Companies represent client organizations being serviced:**

1. **Client Organization**: Represents external companies (customers)
2. **IT Staff Assignment**: Admins are IT staff who manage company tickets
3. **User Access**: Company users are client employees who can see their tickets
4. **Project Association**: Companies can be linked to multiple projects
5. **Ticket Tagging**: Tickets can be optionally tagged with a company

### Company Relationships

```
Company:
  ├─ admins (M2M) ──> IT Staff Users
  │   - Manage company tickets
  │   - Auto-assigned to company-specific tickets
  │
  ├─ users (M2M) ──> Client Company Users
  │   - Can view/create tickets for their company
  │   - Access restricted to their company's data
  │
  └─ projects (M2M) ──> Projects
      - Company work happens within these projects
      - Projects can serve multiple companies
```

### Company Use Cases

**Example 1: IT Service Company**

```
Company: "Acme Corp"
├─ Admins: [john@itcompany.com, jane@itcompany.com]  (IT staff)
├─ Users: [alice@acmecorp.com, bob@acmecorp.com]     (Client employees)
├─ Projects: ["Customer Support", "Development"]
└─ Tickets:
   ├─ SUPP-1: "Login issue" (company: Acme Corp)
   ├─ SUPP-5: "Feature request" (company: Acme Corp)
   └─ DEV-3: "Bug fix" (company: Acme Corp)
```

**Example 2: General Project Tickets**

```
Project: "Internal Tools"
├─ Companies: [] (none associated)
└─ Tickets:
   ├─ TOOL-1: "Update documentation" (company: null)
   └─ TOOL-2: "Refactor code" (company: null)
```

### Company-Based Filtering

**Automatic Access Control:**

- **Superusers**: See all tickets across all companies
- **IT Admins**: See tickets from companies they admin
- **Company Users**: See only their company's tickets
- **Project Members**: See all project tickets (if not company-specific)

### Company Admin Features

**IT Admins can:**

- View all tickets for their assigned companies
- Automatically get assigned to new company-specific tickets
- Manage company users
- Associate companies with projects

---

## Project System

### Project Model

```python
Project:
  - id (auto)
  - key (unique, max 10 chars) - e.g., "DEMO", "BUG", "PROJ"
  - name - e.g., "Demo Project", "Bug Tracking"
  - description (optional)
  - lead_username (optional) - Username of project lead
  - members (M2M to User) - Project team members
  - companies (M2M to Company) - Associated client companies
  - created_at
  - updated_at
```

### Project Purpose

**Projects are workspace containers that:**

1. Group related tickets together
2. Define team membership (who can access)
3. Can serve multiple client companies
4. Provide namespace for ticket IDs (e.g., `DEMO-1`, `BUG-42`)
5. Own columns (kanban workflow)
6. Own tags (organizational labels)

### Project Lifecycle

```
1. Project Creation
   - On user registration: auto-creates first project
   - Manual creation: POST /api/tickets/projects/

2. Project Setup
   - Add members: Update project.members M2M
   - Add companies: Update project.companies M2M
   - Create columns: POST /api/tickets/columns/
   - Create tags: POST /api/tickets/tags/ (superuser only)

3. Daily Use
   - Users create tickets within project
   - Tickets can be tagged with specific companies
   - Tickets move through columns
   - Tags organize tickets

4. Project Isolation
   - Users see projects they're members of OR projects linked to their companies
   - Tickets belong to one project only
   - Columns and tags are project-specific
```

### Example Project Structure

```
Project: "Customer Support"
├─ Key: "SUPP"
├─ Members: [user1, user2, user3]  (IT staff)
├─ Companies: [Acme Corp, Nokia, TechStart]  (Clients)
├─ Columns:
│  ├─ To Do (order: 0)
│  ├─ In Progress (order: 1)
│  ├─ Review (order: 2)
│  └─ Done (order: 3)
├─ Tags:
│  ├─ "VIP Customer" (for high-priority clients)
│  ├─ "Bug" (issue type)
│  └─ "Feature Request"
└─ Tickets:
   ├─ SUPP-1: "Login not working" (company: Acme Corp)
   ├─ SUPP-2: "Add dark mode" (company: Nokia)
   ├─ SUPP-3: "Slow dashboard" (company: null - general)
   └─ SUPP-4: "Server maintenance" (company: null - general)
```

---

## Ticket System

### Ticket Model

```python
Ticket:
  # Identification
  - id (auto) - Combined with project.key: "DEMO-1"
  - name - Ticket title
  - description - Detailed description (optional)

  # Classification
  - type - task | bug | story | epic
  - status - new | in_progress | review | done
  - priority_id - 1 (Low) | 2 (Medium) | 3 (High) | 4 (Critical)
  - urgency - low | normal | high
  - importance - low | normal | high | critical

  # Relationships
  - project (FK) - Which project owns this ticket (Required)
  - company (FK, optional, nullable) - Which company this ticket is for
  - column (FK) - Current workflow stage
  - assignees (M2M) - Who is working on it
  - reporter (FK) - Who created it
  - parent (FK self) - Parent ticket for subtasks
  - tags (M2M through TicketTag) - Organizational labels

  # Scheduling
  - due_date (optional)
  - start_date (optional)

  # Metadata
  - following (boolean) - Is user watching this ticket
  - created_at
  - updated_at
```

**Ticket-Company Relationship:**

- **company = null**: General project ticket (internal work, infrastructure, etc.)
- **company = Company**: Company-specific ticket (client work)
- When a company-specific ticket is created, it is automatically assigned to all admins of that company
- Users can see tickets from projects they're members of OR projects linked to their companies

### Ticket Types

| Type      | Purpose              | Example                       |
| --------- | -------------------- | ----------------------------- |
| **task**  | General work item    | "Update documentation"        |
| **bug**   | Something broken     | "Login button doesn't work"   |
| **story** | User feature request | "As a user, I want dark mode" |
| **epic**  | Large initiative     | "Redesign entire dashboard"   |

### Priority System

**Two-Dimensional Priority:**

1. **priority_id** (1-4): Overall priority level

   - 1: Low
   - 2: Medium
   - 3: High
   - 4: Critical

2. **urgency** (low/normal/high): How soon it needs attention

3. **importance** (low/normal/high/critical): Business impact

**Example Combinations:**

- Critical urgency + Critical importance = Drop everything
- High urgency + Low importance = Quick fix when available
- Low urgency + High importance = Important but can be scheduled

### Ticket Workflow

```
1. Ticket Creation (General Project Ticket)
   POST /api/tickets/tickets/
   {
     "name": "Fix login bug",
     "type": "bug",
     "priority_id": 4,
     "urgency": "high",
     "importance": "critical",
     "column": 1,  // To Do column ID
     "assignee_ids": [2, 5],
     "tag_names": ["backend", "security"],
     "due_date": "2025-11-01"
   }

1b. Ticket Creation (Company-Specific Ticket)
   POST /api/tickets/tickets/
   {
     "name": "Setup VPN for Acme Corp",
     "type": "task",
     "priority_id": 3,
     "company": 1,  // Acme Corp company ID
     "column": 1,
     "tag_names": ["networking", "client-work"]
   }
   // Automatically assigns to all admins of Acme Corp

2. Ticket moves through columns (drag & drop in Kanban)
   PATCH /api/tickets/tickets/1/
   { "column": 2 }  // Move to In Progress

3. Update assignments
   PATCH /api/tickets/tickets/1/
   { "assignee_ids": [2, 5, 7] }  // Add another assignee

4. Add comments
   POST /api/tickets/comments/
   {
     "ticket": 1,
     "content": "Working on a fix now"
   }

5. Upload attachments
   POST /api/tickets/attachments/
   FormData: { ticket: 1, file: <file> }

6. Mark complete
   PATCH /api/tickets/tickets/1/
   { "column": 4, "status": "done" }
```

### Ticket Display Format

```
Ticket ID Format: {PROJECT_KEY}-{TICKET_ID}
Examples:
  - DEMO-1
  - BUG-42
  - SUPP-1337
```

### Subtasks

Tickets can have parent-child relationships:

```
DEMO-1: "Build new feature" (parent)
├─ DEMO-2: "Design UI mockups" (subtask)
├─ DEMO-3: "Implement backend API" (subtask)
└─ DEMO-4: "Write tests" (subtask)
```

---

## Tag System

### Tag Model

```python
Tag:
  - id (auto)
  - name (unique per project)
  - description (optional)
  - color (#hex color)
  - project (FK) - Tags are project-specific
  - created_by (FK to User)
  - created_at
  - updated_at
```

### Tag Purpose

**Tags provide flexible organization beyond columns:**

- Client/Customer labels ("VIP Client", "Nokia", "Enterprise")
- Team assignments ("Backend Team", "Finances Team")
- Categories ("Security", "Performance", "UI/UX")
- Locations ("Office A", "Remote")
- Any custom classification

### Tag Permissions

**Only superusers can:**

- Create tags: `POST /api/tickets/tags/`
- Edit tags: `PATCH /api/tickets/tags/{id}/`
- Delete tags: `DELETE /api/tickets/tags/{id}/`

**All users can:**

- View tags: `GET /api/tickets/tags/`
- Add tags to tickets: `ticket.tag_names = ["tag1", "tag2"]`

### Tag Relationships

1. **TicketTag** (M2M through model)

   - Links tickets to tags
   - Tracks who added tag and when
   - `ticket.tags.all()` → All tags on ticket

2. **UserTag** (M2M through model)

   - Links users to tags (team membership)
   - `user.user_tags.all()` → User's tag memberships
   - Example: User belongs to "Backend Team" tag

3. **TagContact** (M2M through model)
   - Links external contacts to tags
   - `tag.tag_contacts.all()` → Contacts for this tag
   - Example: "Nokia" tag has contact persons

---

## Workflow & Permissions

### Access Control

```
Superuser:
  ✓ Full access to all projects, tickets, companies, tags
  ✓ Can create/edit/delete tags and companies
  ✓ Can manage any ticket
  ✓ System administration

IT Admin (Company Admin):
  ✓ View all projects linked to their companies
  ✓ View company-specific tickets in those projects
  ✓ Auto-assigned to new company-specific tickets
  ✓ Can manage company users
  ✓ Can create/update/delete their companies
  ✗ Cannot manage tags (view only)
  ✗ Cannot access unrelated projects

Company User:
  ✓ View projects linked to their companies
  ✓ View company-specific tickets (read-only for their company)
  ✓ Create tickets for their company
  ✗ Cannot manage companies
  ✗ Cannot access unrelated projects

Project Member:
  ✓ View all tickets in their projects (general + company-specific)
  ✓ Create tickets in their projects
  ✓ Update tickets they're assigned to
  ✗ Cannot manage tags (view only)
  ✗ Cannot manage companies
  ✗ Cannot access other projects

Non-Member:
  ✗ Cannot see project
  ✗ Cannot access tickets
  ✗ Cannot see companies
```

### Data Isolation

**Project-Level Isolation:**

- Users see projects they're members of OR projects linked to their companies
- API filters tickets/columns/tags by user's accessible projects
- Cross-project references not allowed

**Company-Level Isolation:**

- Company admins can manage their company's users and tickets
- Company users can only view their company's tickets
- Tickets can be general (no company) or company-specific
- Auto-assignment: Company-specific tickets automatically assigned to company admins

**Implementation:**

```python
# In TicketViewSet
def get_queryset(self):
    user = self.request.user
    if user.is_superuser:
        return Ticket.objects.all()

    # Get projects where user is a member
    member_projects = Project.objects.filter(members=user)

    # Get companies where user is admin or member
    user_companies = Company.objects.filter(
        Q(admins=user) | Q(users=user)
    )

    # Get projects associated with user's companies
    company_projects = Project.objects.filter(
        companies__in=user_companies
    )

    # Combine both sets
    all_project_ids = set(member_projects.values_list('id', flat=True)) | \
                      set(company_projects.values_list('id', flat=True))

    return Ticket.objects.filter(project_id__in=all_project_ids)

def perform_create(self, serializer):
    ticket = serializer.save(reporter=self.request.user)

    # Auto-assign company-specific tickets to company admins
    if ticket.company and ticket.company.admins.exists():
        ticket.assignees.set(ticket.company.admins.all())
```

---

## API Architecture

### Authentication

**Two methods:**

1. **JWT Tokens** (Production)

```
Header: Authorization: Bearer <access_token>
```

2. **Super Secret Key** (Development Only)

```
Header: X-Super-Secret-Key: dev-super-secret-key-12345
```

### API Endpoints

**Base URL:** `http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api`

#### Authentication

```
POST   /tickets/auth/register/      - Register new user + project
POST   /tickets/auth/login/          - Login and get tokens
POST   /tickets/auth/token/refresh/  - Refresh access token
GET    /tickets/auth/me/             - Get current user info (includes company info)
```

#### Companies

```
GET    /tickets/companies/           - List companies (filtered by user access)
POST   /tickets/companies/           - Create company (superuser/IT admin)
GET    /tickets/companies/{id}/      - Get company details
PATCH  /tickets/companies/{id}/      - Update company (superuser/company admin)
DELETE /tickets/companies/{id}/      - Delete company (superuser/company admin)
POST   /tickets/companies/{id}/assign_admin/ - Add IT admin to company
POST   /tickets/companies/{id}/remove_admin/ - Remove IT admin from company
POST   /tickets/companies/{id}/assign_user/  - Add company user
POST   /tickets/companies/{id}/remove_user/  - Remove company user
GET    /tickets/companies/{id}/tickets/      - List all tickets for company
```

**Company Response:**

```json
{
  "id": 1,
  "name": "Acme Corp",
  "description": "Manufacturing client",
  "admins": [{ "id": 2, "email": "admin@it.com", "first_name": "John" }],
  "users": [{ "id": 5, "email": "user@acme.com", "first_name": "Jane" }],
  "ticket_count": 15,
  "admin_count": 2,
  "user_count": 10,
  "project_count": 3,
  "admin_ids": [2, 3],
  "user_ids": [5, 6, 7]
}
```

#### Projects

```
GET    /tickets/projects/            - List user's projects
POST   /tickets/projects/            - Create new project
GET    /tickets/projects/{id}/       - Get project details
PATCH  /tickets/projects/{id}/       - Update project (includes companies)
DELETE /tickets/projects/{id}/       - Delete project
```

**Project Response (includes companies):**

```json
{
  "id": 1,
  "name": "IT Services",
  "key": "ITS",
  "companies": [
    { "id": 1, "name": "Acme Corp", "ticket_count": 15 },
    { "id": 2, "name": "Nokia", "ticket_count": 8 }
  ],
  "company_ids": [1, 2],
  "member_count": 5
}
```

#### Tickets

```
GET    /tickets/tickets/             - List tickets (paginated, filterable)
POST   /tickets/tickets/             - Create ticket
GET    /tickets/tickets/{id}/        - Get ticket details
PATCH  /tickets/tickets/{id}/        - Update ticket
DELETE /tickets/tickets/{id}/        - Delete ticket
POST   /tickets/tickets/{id}/toggle_follow/ - Follow/unfollow
```

#### Columns

```
GET    /tickets/columns/             - List project columns
POST   /tickets/columns/             - Create column
PATCH  /tickets/columns/{id}/        - Update column
DELETE /tickets/columns/{id}/        - Delete column
POST   /tickets/columns/reorder/     - Reorder all columns
```

#### Tags

```
GET    /tickets/tags/                - List project tags
POST   /tickets/tags/                - Create tag (superuser only)
GET    /tickets/tags/{id}/           - Get tag details
PATCH  /tickets/tags/{id}/           - Update tag (superuser only)
DELETE /tickets/tags/{id}/           - Delete tag (superuser only)
POST   /tickets/tags/{id}/add_contact/ - Link contact to tag
```

#### Contacts

```
GET    /tickets/contacts/            - List contacts
POST   /tickets/contacts/            - Create contact
GET    /tickets/contacts/{id}/       - Get contact details
PATCH  /tickets/contacts/{id}/       - Update contact
DELETE /tickets/contacts/{id}/       - Delete contact
```

#### Comments

```
GET    /tickets/comments/?ticket={id} - List ticket comments
POST   /tickets/comments/             - Create comment
PATCH  /tickets/comments/{id}/        - Update comment
DELETE /tickets/comments/{id}/        - Delete comment
```

#### Attachments

```
GET    /tickets/attachments/?ticket={id} - List ticket attachments
POST   /tickets/attachments/             - Upload attachment
DELETE /tickets/attachments/{id}/        - Delete attachment
```

### Filtering & Search

**Ticket List Filters:**

```
GET /tickets/tickets/?search=login
GET /tickets/tickets/?status=in_progress
GET /tickets/tickets/?type=bug
GET /tickets/tickets/?priority_id=4
GET /tickets/tickets/?column=1
GET /tickets/tickets/?assignee=5
GET /tickets/tickets/?ordering=-created_at
GET /tickets/tickets/?page=2&page_size=50
```

**Combined:**

```
GET /tickets/tickets/?status=in_progress&priority_id=4&search=login&ordering=-created_at
```

---

## Frontend Architecture

### Technology Stack

- **React 18.3** - UI library
- **TypeScript 5.6** - Type safety
- **Vite 7.1** - Build tool
- **Ant Design 5.x** - UI components
- **React Router v6** - Routing
- **@dnd-kit** - Drag-and-drop

### Component Structure

```
App.tsx (Root)
├── CompanyProvider (Context)
│
├── Dashboard Page
│   ├── Filter Boxes (draggable)
│   │   ├── Unassigned Tickets
│   │   ├── Assigned to Me
│   │   ├── In Progress
│   │   ├── New Tickets
│   │   └── Critical Priority
│   └── All Tickets Table
│       └── TicketModal (detail view)
│
├── Tickets Page
│   ├── View Toggle (List/Kanban)
│   ├── Search & Filters (includes company filter)
│   ├── Table View (Jira-style)
│   └── Kanban View
│       ├── KanbanBoard
│       │   └── KanbanColumn (for each Column)
│       │       └── TicketCard (for each Ticket)
│       │           └── TicketModal (on click)
│       └── Add Column Button
│
├── Companies Page (planned)
│   ├── Company List
│   ├── Company Details
│   ├── Admin Management
│   └── User Management
│
├── Customers Page (placeholder)
└── Settings Page (placeholder)
```

### Key Components

**KanbanBoard**

- Displays columns horizontally
- Handles drag-and-drop between columns
- Scrollable container for many columns

**KanbanColumn**

- Represents one workflow stage (Column)
- Shows ticket count
- Sortable ticket list
- Add ticket button

**TicketCard**

- Shows ticket summary
- Type icon with color
- Priority indicator
- Assignee avatars
- Comment count
- Click to open modal

**TicketModal** (Jira-style)

- Full ticket details
- Editable fields
- Comments section
- Attachments
- Activity history
- Subtasks
- Linked tickets

### State Management

**Current Implementation:**

- `useState` for component state
- `useEffect` for data fetching
- Props drilling for shared state
- **CompanyContext** for company-related state

**CompanyContext** (Implemented):

```typescript
interface CompanyContextType {
  selectedCompany: Company | null;
  availableCompanies: Company[];
  isITAdmin: boolean;
  hasCompanies: boolean;
  setSelectedCompany: (company: Company | null) => void;
}

// Provides company state to entire app
// Persists selected company to localStorage
// Used for filtering tickets by company
```

**Future**: Context API or Zustand for global state

### Data Flow

```
1. User Action (click, drag, submit)
   ↓
2. Component Event Handler
   ↓
3. API Call (fetch/axios)
   ↓
4. Backend Endpoint (Django REST)
   ↓
5. Database Update (PostgreSQL)
   ↓
6. API Response
   ↓
7. State Update (useState)
   ↓
8. Re-render (React)
   ↓
9. Updated UI
```

---

## Summary: How It All Works Together

### User Journey

1. **Registration**

   - User registers → Creates User + Project + Default Columns
   - Auto-logged in with JWT tokens

2. **View Dashboard**

   - Sees filter boxes (Unassigned, Assigned to Me, etc.)
   - Sees all tickets in their projects OR projects linked to their companies

3. **Create Ticket**

   - Opens Tickets page
   - Clicks "Create Ticket"
   - Fills form: name, type, priority, assigns users, adds tags
   - **Optional:** Select company (if IT admin creating client ticket)
   - If company selected → Auto-assigned to company admins
   - Ticket appears in first column

4. **Company Management** (IT Admin Only)

   - Navigate to Companies page
   - Create new company: "Acme Corp"
   - Add IT admins (can manage tickets)
   - Add company users (clients can view tickets)
   - Link company to projects

5. **Work on Ticket**

   - Drag ticket to "In Progress" column
   - Add comments: "Working on this now"
   - Upload screenshot attachment
   - Update assignees if needed

6. **Complete Ticket**

   - Drag to "Done" column
   - Status auto-updates
   - Comment: "Resolved - deployed to production"

7. **Organize with Tags**
   - Superuser creates tag: "VIP Customer"
   - Add tag to important tickets
   - Filter tickets by tag and/or company

### System Flow

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│  User    │────>│  Project  │────>│  Ticket  │
└──────────┘     └───────────┘     └──────────┘
     │                 │                  │
     │                 ↓                  ↓
     │            ┌─────────┐      ┌───────────┐
     └───────────>│ Company │<─────│ (optional)│
                  └─────────┘      └───────────┘
     │
     ↓
 JWT Auth         Workspace          Work Item
 Permissions      Container          Management
 Project          Columns            Comments
 Membership       Tags               Attachments
 Company Roles    Members            Assignments
 (IT Admin/User)  Companies          Company Link
```

### Key Relationships

```
User ─┬─ member of ──> Projects ─┬─> has ──> Tickets
      │                          │
      ├─ admin of ──> Companies ─┤
      │                          │
      └─ user of ──> Companies ──┘
      │
      └─ assigned to ─> Tickets ──> belongs to ──> Project
                          │                             │
                          ├─ for company ──> Company ───┘
                          │                   (optional)
                          ├─ in column ──> Column ──> Project
                          │
                          ├─ has tags ──> Tags ──> Project
                          │
                          ├─ has comments ──> Comments
                          │
                          └─ has attachments ──> Attachments
```

### Multi-Tenant Access Flow

**Example: IT Admin manages tickets for multiple companies**

```
IT Admin (John) is:
  - Admin of Company A (Acme Corp)
  - Admin of Company B (Nokia)
  - Member of Project "IT Services"

Project "IT Services" is linked to:
  - Company A
  - Company B

John can see tickets:
  1. General project tickets (company = null)
  2. Company A tickets (company = A)
  3. Company B tickets (company = B)

When John creates ticket for Company A:
  → Auto-assigned to all Company A admins
  → Company A users can view it (read-only)
  → Other project members can also see it

When John creates general ticket:
  → Only project members can see it
  → No company filtering
  → Manual assignment
```

---

## Next Steps

To extend this system:

1. **Add Email Integration** - Email → Ticket conversion
2. **WebSocket Notifications** - Real-time updates
3. **SLA Management** - Deadline tracking
4. **Automation Rules** - Auto-assign, escalate
5. **Advanced Analytics** - Performance dashboards
6. **Mobile App** - React Native
7. **Third-party Integrations** - Slack, Teams, etc.

---

**For detailed API documentation, see:** [API_REFERENCE.md](api/API_REFERENCE.md)  
**For frontend details, see:** [architecture.md](architecture.md)  
**For deployment, see:** [deployment/](deployment/)
