# Project Reference Documentation

> **Purpose**: This document maintains critical information about the codebase to prevent errors from incorrect references, wrong variable names, and inconsistent field naming.

**Last Updated**: November 5, 2025

---

## Table of Contents

1. [Model Field Names](#model-field-names)
2. [API Endpoint Patterns](#api-endpoint-patterns)
3. [WebSocket Event Types](#websocket-event-types)
4. [Common Pitfalls](#common-pitfalls)
5. [Naming Conventions](#naming-conventions)

---

## Model Field Names

### ⚠️ CRITICAL: Always Use These Exact Field Names

#### Comment Model

**Location**: `backend/tickets/models.py`

```python
class Comment(models.Model):
    ticket = models.ForeignKey(Ticket, ...)        # NOT "ticket_id" when accessing
    user = models.ForeignKey(User, ...)            # ❌ NOT "author" - NEVER use "author"
    content = models.TextField()
    created_at = models.DateTimeField(...)
    updated_at = models.DateTimeField(...)
```

**✅ Correct Usage**:

```python
comment.user              # Access the user
comment.user.username     # Get username
comment.ticket           # Access the ticket
```

**❌ WRONG - Will Cause Errors**:

```python
comment.author           # AttributeError: 'Comment' object has no attribute 'author'
comment.author.username  # WRONG
```

**Where This Caused Issues**:

- `backend/tickets/signals.py` - `comment_saved` signal handler used `instance.author` instead of `instance.user`
- Led to 500 Internal Server Error when creating comments

---

#### Ticket Model

**Location**: `backend/tickets/models.py`

```python
class Ticket(models.Model):
    name = models.CharField(...)
    description = models.TextField(...)
    type = models.CharField(...)                   # NOT "ticket_type"
    status = models.CharField(...)
    priority_id = models.IntegerField(...)         # NOT just "priority"
    urgency = models.CharField(...)
    importance = models.CharField(...)
    project = models.ForeignKey(Project, ...)      # NOT "project_id" when accessing
    company = models.ForeignKey(Company, ...)      # Optional, can be null
    column = models.ForeignKey(Column, ...)
    reporter = models.ForeignKey(User, ...)        # NOT "creator" or "author"
    parent = models.ForeignKey('self', ...)        # For subtasks
    assignees = models.ManyToManyField(User, ...)  # NOT "assigned_to"
    due_date = models.DateTimeField(...)
    start_date = models.DateTimeField(...)
    created_at = models.DateTimeField(...)
    updated_at = models.DateTimeField(...)
```

---

#### User Model Fields

**Django's built-in User model**:

```python
user.id
user.username         # NOT "name" or "user_name"
user.email
user.first_name
user.last_name
user.is_staff
user.is_active
user.is_superuser
```

---

## API Endpoint Patterns

### RESTful URL Structure

#### Nested Routes (Preferred for Related Resources)

```
GET    /api/tickets/tickets/{ticket_id}/comments/              # List comments for ticket
POST   /api/tickets/tickets/{ticket_id}/comments/              # Create comment for ticket
GET    /api/tickets/tickets/{ticket_id}/comments/{comment_id}/ # Get specific comment
PATCH  /api/tickets/tickets/{ticket_id}/comments/{comment_id}/ # Update comment
DELETE /api/tickets/tickets/{ticket_id}/comments/{comment_id}/ # Delete comment
```

**ViewSet Implementation Pattern**:

```python
def get_queryset(self):
    queryset = super().get_queryset()
    ticket_id = self.kwargs.get('ticket_id')
    if ticket_id is not None:
        queryset = queryset.filter(ticket_id=ticket_id)
    return queryset

def perform_create(self, serializer):
    ticket_id = self.kwargs.get('ticket_id')
    if ticket_id:
        ticket = Ticket.objects.get(id=ticket_id)  # Get the OBJECT, not just ID
        serializer.save(
            user=self.request.user,
            ticket=ticket  # Pass OBJECT, not ticket_id
        )
```

**❌ Common Mistake**:

```python
# WRONG - passing ID instead of object
serializer.save(
    user=self.request.user,
    ticket_id=ticket_id  # Django ORM expects the object for ForeignKey
)
```

---

## WebSocket Event Types

### Channels and Events

#### Notification Channel

**URL**: `ws/notifications/`

**Events**:

- `connection_established` - Sent when WebSocket connects
- `notification` - General notification event

#### Project Ticket Channel

**URL**: `ws/projects/{project_id}/tickets/`

**Events**:

- `connection_established` - Sent when WebSocket connects
- `ticket_created` - New ticket created
- `ticket_updated` - Ticket modified
- `ticket_deleted` - Ticket removed
- `comment_added` - New comment on ticket
- `comment_updated` - Comment edited
- `comment_deleted` - Comment removed
- `user_typing` - User is typing a comment

**Comment Event Data Structure**:

```python
{
    'type': 'comment_added',
    'data': {
        'comment_id': int,
        'ticket_id': int,
        'ticket_key': str,  # e.g., "TICK-123"
        'content': str,
        'author': {         # Note: serialized as 'author' in WebSocket
            'id': int,
            'username': str
        } or None,
        'created_at': str  # ISO format
    }
}
```

**⚠️ Important Note**:

- In the **database model**, the field is `user`
- In **WebSocket events**, it's serialized as `author` for the frontend
- Always use `instance.user` in backend code
- Frontend receives it as `author` in WebSocket messages

#### Presence Channel

**URL**: `ws/projects/{project_id}/presence/`

**Events**:

- `user_status` - User joined/left
  - `action`: 'joined' | 'left'
  - `user_id`: int
  - `username`: str

---

## Common Pitfalls

### 1. ❌ ForeignKey Field Name Confusion

**Problem**: Using `field_id` instead of `field` when accessing related objects

```python
# ❌ WRONG
comment.user_id         # Returns integer ID
user = User.objects.get(id=comment.user_id)  # Unnecessary query

# ✅ CORRECT
comment.user            # Returns User object directly
comment.user.username   # Access related field directly
```

**When to use `_id`**:

- Only when you need just the ID number
- When filtering: `Comment.objects.filter(user_id=3)`
- When assigning: `comment.user_id = 3` (but prefer `comment.user = user_obj`)

### 2. ❌ Incorrect Signal Field Access

**Location**: `backend/tickets/signals.py`

**Problem**: Signals use `instance.author` but Comment model has `instance.user`

```python
# ❌ WRONG - causes AttributeError
@receiver(post_save, sender=Comment)
def comment_saved(sender, instance, created, **kwargs):
    username = instance.author.username  # WRONG!

# ✅ CORRECT
@receiver(post_save, sender=Comment)
def comment_saved(sender, instance, created, **kwargs):
    if instance.user:  # Add null check
        username = instance.user.username  # CORRECT
```

### 3. ❌ Serializer read_only Fields

**Problem**: Forgetting to mark auto-populated fields as read-only

```python
# ✅ CORRECT
class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'ticket', 'user', 'content', 'created_at', 'updated_at']
        read_only_fields = ['user', 'ticket']  # Set in perform_create
```

**Why**: These fields are set programmatically in `perform_create`, not from request data

### 4. ❌ TypeScript Type Mismatches

**Problem**: Using `NodeJS.Timeout` in browser code

```typescript
// ❌ WRONG - browser doesn't have NodeJS namespace
let timeout: NodeJS.Timeout;
timeout = setTimeout(() => {}, 1000);

// ✅ CORRECT - use number
let timeout: number;
timeout = window.setTimeout(() => {}, 1000);
```

### 5. ❌ React Context Provider Ordering

**Problem**: Using `ProjectProvider` from `ProjectContext.tsx` when `AppContext.tsx` already provides both auth and project functionality

**Location**: `frontend/src/App.tsx`, `frontend/src/pages/Chat.tsx`

```typescript
// ❌ WRONG - ProjectProvider tries to use useAuth before AppProvider
import { ProjectProvider } from "./contexts/ProjectContext";
import { useProject } from "../contexts/ProjectContext";

<AppProvider>
  <ProjectProvider>  {/* This will fail! */}
    <Routes>...</Routes>
  </ProjectProvider>
</AppProvider>

// ✅ CORRECT - AppContext provides both useAuth AND useProject
import { useProject, useAuth } from "../contexts/AppContext";

<AppProvider>  {/* Already includes auth + project */}
  <Routes>...</Routes>
</AppProvider>
```

**Why**: 
- `AppContext.tsx` is the centralized context that provides BOTH authentication AND project management
- It exports three hooks: `useApp()`, `useAuth()`, `useProject()`
- The separate `ProjectContext.tsx` is redundant and tries to use `useAuth` before it's available
- Always use `AppContext` for both auth and project functionality

**Exports from AppContext.tsx**:
```typescript
export const useApp = (): AppContextType => { ... }     // Full context
export const useAuth = () => { ... }                    // Auth-only subset
export const useProject = () => { ... }                 // Project-only subset
```

---

## Naming Conventions

### React Context Architecture

The application uses a centralized context architecture:

```
AppProvider (AppContext.tsx)
├── Provides: useAuth(), useProject(), useApp()
├── State: user, token, selectedProject, availableProjects
└── Combines authentication + project management

CompanyProvider (CompanyContext.tsx)  
├── Provides: useCompany()
└── State: companies, selectedCompany

WebSocketProvider (WebSocketContext.tsx)
├── Provides: useWebSocketContext()
└── State: WebSocket connections, notifications
```

**⚠️ IMPORTANT**: 
- Always import `useAuth` and `useProject` from `./contexts/AppContext`
- Do NOT use `ProjectContext.tsx` (it's redundant and incompatible)
- Provider order in App.tsx: `AppProvider` → `CompanyProvider` → `BrowserRouter` → `WebSocketProvider`

**Correct imports**:
```typescript
// ✅ CORRECT
import { useAuth, useProject } from "../contexts/AppContext";

// ❌ WRONG - Don't use this
import { useProject } from "../contexts/ProjectContext";
```

### Backend (Python/Django)

#### Models

- **ClassName**: PascalCase (e.g., `Comment`, `Ticket`, `UserProfile`)
- **field_name**: snake_case (e.g., `created_at`, `user_id`, `ticket_key`)

#### Views/ViewSets

- **ClassName**: PascalCase + "ViewSet" or "View" (e.g., `CommentViewSet`, `TicketListView`)
- **method_name**: snake_case (e.g., `get_queryset`, `perform_create`)

#### Serializers

- **ClassName**: PascalCase + "Serializer" (e.g., `CommentSerializer`, `UserSerializer`)

#### Signals

- **function_name**: snake_case + past tense (e.g., `comment_saved`, `ticket_created`)

### Frontend (TypeScript/React)

#### Components

- **ComponentName**: PascalCase (e.g., `TicketComments`, `MainLayout`)
- **filename**: PascalCase.tsx (e.g., `TicketComments.tsx`)

#### Interfaces/Types

- **InterfaceName**: PascalCase (e.g., `Comment`, `User`, `WebSocketMessage`)

#### Functions/Variables

- **functionName**: camelCase (e.g., `handleSendComment`, `loadComments`)
- **variableName**: camelCase (e.g., `newComment`, `isLoading`)

#### Constants

- **CONSTANT_NAME**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`, `MAX_RETRIES`)

---

## Database Relationships Quick Reference

### One-to-Many Relationships

```python
# Comment belongs to Ticket
comment.ticket          # Get the ticket (Ticket object)
ticket.comments.all()   # Get all comments (QuerySet)

# Ticket belongs to Project
ticket.project          # Get the project (Project object)
project.tickets.all()   # Get all tickets (QuerySet)
```

### Many-to-Many Relationships

```python
# Ticket has many assignees
ticket.assignees.all()           # Get all assigned users (QuerySet)
ticket.assignees.add(user)       # Add assignee
ticket.assignees.remove(user)    # Remove assignee
ticket.assignees.exists()        # Check if any assignees

# User has many assigned tickets
user.assigned_tickets.all()      # Get all tickets assigned to user
```

---

## File Locations Quick Reference

### Backend

```
backend/
├── tickets/
│   ├── models.py          # Comment, Ticket, Project, etc.
│   ├── serializers.py     # CommentSerializer, TicketSerializer, etc.
│   ├── views.py           # CommentViewSet, TicketViewSet, etc.
│   ├── urls.py            # API route definitions
│   ├── signals.py         # post_save, pre_delete handlers
│   ├── consumers.py       # WebSocket consumers
│   └── routing.py         # WebSocket URL routing
├── config/
│   ├── settings.py        # Django settings
│   ├── asgi.py            # ASGI configuration for WebSockets
│   └── urls.py            # Root URL configuration
```

### Frontend

```
frontend/
├── src/
│   ├── components/
│   │   ├── TicketComments.tsx      # Real-time comment component
│   │   ├── TicketComments.css      # Comment styling
│   │   └── TicketModal.tsx         # Ticket detail modal
│   ├── contexts/
│   │   ├── WebSocketContext.tsx    # WebSocket connection management
│   │   └── AuthContext.tsx         # Authentication state
│   ├── services/
│   │   └── comment.service.ts      # Comment API calls
│   └── config/
│       └── api.ts                  # API endpoint definitions
```

---

## Debugging Checklist

When encountering errors, check these common issues:

### 500 Internal Server Error

1. ✅ Check backend logs in Dokploy for the actual error
2. ✅ Verify field names match model definitions (e.g., `user` not `author`)
3. ✅ Ensure ForeignKey fields pass objects, not IDs
4. ✅ Check signal handlers use correct field names
5. ✅ Verify serializer read_only_fields are set correctly

### 404 Not Found

1. ✅ Check URL pattern matches exactly (trailing slashes matter!)
2. ✅ Verify nested route parameters (e.g., `ticket_id`) are in URL
3. ✅ Check urls.py includes the route
4. ✅ Ensure ViewSet is registered with router

### 400 Bad Request

1. ✅ Check serializer validation rules
2. ✅ Verify required fields vs. read_only_fields
3. ✅ Ensure request body matches expected format
4. ✅ Check for missing or extra fields in request

### WebSocket Issues

1. ✅ Verify WebSocket URL format: `ws://` not `wss://` for local dev
2. ✅ Check CORS/ALLOWED_HOSTS settings for Traefik domains
3. ✅ Ensure channel layer (Redis) is running
4. ✅ Verify consumer is registered in routing.py

---

## Version History

### v1.0 - November 5, 2025

- Initial document creation
- Added Comment model field reference (`user` vs `author` issue)
- Added API endpoint patterns for nested routes
- Added WebSocket event types
- Added common pitfalls section
- Added naming conventions
- Added debugging checklist

---

## Contributing to This Document

When you encounter a bug caused by:

- Incorrect field name
- Wrong variable reference
- Inconsistent naming
- API endpoint confusion

**Add it to this document** with:

1. The incorrect usage (marked with ❌)
2. The correct usage (marked with ✅)
3. Where the error occurred
4. How to prevent it in the future
