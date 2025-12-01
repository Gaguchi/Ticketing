# Celery Setup for Ticketing System

## Overview

Celery is used for background task processing, including:
- **Auto-archiving tickets**: Tickets in the Done column for more than 24 hours are automatically archived

## Components

1. **Celery Worker** - Processes background tasks
2. **Celery Beat** - Schedules periodic tasks (runs every hour)
3. **Redis** - Message broker for Celery

## Local Development

### Prerequisites
- Redis running locally (default: `localhost:6379`)
- PostgreSQL database

### Running Celery Locally

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Celery worker** (in a new terminal):
   ```bash
   celery -A config worker --loglevel=info
   ```

3. **Start the Celery beat scheduler** (in another terminal):
   ```bash
   celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
   ```

### Running with Docker Compose

```bash
docker-compose -f docker-compose.celery.yml up
```

This starts:
- Django/Daphne backend
- Celery worker
- Celery beat
- PostgreSQL
- Redis

## Dokploy Deployment

For Dokploy, you need to set up Celery as **separate services**:

### 1. Create Celery Worker Service

- **Name**: `tickets-celery-worker`
- **Docker Image**: Same as backend
- **Command Override**: `./celery-worker.sh`
- **Environment Variables**: Same as backend, plus:
  - `CELERY_BROKER_URL=redis://your-redis-host:6379/0`
  - `CELERY_RESULT_BACKEND=redis://your-redis-host:6379/0`
  - `TICKET_ARCHIVE_AFTER_HOURS=24`

### 2. Create Celery Beat Service

- **Name**: `tickets-celery-beat`
- **Docker Image**: Same as backend
- **Command Override**: `./celery-beat.sh`
- **Environment Variables**: Same as worker

### 3. Ensure Redis is Running

Either:
- Use Dokploy's Redis service
- Or set up a separate Redis container

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `CELERY_BROKER_URL` | `redis://127.0.0.1:6379/0` | Celery broker URL |
| `CELERY_RESULT_BACKEND` | `redis://127.0.0.1:6379/0` | Celery result backend |
| `TICKET_ARCHIVE_AFTER_HOURS` | `24` | Hours before done tickets are archived |

## Tasks

### Auto-Archive Done Tickets

- **Task**: `tickets.tasks.archive_old_done_tickets`
- **Schedule**: Every hour (at minute 0)
- **Behavior**: Archives tickets that have been in Done column for more than `TICKET_ARCHIVE_AFTER_HOURS`

### Manual Archiving

You can manually trigger archiving using the management command:

```bash
# Dry run - see what would be archived
python manage.py archive_done_tickets --dry-run

# Archive tickets done for 24+ hours
python manage.py archive_done_tickets

# Archive tickets done for 12+ hours
python manage.py archive_done_tickets --hours 12

# Archive only tickets from specific project
python manage.py archive_done_tickets --project TICK
```

## Monitoring

### Check Celery Status

```bash
celery -A config inspect active
celery -A config inspect scheduled
```

### View Task Results

Task results are stored in Redis and can be viewed via:
- Django Admin (if using django-celery-results)
- Redis CLI
- Flower monitoring tool (optional)

## Troubleshooting

### Tasks Not Running

1. Ensure Redis is running and accessible
2. Check Celery worker logs for errors
3. Verify environment variables are set correctly

### Tickets Not Being Archived

1. Check that `done_at` is being set when tickets move to Done column
2. Verify the column is recognized as a "done" column (name contains 'done', 'completed', or 'closed')
3. Run the management command manually to test:
   ```bash
   python manage.py archive_done_tickets --dry-run
   ```
