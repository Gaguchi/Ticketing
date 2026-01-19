# Celery Service - AI Instructions

Background task processing service using Celery with Redis broker.

## Purpose

The Celery service handles asynchronous and scheduled background tasks:

- **Auto-archiving tickets**: Tickets in Done status for > 24 hours
- **Scheduled jobs**: Periodic maintenance tasks via celery-beat
- **Async tasks**: Long-running operations offloaded from web requests

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Celery Service                           │
│  ┌─────────────────┐       ┌─────────────────┐             │
│  │  Celery Worker  │       │  Celery Beat    │             │
│  │  (Task Runner)  │       │  (Scheduler)    │             │
│  └────────┬────────┘       └────────┬────────┘             │
│           │                         │                       │
│           └───────────┬─────────────┘                       │
│                       │                                     │
│                       ▼                                     │
│              ┌─────────────────┐                            │
│              │     Redis       │                            │
│              │ (Message Broker)│                            │
│              └────────┬────────┘                            │
│                       │                                     │
│                       ▼                                     │
│              ┌─────────────────┐                            │
│              │   PostgreSQL    │                            │
│              │   (Database)    │                            │
│              └─────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

## Components

### Celery Worker

- Processes tasks from the Redis queue
- Runs the actual task code (e.g., archiving tickets)
- Can run multiple workers for parallel processing

### Celery Beat

- Scheduler that triggers periodic tasks
- Stores schedule in database (django-celery-beat)
- Runs tasks at configured intervals

## Directory Structure

```
celery/
├── Dockerfile               # Standalone container for Dokploy
├── celery-entrypoint.sh     # Startup script (worker + beat)
├── requirements.txt         # Same as backend
├── manual_archive.py        # Manual archive script
└── README.md                # Setup instructions

# Task definitions are in backend
backend/
├── config/
│   └── celery.py            # Celery app configuration
└── tickets/
    └── tasks.py             # Task definitions
```

## Task Definitions (`backend/tickets/tasks.py`)

```python
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Ticket, Column
import os

@shared_task
def archive_old_done_tickets():
    """
    Archives tickets that have been in a Done column for more than
    TICKET_ARCHIVE_AFTER_HOURS hours (default: 24).

    Runs every hour via celery-beat.
    """
    hours = int(os.getenv('TICKET_ARCHIVE_AFTER_HOURS', 24))
    threshold = timezone.now() - timedelta(hours=hours)

    done_columns = Column.objects.filter(is_done_column=True)

    tickets = Ticket.objects.filter(
        column__in=done_columns,
        is_archived=False,
        updated_at__lt=threshold
    )

    count = tickets.update(is_archived=True, archived_at=timezone.now())
    return f"Archived {count} tickets"
```

## Celery Configuration (`backend/config/celery.py`)

```python
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Beat schedule (hourly archive check)
app.conf.beat_schedule = {
    'archive-old-done-tickets': {
        'task': 'tickets.tasks.archive_old_done_tickets',
        'schedule': 3600.0,  # Every hour
    },
}
```

## Local Development

### Prerequisites

- Redis running locally: `redis-server` or Docker
- Backend dependencies installed

### Running Locally

```bash
# Terminal 1: Start Redis (if not running)
docker run -d -p 6379:6379 redis:alpine

# Terminal 2: Start Celery Worker
cd backend
celery -A config worker --loglevel=info --pool=solo

# Terminal 3: Start Celery Beat
cd backend
celery -A config beat --loglevel=info

# Or with Django admin schedule storage:
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Using start.ps1

```powershell
# Run all services including Celery
.\start.ps1 -WithCelery

# Run only Celery services
.\start.ps1 -CeleryOnly
```

### Manual Task Execution

```bash
# Dry run (see what would be archived)
cd backend
python manage.py archive_done_tickets --dry-run

# Actually archive
python manage.py archive_done_tickets

# Via Django shell
python manage.py shell
>>> from tickets.tasks import archive_old_done_tickets
>>> archive_old_done_tickets.delay()
```

## Environment Variables

```bash
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Task configuration
TICKET_ARCHIVE_AFTER_HOURS=24

# Database (same as backend)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing
DB_USER=postgres
DB_PASSWORD=your_password

# Django
SECRET_KEY=your-secret-key
DEBUG=False
```

---

## Dokploy Deployment

The Celery service deploys as a **separate application** in Dokploy, sharing the same database and Redis as the backend.

### Dockerfile (`celery/Dockerfile`)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY ../backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code (Celery needs Django models)
COPY ../backend .

# Copy entrypoint
COPY celery-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
```

### Entrypoint Script (`celery/celery-entrypoint.sh`)

```bash
#!/bin/bash
set -e

# Run migrations (ensure DB is up to date)
python manage.py migrate --noinput

# Start both worker and beat in background
celery -A config worker --loglevel=info --pool=solo &
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

# Keep container running
wait
```

### Dokploy Configuration

1. **Create Application:**
   - Name: `ticketing-celery`
   - Repository: Same as backend
   - Build Path: `/celery`
   - Dockerfile: `Dockerfile`

2. **Environment Variables:**

   ```bash
   # Database (same as backend)
   DB_HOST=ticketing-db
   DB_PORT=5432
   DB_NAME=ticketing
   DB_USER=postgres
   DB_PASSWORD=<password>

   # Redis
   REDIS_HOST=ticketing-redis
   REDIS_PORT=6379
   CELERY_BROKER_URL=redis://ticketing-redis:6379/0
   CELERY_RESULT_BACKEND=redis://ticketing-redis:6379/0

   # Task settings
   TICKET_ARCHIVE_AFTER_HOURS=24

   # Django
   SECRET_KEY=<same-as-backend>
   DEBUG=False
   ```

3. **Network:**
   - Must be on same network as `ticketing-db` and `ticketing-redis`
   - **No port exposure needed** - communicates via Redis only

4. **Resources:**
   - Lower resource allocation than backend
   - Recommended: 256MB-512MB RAM

### Monitoring in Dokploy

Check logs for:

```
[INFO/MainProcess] celery@hostname ready.
[INFO/MainProcess] Scheduler: Sending due task archive-old-done-tickets
[INFO/ForkPoolWorker-1] Task tickets.tasks.archive_old_done_tickets succeeded
```

## Task Schedule

| Task                       | Schedule   | Description                         |
| -------------------------- | ---------- | ----------------------------------- |
| `archive_old_done_tickets` | Every hour | Archives tickets in Done > 24 hours |

## Adding New Tasks

1. **Define task in `backend/tickets/tasks.py`:**

   ```python
   @shared_task
   def send_notification_emails():
       # Task logic
       pass
   ```

2. **Add to beat schedule in `backend/config/celery.py`:**

   ```python
   app.conf.beat_schedule = {
       'send-notifications': {
           'task': 'tickets.tasks.send_notification_emails',
           'schedule': crontab(minute=0, hour='*/4'),  # Every 4 hours
       },
   }
   ```

3. **Or call manually:**
   ```python
   send_notification_emails.delay()  # Async
   send_notification_emails.apply()  # Sync (testing)
   ```

## ⚠️ Important Notes

1. **Redis required** - Celery won't start without Redis
2. **Same database** - Uses backend's DB for model access
3. **No ports exposed** - Pure background worker, no HTTP
4. **Separate deployment** - Own container in Dokploy
5. **Logs are key** - Check Dokploy logs for task execution
6. **--pool=solo on Windows** - Required for local dev on Windows
7. **Beat schedule** - Stored in DB with django-celery-beat
