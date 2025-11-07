# Project Reference Documentation

> **Purpose**: This document maintains critical information about the codebase to prevent errors from incorrect references, wrong variable names, and inconsistent field naming.

**Last Updated**: November 5, 2025

---

## Python Virtual Environment

### ⚠️ CRITICAL: Always Activate venv Before Running Commands

**Location**: `backend/venv/`

**Activation Commands**:

```powershell
# Windows PowerShell (ALWAYS use this first!)
# From project root (E:\Work\WebDev\Ticketing\)
.\backend\venv\Scripts\Activate.ps1

# Or if already in backend directory
..\backend\venv\Scripts\Activate.ps1
# OR
.\venv\Scripts\Activate.ps1

# Then run commands
python manage.py makemigrations
pip install <package>
```

**Why This Matters**:

- Installing packages globally causes conflicts and permission errors
- Django commands must run in the venv to find project dependencies
- Each project has its own isolated Python environment

**Common Mistakes**:

```powershell
# ❌ WRONG - No venv activation
cd backend
python manage.py migrate  # Will fail or use wrong Python

# ❌ WRONG - Installing globally
pip install django  # Installs to system Python

# ✅ CORRECT - Always activate first
.\backend\venv\Scripts\Activate.ps1
cd backend
python manage.py migrate
```

**When venv is Active**:

- PowerShell prompt shows `(venv)` prefix
- `python` points to `backend/venv/Scripts/python.exe`
- `pip install` adds packages to `backend/venv/Lib/site-packages/`

**Deactivation**:

```powershell
deactivate  # Return to system Python
```

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
  - **Data Structure**: `{ type: 'notification', data: { /* Notification object */ } }`
  - Note: Notification data is nested in `data.data` field

**Notification Event Structure**:

```json
{
  "type": "notification",
  "data": {
    "id": 1,
    "type": "comment_added",
    "title": "New Comment",
    "message": "User commented on TICK-12",
    "link": "/tickets/12",
    "is_read": false,
    "data": {
      "ticket_id": 12,
      "ticket_key": "TICK-12",
      "comment_id": 8,
      "project_id": 4
    },
    "created_at": "2025-11-07T14:47:38.063269+00:00",
    "timestamp": "2025-11-07T14:47:38.065488+00:00"
  }
}
```

**⚠️ CRITICAL**:

- Backend sends notifications wrapped in `{ type: 'notification', data: { /* notification */ } }`
- Frontend must access `data.data`, NOT `data.notification`
- Fixed in `WebSocketContext.tsx`: `if (data.type === 'notification' && data.data)`

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

### 5. ❌ React useEffect Dependency Issues - Object References

**Problem**: Using full objects in useEffect dependencies causes infinite re-renders or constant reconnections

**Location**: `frontend/src/pages/Chat.tsx`

**Issue**: WebSocket constantly disconnecting and reconnecting every 10 seconds

**Root Cause**:

- The `loadRooms` function runs every 10 seconds via `setInterval`
- It calls `setRooms(data)` with a new array, creating new object references
- `setActiveRoom` gets called with a room from the new array
- The `activeRoom` object reference changes (even though the ID is the same)
- useEffect with `[activeRoom]` dependency sees a "change" and re-runs
- WebSocket disconnects and reconnects unnecessarily

```typescript
// ❌ WRONG - Causes constant WebSocket reconnections
useEffect(() => {
  if (!activeRoom || !user) return;

  const wsUrl = `ws/chat/${activeRoom.id}/`;
  webSocketService.connect(wsUrl, onMessage);

  return () => webSocketService.disconnect(wsUrl);
}, [activeRoom, user]); // Full objects - reference changes on every state update!

// ✅ CORRECT - Only depend on primitive values (IDs)
useEffect(() => {
  if (!activeRoom || !user) return;

  const wsUrl = `ws/chat/${activeRoom.id}/`;
  webSocketService.connect(wsUrl, onMessage);

  return () => webSocketService.disconnect(wsUrl);
}, [activeRoom?.id, user?.id]); // Only IDs - stable references
```

**Additional Fix**: Use functional setState to prevent unnecessary activeRoom updates

```typescript
// ❌ WRONG - Always updates activeRoom, causing reference change
if (data.length > 0 && !activeRoom) {
  setActiveRoom(data[0]);
}

// ✅ CORRECT - Only update if necessary, preserve same room
setActiveRoom((current) => {
  if (!current || !data.find((r) => r.id === current.id)) {
    return data[0]; // Set new room if none or current not in list
  }
  // Keep same room but with updated data from API
  return data.find((r) => r.id === current.id) || data[0];
});
```

