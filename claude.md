# Ticketing System - AI Instructions

Multi-tenant Jira-style ticketing system with Django REST backend, two React frontends (Main App & Service Desk), and Celery background task processing.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Ticketing System                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐   │
│   │  Frontend   │    │ ServiceDesk │    │   Backend   │    │   Celery  │   │
│   │  (Admin)    │    │  (Client)   │    │  (API)      │    │  (Tasks)  │   │
│   │  Port 5178  │    │  Port 3001  │    │  Port 8002  │    │           │   │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └─────┬─────┘   │
│          │                  │                  │                  │         │
│          └──────────────────┼──────────────────┼──────────────────┘         │
│                             │                  │                            │
│                        HTTP/WebSocket    ┌─────┴─────┐                      │
│                             │            │   Redis   │                      │
│                             │            │   6379    │                      │
│                             │            └───────────┘                      │
│                             │                  │                            │
│                        ┌────┴────────────────┬─┘                            │
│                        │     PostgreSQL      │                              │
│                        │       5432          │                              │
│                        └─────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Services

| Service     | Directory      | Port | Tech Stack                           | Purpose                    |
| ----------- | -------------- | ---- | ------------------------------------ | -------------------------- |
| Backend     | `backend/`     | 8002 | Django 5.1, DRF, Channels, Daphne    | REST API + WebSockets      |
| Frontend    | `frontend/`    | 5178 | React 19, TypeScript, Ant Design     | Admin/IT staff interface   |
| ServiceDesk | `servicedesk/` | 3001 | React 19, TypeScript, Tailwind + Ant | Client portal              |
| Celery      | `celery/`      | -    | Celery, Redis                        | Background task processing |
| PostgreSQL  | -              | 5432 | PostgreSQL 16                        | Primary database           |
| Redis       | -              | 6379 | Redis 7                              | Channels + Celery broker   |

## Quick Start Commands

```powershell
# Run ALL services (recommended for development)
.\start.ps1

# Run ALL services + Celery (requires Redis on localhost:6379)
.\start.ps1 -WithCelery

# Run only Celery services (worker + beat)
.\start.ps1 -CeleryOnly

# Individual services
cd backend; python manage.py runserver 8002  # Backend: localhost:8002
cd frontend; npm run dev                     # Main app: localhost:5178
cd servicedesk; npm run dev                  # Service desk: localhost:3001

# Database reset (DESTROYS ALL DATA)
cd backend; .\reset_db.ps1 -CreateSuperuser
```

## Core Data Model

```
User ──has role in──> Project ──contains──> Tickets
     ──admin/user of──> Company ──associated with──> Project
                                 ──optional link──> Ticket
```

**Key Concepts:**

- **Roles are PROJECT-SCOPED** via `UserRole(user, project, role)` - not global
- **Company ≠ User role**: `Company.admins` = IT staff, `Company.users` = client employees
- **Ticket types**: task, bug, story, epic
- **Kanban workflow**: Tickets move through columns (workflow stages)

## Authentication

- **Dev bypass**: Header `X-Super-Secret-Key: dev-super-secret-key-12345` skips JWT
- **Production**: POST `/api/tickets/auth/login/` → `{access, refresh}` tokens
- **Token refresh**: Automatic via `api.service.ts` interceptor

## Project Structure

```
Ticketing/
├── backend/                 # Django REST API + WebSockets
│   ├── config/              # Django settings, ASGI/WSGI, Celery config
│   ├── tickets/             # Core app: models, views, serializers
│   ├── chat/                # WebSocket consumers (Django Channels)
│   └── manage.py
│
├── frontend/                # Admin React app (Ant Design)
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── contexts/        # AppContext (auth + project state)
│       ├── pages/           # Route pages
│       ├── services/        # API client with token management
│       └── config/          # API endpoint definitions
│
├── servicedesk/             # Client portal React app (Tailwind + Ant)
│   └── src/                 # Similar structure, different styling
│
├── celery/                  # Separate Dockerfile for Dokploy deployment
│
└── docs/                    # All documentation
```

## Important Files Reference

| Purpose             | File                                   |
| ------------------- | -------------------------------------- |
| Data models         | `backend/tickets/models.py`            |
| API views           | `backend/tickets/views.py`             |
| Serializers         | `backend/tickets/serializers.py`       |
| WebSocket consumers | `backend/chat/consumers.py`            |
| API endpoints (FE)  | `frontend/src/config/api.ts`           |
| HTTP client         | `frontend/src/services/api.service.ts` |
| App state context   | `frontend/src/contexts/AppContext.tsx` |
| Celery tasks        | `backend/tickets/tasks.py`             |
| Django settings     | `backend/config/settings.py`           |

