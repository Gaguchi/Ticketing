# Backend Service - AI Instructions

Django 5.1 REST API with Django Channels for WebSocket support.

## Tech Stack

- **Framework**: Django 5.1.4, Django REST Framework 3.15
- **Database**: PostgreSQL 16 via psycopg2
- **WebSockets**: Django Channels 4.0 + Daphne ASGI server
- **Auth**: JWT via djangorestframework-simplejwt
- **Background Tasks**: Celery 5.4 + django-celery-beat
- **Message Broker**: Redis (Channels layer + Celery broker)

## Directory Structure

```
backend/
├── config/                  # Django project settings
│   ├── settings.py          # Main Django settings
│   ├── urls.py              # Root URL config
│   ├── asgi.py              # ASGI config (Daphne + Channels)
│   ├── wsgi.py              # WSGI config (fallback)
│   └── celery.py            # Celery app configuration
│
├── tickets/                 # Main application
│   ├── models.py            # All data models
│   ├── views.py             # DRF ViewSets
│   ├── serializers.py       # API serialization
│   ├── permissions.py       # Custom DRF permissions
│   ├── urls.py              # API URL routing
│   ├── tasks.py             # Celery background tasks
│   ├── consumers.py         # Ticket WebSocket consumers
│   ├── routing.py           # WebSocket URL routing
│   ├── signals.py           # Django signals
│   ├── admin.py             # Django admin customization
│   ├── services/            # Business logic services
│   ├── utils/               # Utility functions
│   └── tests/               # Test suite
│
├── chat/                    # Real-time chat system
│   └── consumers.py         # Chat WebSocket consumers
│
├── manage.py
├── requirements.txt
├── Dockerfile
├── entrypoint.sh            # Production startup script
├── reset_db.ps1             # Database reset (Windows)
└── reset_db.sh              # Database reset (Linux/Mac)
```

## Key Models (`tickets/models.py`)

```python
# Core entities
User          # Django built-in, extended via UserRole
Company       # Client organizations (has admins M2M, users M2M)
Project       # Work containers (has members M2M, companies M2M)
UserRole      # Per-project roles: superadmin, admin, user, manager
Ticket        # Work units (belongs to project, optionally to company)
Column        # Kanban workflow stages (per project)
Tag           # Labels for tickets (per project)

# Supporting
TicketPosition  # Kanban card ordering (separate from Ticket for perf)
Contact         # External contacts (not system users)
Attachment      # File uploads on tickets
Comment         # Ticket comments with threading
```

### UserRole Roles

```python
ROLE_CHOICES = [
    ('superadmin', 'Super Admin'),  # Full project control
    ('admin', 'Admin'),             # Manage tickets, assign work
    ('manager', 'Manager'),         # Read-only with reports
    ('user', 'User'),               # Create/edit own tickets
]
```

## API Patterns

### ViewSet Structure

```python
# tickets/views.py
class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority_id', 'company', 'column']

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Custom action example"""
        ticket = self.get_object()
        ticket.is_archived = True
        ticket.save()
        return Response({'status': 'archived'})
```

### URL Patterns

```python
# tickets/urls.py
router = DefaultRouter()
router.register(r'tickets', TicketViewSet)
router.register(r'projects', ProjectViewSet)
router.register(r'companies', CompanyViewSet)
# ... etc
```

### Common API Endpoints

```
GET    /api/tickets/tickets/           # List tickets
POST   /api/tickets/tickets/           # Create ticket
GET    /api/tickets/tickets/{id}/      # Get ticket
PATCH  /api/tickets/tickets/{id}/      # Update ticket
DELETE /api/tickets/tickets/{id}/      # Delete ticket
POST   /api/tickets/tickets/{id}/archive/  # Custom action

GET    /api/tickets/projects/
GET    /api/tickets/companies/
GET    /api/tickets/columns/?project={id}
GET    /api/tickets/tags/?project={id}
POST   /api/tickets/auth/login/
POST   /api/tickets/auth/refresh/
```

## WebSocket Consumers

### Chat Consumer (`chat/consumers.py`)

```python
# Connect: ws://host/ws/chat/{room_id}/
class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
```

### WebSocket URLs

```
ws://localhost:8000/ws/chat/{room_id}/
ws://localhost:8000/ws/notifications/
ws://localhost:8000/ws/projects/{project_id}/tickets/
```

## Authentication

### JWT Auth (Production)

```python
# Request
POST /api/tickets/auth/login/
{"username": "user", "password": "pass"}

# Response
{"access": "eyJ...", "refresh": "eyJ..."}

# Usage
Authorization: Bearer eyJ...
```

### Dev Bypass (Development Only)

```http
X-Super-Secret-Key: dev-super-secret-key-12345
```

## Common Commands

```bash
# Development server (with auto-reload)
python manage.py runserver

# Production server (Daphne for WebSocket support)
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Database
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Database reset
.\reset_db.ps1 -CreateSuperuser  # Windows
./reset_db.sh --create-superuser  # Linux/Mac

# Static files (production)
python manage.py collectstatic --noinput

# Celery (requires Redis)
celery -A config worker --loglevel=info --pool=solo
celery -A config beat --loglevel=info

# Tests
python manage.py test tickets
```

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing
DB_USER=postgres
DB_PASSWORD=your_password

# Django
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001

# Redis (for WebSockets + Celery)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
TICKET_ARCHIVE_AFTER_HOURS=24
```

## Celery Tasks (`tickets/tasks.py`)

```python
@shared_task
def archive_old_done_tickets():
    """Archives tickets done for > TICKET_ARCHIVE_AFTER_HOURS"""
    # Runs hourly via celery-beat
```

## Signals (`tickets/signals.py`)

```python
@receiver(post_save, sender=Project)
def create_default_columns(sender, instance, created, **kwargs):
    """Creates default Kanban columns for new projects"""

@receiver(post_save, sender=Project)
def assign_creator_as_superadmin(sender, instance, created, **kwargs):
    """Auto-assigns project creator as superadmin"""
```

---

## Dokploy Deployment

### Dockerfile Build

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["./entrypoint.sh"]
```

### entrypoint.sh

```bash
#!/bin/bash
python manage.py migrate --noinput
python manage.py collectstatic --noinput
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Dokploy Configuration

- **Build Path**: `/backend`
- **Internal Port**: 8000
- **Domain**: `api.your-domain.com` (HTTPS enabled)

### Production Environment Variables

```bash
DEBUG=False
SECRET_KEY=<generated-key>
ALLOWED_HOSTS=api.your-domain.com
DB_HOST=ticketing-db
DB_PASSWORD=<password>
REDIS_HOST=ticketing-redis
CORS_ALLOWED_ORIGINS=https://tickets.your-domain.com,https://desk.your-domain.com
USE_X_FORWARDED_HOST=True
TRUST_PROXY_HEADERS=True
```

## ⚠️ Important Notes

1. **Always use Daphne** in production for WebSocket support (not gunicorn)
2. **Redis required** for WebSockets when `DEBUG=False`
3. **UserRole** determines project permissions, not Django groups
4. **Company.admins** ≠ project admins - different permission concepts
5. **Run migrations** after any model changes before testing
6. **Check `entrypoint.sh`** runs migrations on deploy