**Why this matters**:

- Objects and arrays are compared by reference in JavaScript
- Even if data is identical, `{id: 1} !== {id: 1}`
- useEffect re-runs whenever dependency reference changes
- For WebSocket connections, this causes constant disconnect/reconnect cycles
- Users see chat re-rendering, lose scroll position, bad UX

**Best Practice**:

- Always use primitive values (strings, numbers, booleans) in useEffect dependencies
- Use `object?.property` instead of full objects
- Use functional setState when updating state based on previous state
- Use `useMemo` or `useCallback` for complex objects if full object is needed

### 6. ❌ React Context Provider Ordering

**Problem**: Using `ProjectProvider` from `ProjectContext.tsx` when `AppContext.tsx` already provides both auth and project functionality

**Location**: `frontend/src/App.tsx`, `frontend/src/pages/Chat.tsx`

```typescript
// ❌ WRONG - ProjectProvider tries to use useAuth before AppProvider
import { ProjectProvider } from "./contexts/ProjectContext";
import { useProject } from "../contexts/ProjectContext";

<AppProvider>
  <ProjectProvider>
    {" "}
    {/* This will fail! */}
    <Routes>...</Routes>
  </ProjectProvider>
</AppProvider>;

// ✅ CORRECT - AppContext provides both useAuth AND useProject
import { useProject, useAuth } from "../contexts/AppContext";

<AppProvider>
  {" "}
  {/* Already includes auth + project */}
  <Routes>...</Routes>
</AppProvider>;
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
5. ✅ **Restart Django server** after adding new apps or URL configurations

### API Returns HTML Instead of JSON

**Problem**: Getting `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`

**Cause 1 - Django Server Not Restarted**: After adding new apps or URL patterns:

- Adding new app to `INSTALLED_APPS`
- Adding new URL patterns to `urls.py`
- Deploying new code changes

**Solution**:

```bash
# Development (local)
# Stop the server (Ctrl+C) and restart:
python manage.py runserver

# Production (Dokploy/systemd)
sudo systemctl restart your-app-service
# OR
dokploy restart
```

**Why it happens**:

- Django loads URL configurations and app registries on startup
- New endpoints won't be available until the server reloads
- The 404 page returns HTML, which causes JSON parsing errors in the frontend

---

**Cause 2 - Production Frontend Making Requests to Itself**: Frontend using relative URLs in production without API base URL

**Problem**: API requests go to frontend domain instead of backend:

```
POST http://tickets-frontend-xyz.../api/chat/rooms/ 405 (Method Not Allowed)
```

**Root Cause**:

- In **development**: Vite proxy forwards `/api/*` to backend ✅
- In **production**: No proxy exists, relative URLs stay on frontend domain ❌

**Solution**: Update `frontend/src/services/api.service.ts` to handle base URLs:

```typescript
import { API_BASE_URL } from "../config/api";

class APIService {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Build full URL from relative path
   * In development: use relative URLs (Vite proxy handles routing)
   * In production: prepend API_BASE_URL
   */
  private buildUrl(path: string): string {
    // If already an absolute URL, return as-is
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    // In development, use relative URLs (Vite dev server proxy)
    if (this.isDevelopment) {
      return path;
    }

    // In production, prepend API_BASE_URL
    return `${API_BASE_URL}${path}`;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    // Build full URL (adds base URL in production)
    const fullUrl = this.buildUrl(url);

    // ... rest of method uses fullUrl
    const response = await fetch(fullUrl, config);
    // ...
  }
}
```

**Environment Configuration**:

Ensure `.env.production` has the correct backend URL:

```bash
VITE_API_BASE_URL=http://your-backend-domain.com
```

**Why this works**:

- Development: `buildUrl('/api/chat/rooms/')` → `/api/chat/rooms/` → Vite proxy forwards to `http://localhost:8000`
- Production: `buildUrl('/api/chat/rooms/')` → `http://backend-domain/api/chat/rooms/` → Direct backend request

**After deploying the fix**:

1. Rebuild frontend: `npm run build`
2. Deploy new `dist/` folder to production
3. Clear browser cache to load new JavaScript bundle

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

## Production Deployment Configuration

### Frontend Environment Variables

**Location**: `frontend/.env.production`

