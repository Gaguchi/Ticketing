# Ticketing System - Complete Architecture Guide

> **Last Updated**: October 29, 2025  
> **Version**: 1.0  
> **Status**: Current Implementation

This document provides a clear, comprehensive understanding of how the Ticketing System works - focusing on **Projects**, **Users**, and **Tickets** as the core entities.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [System Architecture Overview](#system-architecture-overview)
3. [Data Model](#data-model)
4. [User System](#user-system)
5. [Project System](#project-system)
6. [Ticket System](#ticket-system)
7. [Tag System](#tag-system)
8. [Workflow & Permissions](#workflow--permissions)
9. [API Architecture](#api-architecture)
10. [Frontend Architecture](#frontend-architecture)

---

## Core Concepts

### The Three Pillars

The entire system is built on three foundational entities:

1. **Users** - People who interact with the system
2. **Projects** - Containers that organize work and teams
3. **Tickets** - Units of work within projects

```
User ──belongs to──> Project ──contains──> Tickets ──assigned to──> Users
```

### Key Principles

- **Project-Centric**: Everything belongs to a project
- **User Roles**: Django's built-in User model with project memberships
- **Flexible Organization**: Tags and columns provide additional structure
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
      │ └──────────────┐
      │                │ members (M2M)
      │                ↓
      │         ┌─────────────┐
      │         │   Project   │
      │         │─────────────│
      │         │ id          │
      │         │ key         │◄────────────┐
      │         │ name        │             │ project (FK)
      │         │ description │             │
      │         │ lead_user   │             │
      │         └─────────────┘             │
      │                │                    │
      │                │ columns            │
      │                ↓                    │
      │         ┌─────────────┐             │
      │         │   Column    │             │
      │         │─────────────│             │
      │         │ id          │             │
      │         │ name        │◄────────┐   │
      │         │ order       │         │   │
      │         │ color       │         │   │
      │         │ project_id  │─────────┘   │
      │         └─────────────┘             │
      │                │                    │
      │                │ tickets            │
      │                ↓                    │
      │         ┌─────────────┐             │
      │         │   Ticket    │             │
      │         │─────────────│             │
      │         │ id          │             │
      │         │ name        │             │
      │         │ description │             │
      │         │ type        │ task/bug/story/epic
      │         │ status      │             │
      │         │ priority_id │ 1-4         │
      │         │ urgency     │             │
      │         │ importance  │             │
      │         │ column_id   │─────────────┘
      │         │ project_id  │─────────────────┘
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

| Model          | Purpose                        | Key Fields                                                 |
| -------------- | ------------------------------ | ---------------------------------------------------------- |
| **User**       | System users (Django built-in) | username, email, password, is_superuser                    |
| **Project**    | Workspace container            | key (unique), name, lead_username, members (M2M)           |
| **Column**     | Kanban workflow stage          | name, order, color, project (FK)                           |
| **Ticket**     | Work item                      | name, type, status, priority_id, project (FK), column (FK) |
| **Tag**        | Organizational label           | name, color, project (FK)                                  |
| **Comment**    | Ticket discussion              | content, ticket (FK), user (FK)                            |
| **Attachment** | File upload                    | file, ticket (FK), uploaded_by (FK)                        |
| **Contact**    | External contact               | name, email, phone, title                                  |

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

- **Superuser** (`is_superuser=True`): Can manage tags, all projects
- **Project Member**: Can create tickets, view project data
- **Ticket Assignee**: Can update assigned tickets
- **Ticket Reporter**: Created the ticket

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
  - created_at
  - updated_at
```

### Project Purpose

**Projects are workspace containers that:**

1. Group related tickets together
2. Define team membership (who can access)
3. Provide namespace for ticket IDs (e.g., `DEMO-1`, `BUG-42`)
4. Own columns (kanban workflow)
5. Own tags (organizational labels)

### Project Lifecycle

```
1. Project Creation
   - On user registration: auto-creates first project
   - Manual creation: POST /api/tickets/projects/

2. Project Setup
   - Add members: Update project.members M2M
   - Create columns: POST /api/tickets/columns/
   - Create tags: POST /api/tickets/tags/ (superuser only)

3. Daily Use
   - Users create tickets within project
   - Tickets move through columns
   - Tags organize tickets

4. Project Isolation
   - Users only see projects they're members of
   - Tickets belong to one project only
   - Columns and tags are project-specific
```

### Example Project Structure

```
Project: "Customer Support"
├─ Key: "SUPP"
├─ Members: [user1, user2, user3]
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
   ├─ SUPP-1: "Login not working"
   ├─ SUPP-2: "Add dark mode"
   └─ SUPP-3: "Slow dashboard loading"
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
  - project (FK) - Which project owns this ticket
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
1. Ticket Creation
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
  ✓ Full access to all projects, tickets, tags
  ✓ Can create/edit/delete tags
  ✓ Can manage any ticket
  ✓ System administration

Project Member:
  ✓ View all tickets in their projects
  ✓ Create tickets in their projects
  ✓ Update tickets they're assigned to
  ✗ Cannot manage tags (view only)
  ✗ Cannot access other projects

Non-Member:
  ✗ Cannot see project
  ✗ Cannot access tickets
```

### Data Isolation

**Project-Level Isolation:**

- Users only see projects they're members of
- API filters tickets/columns/tags by user's projects
- Cross-project references not allowed

**Implementation:**

```python
# In ViewSets
def get_queryset(self):
    user = self.request.user
    if user.is_superuser:
        return Ticket.objects.all()
    else:
        # Only tickets from user's projects
        return Ticket.objects.filter(
            project__members=user
        )
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
GET    /tickets/auth/me/             - Get current user info
```

#### Projects

```
GET    /tickets/projects/            - List user's projects
POST   /tickets/projects/            - Create new project
GET    /tickets/projects/{id}/       - Get project details
PATCH  /tickets/projects/{id}/       - Update project
DELETE /tickets/projects/{id}/       - Delete project
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
│   ├── Search & Filters
│   ├── Table View (Jira-style)
│   └── Kanban View
│       ├── KanbanBoard
│       │   └── KanbanColumn (for each Column)
│       │       └── TicketCard (for each Ticket)
│       │           └── TicketModal (on click)
│       └── Add Column Button
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

Currently using React hooks:

- `useState` for component state
- `useEffect` for data fetching
- Props drilling for shared state

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
   - Sees all tickets in their projects

3. **Create Ticket**

   - Opens Tickets page
   - Clicks "Create Ticket"
   - Fills form: name, type, priority, assigns users, adds tags
   - Ticket appears in first column

4. **Work on Ticket**

   - Drag ticket to "In Progress" column
   - Add comments: "Working on this now"
   - Upload screenshot attachment
   - Update assignees if needed

5. **Complete Ticket**

   - Drag to "Done" column
   - Status auto-updates
   - Comment: "Resolved - deployed to production"

6. **Organize with Tags**
   - Superuser creates tag: "VIP Customer"
   - Add tag to important tickets
   - Filter tickets by tag

### System Flow

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│  User    │────>│  Project  │────>│  Ticket  │
└──────────┘     └───────────┘     └──────────┘
     │                 │                  │
     │                 │                  │
     ↓                 ↓                  ↓
 JWT Auth         Workspace          Work Item
 Permissions      Container          Management
 Project          Columns            Comments
 Membership       Tags               Attachments
                  Members            Assignments
```

### Key Relationships

```
User ─┬─ member of ──> Projects
      │
      └─ assigned to ─> Tickets ──> belongs to ──> Project
                          │
                          ├─ in column ──> Column ──> Project
                          │
                          ├─ has tags ──> Tags ──> Project
                          │
                          ├─ has comments ──> Comments
                          │
                          └─ has attachments ──> Attachments
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