## Common Development Tasks

### Add new API endpoint

1. Add model/fields to `backend/tickets/models.py`
2. Create/update serializer in `backend/tickets/serializers.py`
3. Add ViewSet/action in `backend/tickets/views.py`
4. Register URL in `backend/tickets/urls.py`
5. Add endpoint constant to `frontend/src/config/api.ts`

### Add frontend page

1. Create page in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Use `useApp()` for auth/project context
4. Use `apiService` for API calls

### Run database migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

---

## Dokploy Deployment

The system deploys to **two separate Dokploy servers**:

| Environment | Branch   | Dokploy Server          | MCP Name        |
| ----------- | -------- | ----------------------- | --------------- |
| Development | `main`   | `31.97.181.167:3000`    | `dokploy`       |
| Production  | `stable` | `187.77.70.21:3000`     | `dokploy-prod`  |

- **`main` branch** → Dev server (`dokploy` MCP) — for testing and development
- **`stable` branch** → Production server (`dokploy-prod` MCP) — live/client-facing

### Architecture on Dokploy (per server)

```
Traefik (Proxy/SSL) ─┬─► ticketing-frontend (Nginx, port 80)
                     ├─► ticketing-servicedesk (Nginx, port 80)
                     ├─► ticketing-backend (Daphne, port 8002)
                     └─► ticketing-celery (Worker + Beat)
                              │
                     ┌───────┴────────┐
                     ▼                ▼
              ticketing-db     ticketing-redis
              (PostgreSQL)         (Redis)
```

### Deployment Steps

1. **Create Project** in Dokploy: `ticketing-system`

2. **Create Database Services:**
   - PostgreSQL: `ticketing-db` (port 5432)
   - Redis: `ticketing-redis` (port 6379)

3. **Deploy Backend:**
   - Build Path: `/backend`
   - Dockerfile Path: `/backend/Dockerfile`
   - Domain: `api.your-domain.com`

4. **Deploy Frontend:**
   - Build Path: `/frontend`
   - Dockerfile Path: `/frontend/Dockerfile`
   - Domain: `tickets.your-domain.com`
   - Build Args: `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`

5. **Deploy ServiceDesk:**
   - Build Path: `/servicedesk`
   - Dockerfile Path: `/servicedesk/Dockerfile`
   - Domain: `desk.your-domain.com`

6. **Deploy Celery:**
   - Build Path: `/celery`
   - No port needed (communicates via Redis)

### Key Environment Variables

**Backend:**

```bash
DB_HOST=ticketing-db
DB_PASSWORD=<password>
SECRET_KEY=<django-secret>
ALLOWED_HOSTS=api.your-domain.com
CORS_ALLOWED_ORIGINS=https://tickets.your-domain.com
REDIS_HOST=ticketing-redis
USE_X_FORWARDED_HOST=True
TRUST_PROXY_HEADERS=True
```

**Frontend Build Args:**

```bash
VITE_API_BASE_URL=https://api.your-domain.com
VITE_WS_BASE_URL=wss://api.your-domain.com
```

**Celery:**

```bash
CELERY_BROKER_URL=redis://ticketing-redis:6379/0
TICKET_ARCHIVE_AFTER_HOURS=24
```

📖 Full deployment guide: `docs/DOKPLOY_DEPLOYMENT.md`

---

## ⚠️ Important Gotchas

1. **Roles are per-project** via `UserRole` model, not Django's built-in groups
2. **`Company.admins` vs `UserRole.role='admin'`** are different concepts
3. **Ticket `column_order`** is auto-managed; use `TicketPosition.move_ticket()` for reordering
4. **Frontend proxy** in dev - check `vite.config.ts` for API routing
5. **ServiceDesk** runs on port 3001, uses Tailwind (not pure Ant Design)
6. **WebSockets** require Redis in production (`DEBUG=False`)
7. **Celery** needs Redis broker - doesn't run without it

## Documentation Index

- Architecture: `docs/SYSTEM_ARCHITECTURE.md`
- Deployment: `docs/DOKPLOY_DEPLOYMENT.md`
- Environment Variables: `docs/ENVIRONMENT_VARIABLES.md`
- WebSockets: `docs/QUICKSTART_WEBSOCKETS.md`
- Chat System: `docs/CHAT_SYSTEM.md`
- Security: `docs/SECURITY.md`

See `E:\Work\WebDev\PORTS.md` for the full port registry.