```bash
# Backend API base URL (REQUIRED in production)
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me

# Optional: WebSocket base URL (if different from API)
VITE_WS_BASE_URL=ws://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me

# App metadata
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

**⚠️ CRITICAL**:

- `VITE_API_BASE_URL` must point to the **backend domain**, not frontend
- Without this, API requests will go to the frontend's static file server (405/404 errors)
- Vite embeds these at **build time**, so rebuild after changes: `npm run build`

### Vite Proxy vs Production

**Development (vite.config.ts proxy)**:

```typescript
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
});
```

**Why proxies don't work in production**:

- Vite dev server (`npm run dev`) includes a proxy server
- Production build (`npm run build`) creates static files served by Nginx/Traefik
- Static file servers can't proxy requests
- **Solution**: Use `VITE_API_BASE_URL` to build absolute URLs

### API Service URL Construction

**Pattern**: Smart URL building based on environment

```typescript
// frontend/src/services/api.service.ts
private buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;  // Already absolute
  }

  if (import.meta.env.DEV) {
    return path;  // Development: use relative URLs (proxy handles it)
  }

  // Production: prepend base URL
  return `${API_BASE_URL}${path}`;
}
```

**Result**:

- Development: `/api/chat/rooms/` → Vite proxy → `http://localhost:8000/api/chat/rooms/`
- Production: `/api/chat/rooms/` → `http://backend-domain/api/chat/rooms/`

### Deployment Checklist

**When deploying new API endpoints**:

Backend (Django):

1. ✅ Add to `INSTALLED_APPS` if new app
2. ✅ Add URL patterns to `urls.py`
3. ✅ Run migrations if needed: `python manage.py migrate`
4. ✅ **Restart Django server** (Dokploy/systemd/Docker)
5. ✅ Test endpoint directly: `curl http://backend/api/new-endpoint/`

Frontend (React):

1. ✅ Verify `.env.production` has correct `VITE_API_BASE_URL`
2. ✅ Rebuild: `npm run build`
3. ✅ Deploy new `dist/` folder to production
4. ✅ Clear browser cache (or hard refresh: Ctrl+Shift+R)
5. ✅ Test in browser network tab (requests should go to backend domain)

### Common Production Issues

| Symptom                           | Cause                          | Solution                                          |
| --------------------------------- | ------------------------------ | ------------------------------------------------- |
| 405 Method Not Allowed            | Frontend requesting itself     | Add `VITE_API_BASE_URL`, rebuild                  |
| 404 Not Found (returns HTML)      | Django server not restarted    | Restart backend service                           |
| WebSocket fails to connect        | Wrong WS protocol or domain    | Check `VITE_WS_BASE_URL`, use `ws://` or `wss://` |
| Old code still running            | Browser cache                  | Hard refresh (Ctrl+Shift+R)                       |
| API works locally, not production | Missing env vars in production | Check Dokploy environment variables               |

---

## Version History

### v1.6 - November 7, 2025

- **Fixed**: Chat and entire app constantly re-rendering (comprehensive fix)
  - **Added**: Detailed console logging to Chat component for debugging renders
  - **Fixed**: Multiple files still using full object dependencies:
    - `AppContext.tsx`: Changed `[user, authLoading, selectedProject]` to `[user?.id, authLoading, selectedProject?.id]`
    - `Chat.tsx`: Changed `[selectedProject]` to `[selectedProject?.id]`
    - `Dashboard.tsx`: Changed `[selectedProject]` to `[selectedProject?.id]`
    - `Tickets.tsx`: Changed `[selectedProject]` to `[selectedProject?.id]`
  - **Root Cause**: `selectedProject` object recreated when projects load, triggering cascading re-renders
  - **Added Logging**:
    - Chat component logs every render with details (render count, state values)
    - Each useEffect logs when triggered with relevant IDs
    - Cleanup functions log when running
  - **Result**: Eliminated constant re-renders across entire application

**Debugging Pattern Added**:

```typescript
// Track renders
const renderCount = useRef(0);
renderCount.current += 1;
console.log(`🔄 [Component] Render #${renderCount.current}`, { ...state });

