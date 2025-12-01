# Celery Service for Ticketing System

This directory contains the Dockerfile for running Celery worker and beat scheduler as a separate service on Dokploy.

## What this service does

1. **Celery Worker** - Processes background tasks like archiving old tickets
2. **Celery Beat** - Schedules periodic tasks (runs every hour to check for tickets to archive)

## Dokploy Setup

### 1. Create a new Application in Dokploy

- Go to your Dokploy project
- Click "Create Service" → "Application"
- Name it something like `celery-worker`

### 2. Configure the source

- **Source**: GitHub
- **Repository**: `Gaguchi/Ticketing`
- **Branch**: `main`
- **Build Path**: `/` (root of repo - IMPORTANT!)
- **Dockerfile Path**: `celery/Dockerfile`

### 3. Set Environment Variables

Add the same database and Redis environment variables as your backend:

```env
# Database (same as backend)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Redis (same as backend)
REDIS_HOST=your-redis-host
REDIS_PORT=6379

# Celery
CELERY_BROKER_URL=redis://your-redis-host:6379/0
CELERY_RESULT_BACKEND=redis://your-redis-host:6379/0

# Archive settings
TICKET_ARCHIVE_AFTER_HOURS=24

# Django
SECRET_KEY=your-secret-key
DEBUG=False
```

### 4. Network Configuration

- **No ports needed** - Celery communicates via Redis, not HTTP
- Make sure it's on the same network as your backend and Redis services

### 5. Deploy

Click Deploy and the service will start running!

## Monitoring

You can check the Celery logs in Dokploy to see:
- Tasks being processed
- Scheduled task runs
- Any errors

## Manual Testing

To manually trigger the archive task, you can:

1. SSH into the backend container
2. Run: `python manage.py archive_done_tickets --dry-run` (to see what would be archived)
3. Run: `python manage.py archive_done_tickets` (to actually archive)

## Task Schedule

The `archive_old_done_tickets` task runs **every hour** and archives tickets that:
- Are in a "Done" column
- Have been done for more than 24 hours (configurable via `TICKET_ARCHIVE_AFTER_HOURS`)
- Are not already archived
