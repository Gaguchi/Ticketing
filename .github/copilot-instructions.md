# Ticketing System AI Instructions

Multi-tenant Jira-style ticketing system: Django REST backend + two React frontends (Main App & Service Desk).

## Architecture Overview

```
backend/                    # Django 5.1+, DRF, PostgreSQL, Channels
├── config/                 # Django settings, ASGI/WSGI
├── tickets/                # Core app: models, views, serializers
│   ├── models.py          # UserRole, Company, Project, Ticket, Tag, etc.
│   ├── views.py           # DRF ViewSets for all endpoints
│   └── serializers.py     # API serialization
├── chat/                   # WebSockets via Django Channels
│   └── consumers.py       # Real-time chat WebSocket handlers

frontend/                   # Main admin app (port 5173)
├── src/contexts/AppContext.tsx  # Central state: auth + project selection
├── src/services/api.service.ts  # HTTP client with token refresh
├── src/config/api.ts            # All API endpoint definitions
└── src/components/              # Ant Design-based UI

servicedesk/                # Client portal (port 3001)
└── src/                    # Tailwind CSS + Ant Design (different styling)
```

## Critical Startup Commands

```powershell
# Run ALL services (recommended for dev)
.\start.ps1

# Run ALL services + Celery (requires Redis on localhost:6379)
.\start.ps1 -WithCelery

# Run only Celery services (worker + beat)
.\start.ps1 -CeleryOnly

# Individual services
cd backend; python manage.py runserver      # Backend: localhost:8000
cd frontend; npm run dev                     # Main app: localhost:5173
cd servicedesk; npm run dev                  # Service desk: localhost:3001

# Celery (requires Redis)
cd backend; celery -A config worker --loglevel=info --pool=solo  # Worker
cd backend; celery -A config beat --loglevel=info                # Beat scheduler

# Start Redis via Docker (if not installed locally)
docker run -d -p 6379:6379 redis:alpine

# Database reset (DESTROYS ALL DATA)
cd backend; .\reset_db.ps1 -CreateSuperuser  # Windows
cd backend; ./reset_db.sh --create-superuser # Linux/Mac
```

## Authentication

- **Dev bypass**: Header `X-Super-Secret-Key: dev-super-secret-key-12345` skips JWT
- **Production**: POST `/api/tickets/auth/login/` → returns `{access, refresh}` tokens
- **Token refresh**: Handled automatically by `api.service.ts` via `tokenInterceptor`

## Key Data Model Concepts

**Roles are PROJECT-SCOPED, not global:**

```python
# backend/tickets/models.py
UserRole(user, project, role='superadmin'|'admin'|'user'|'manager')
```

- `superadmin`: Full project control (auto-assigned on project creation)
- `admin`: Manage tickets, assign work
- `user`: Create/edit own tickets
- `manager`: Read-only with reports access

**Company ≠ User role:**

- `Company.admins` = IT staff managing client's tickets
- `Company.users` = Client employees viewing their tickets
- Tickets can be `company=null` (general) or linked to specific company

**Ticket positioning** uses `TicketPosition` model for Kanban drag-drop (reduces lock contention).

## Frontend Patterns

**State Management**: `AppContext` combines auth + project selection

```tsx
// Usage pattern
const { user, selectedProject, isAuthenticated } = useApp();
```

**API Calls**: Always use `apiService` from `services/api.service.ts`

```tsx
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api";

const data = await apiService.get(API_ENDPOINTS.TICKETS);
await apiService.post(API_ENDPOINTS.TICKETS, ticketData);
```

**UI Components**: Ant Design 5 with project-specific patterns

- Modals: Use `Modal.confirm()` for destructive actions
- Forms: `Form.useForm()` with `Form.Item` validation
- Tables: Ant Design `Table` with pagination from API
- Kanban: `@dnd-kit` for drag-drop

**Service Desk difference**: Uses Tailwind CSS classes instead of Ant Design styling

## Backend Patterns

**ViewSets**: Located in `backend/tickets/views.py`

```python
# Custom actions use @action decorator
@action(detail=True, methods=['post'])
def archive(self, request, pk=None):
    ...
```

**Filtering**: Uses `django-filter` with DRF

```python
# GET /api/tickets/tickets/?status=in_progress&priority_id=4&company=1
```

**WebSockets**: Via Django Channels in `backend/chat/consumers.py`

- Chat rooms: `ws://localhost:8000/ws/chat/{room_id}/`
- Ticket updates: Broadcast via channel layer `group_send()`

## Common Tasks

**Add new API endpoint:**

1. Add model/fields to `backend/tickets/models.py`
2. Create/update serializer in `backend/tickets/serializers.py`
3. Add ViewSet/action in `backend/tickets/views.py`
4. Register URL in `backend/tickets/urls.py`
5. Add endpoint constant to `frontend/src/config/api.ts`

**Add frontend page:**

1. Create page in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Use `useApp()` for auth/project context
4. Use `apiService` for API calls

## Important Files Reference

| Purpose            | File                                   |
| ------------------ | -------------------------------------- |
| Data models        | `backend/tickets/models.py`            |
| API views          | `backend/tickets/views.py`             |
| API endpoints (FE) | `frontend/src/config/api.ts`           |
| HTTP client        | `frontend/src/services/api.service.ts` |
| App state          | `frontend/src/contexts/AppContext.tsx` |
| Architecture docs  | `docs/SYSTEM_ARCHITECTURE.md`          |

## ⚠️ Gotchas

- User roles are **per-project** via `UserRole` model, not Django's built-in groups
- `Company.admins` vs `UserRole.role='admin'` are different concepts
- Ticket `column_order` is auto-managed; use `TicketPosition.move_ticket()` for reordering
- Frontend uses Vite proxy in dev; check `vite.config.ts` for API routing
- Service Desk runs on port 3001, uses different styling (Tailwind)