// Track effect triggers
useEffect(() => {
  console.log("🔵 [Effect] Triggered - dependency:", dependency);
  return () => console.log("🔴 [Effect] Cleanup");
}, [dependency?.id]); // Always use primitive values
```

### v1.5 - November 7, 2025

- **Fixed**: Constant re-rendering and WebSocket reconnections in entire app
  - **Issue**: App was re-rendering every few seconds, WebSocket connections kept disconnecting/reconnecting
  - **Root Cause**: Multiple useEffect hooks using full objects (`user`, `selectedProject`, `availableProjects`) as dependencies
  - **When objects are fetched/refreshed**: New object references are created even if data is identical
  - **Impact**: useEffect sees "change" and re-runs, causing unnecessary renders and WebSocket reconnections
  - **Files Fixed**:
    - `WebSocketContext.tsx`: Changed `[isAuthenticated, user]` to `[isAuthenticated, user?.id]`
    - `MainLayout.tsx`: Changed `[selectedProject]` to `[selectedProject?.id]` in 2 effects
    - `MainLayout.tsx`: Changed debug effect to use primitive values: `[user?.username, availableProjects.length, selectedProject?.name]`
  - **Result**: Eliminated constant re-renders, WebSocket connections now stable

**Key Learning**:

```typescript
// ❌ WRONG - Objects compared by reference, always "different"
useEffect(() => { ... }, [user, selectedProject]);

// ✅ CORRECT - Primitives compared by value
useEffect(() => { ... }, [user?.id, selectedProject?.id]);
```

### v1.4 - November 7, 2025

- **Fixed**: Critical WebSocket reconnection bug in Chat
  - **Issue**: Chat WebSocket was disconnecting and reconnecting every 10 seconds
  - **Root Cause**: useEffect dependencies using full objects instead of primitive IDs
  - **Solution**: Changed dependencies from `[activeRoom, user]` to `[activeRoom?.id, user?.id]`
  - **Impact**: Eliminated constant reconnections, improved chat UX
  - **Additional Fix**: Updated `setActiveRoom` to use functional setState to preserve room reference when data updates
- **Added**: Common Pitfall #5 - React useEffect Dependency Issues
  - Documented object reference problem in useEffect
  - Explained why objects cause infinite re-renders
  - Added best practices for useEffect dependencies
  - Included code examples showing wrong vs correct patterns
  - Emphasized using primitive values (IDs) instead of full objects

### v1.3 - November 7, 2025

- **Updated**: Chat unread count feature - Real-time WebSocket updates

  - Replaced 30-second polling with event-driven architecture
  - MainLayout listens for custom `chatUnreadUpdate` events from Chat page
  - MainLayout listens for `storage` events for cross-tab synchronization
  - Chat page dispatches events when:
    - Rooms list is loaded/refreshed (every 10s)
    - User opens a room (unread count reset to 0)
    - New message received in active room (unread count reset)
  - Event payload: `{ detail: { unreadCount: number } }`
  - Badge positioning improved: offset changed from `[10, -10]` to `[5, 0]` for collapsed sidebar
  - **Key Implementation**:

    ```typescript
    // Chat.tsx - Dispatch event when unread count changes
    const totalUnread = updatedRooms.reduce(
      (sum, room) => sum + room.unread_count,
      0
    );
    window.dispatchEvent(
      new CustomEvent("chatUnreadUpdate", {
        detail: { unreadCount: totalUnread },
      })
    );

    // MainLayout.tsx - Listen for events
    window.addEventListener("chatUnreadUpdate", handleChatUpdate);
    window.addEventListener("storage", handleStorageChange);
    ```

### v1.2 - November 7, 2025

- **Added**: WebSocket notification system documentation
  - Documented notification event structure with nested `data.data` field
  - Added critical note about accessing notification data correctly
  - Explained frontend must check `data.data` not `data.notification`
- **Added**: Chat unread count feature
  - MainLayout displays badge on Chat icon showing total unread messages
  - Badge updates in real-time as messages are read/received
  - Chat page properly resets unread_count when room is opened
  - Rooms list refreshes every 10 seconds to update counts
  - MainLayout refreshes chat count every 30 seconds

### v1.1 - November 7, 2025

- **Added**: Production deployment configuration section
- **Added**: Frontend environment variables documentation
- **Added**: Vite proxy vs production URL handling explanation
- **Updated**: "API Returns HTML Instead of JSON" with two causes:
  - Cause 1: Django server not restarted (original issue)
  - Cause 2: Frontend making requests to itself in production (new issue)
- **Added**: API service `buildUrl()` pattern for environment-aware URL construction
- **Added**: Deployment checklist for backend and frontend
- **Added**: Common production issues troubleshooting table

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
