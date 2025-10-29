# Deployment Guide for Dokploy

## 📋 Overview

This guide covers deploying the Ticketing System to Dokploy with proper database migrations and configuration.

## 🐳 Docker Configuration

### Backend Dockerfile Features

The backend Dockerfile (`backend/Dockerfile`) is configured to:

- ✅ Use Python 3.11 slim image
- ✅ Install PostgreSQL client and build dependencies
- ✅ Install netcat for database health checks
- ✅ Copy and install Python requirements
- ✅ Run migrations automatically on startup
- ✅ Collect static files
- ✅ Start Gunicorn server

### Entrypoint Script

The `backend/entrypoint.sh` script automatically:

1. **Waits for database** - Uses netcat to check PostgreSQL is ready
2. **Creates new migrations** - Runs `makemigrations` for any model changes
3. **Applies migrations** - Runs `migrate` to update database schema
4. **Creates superuser** - Creates admin user if doesn't exist (username: `admin`, password: `admin123`)
5. **Collects static files** - Prepares static assets for serving
6. **Starts Gunicorn** - Launches production server on port 8000

## 🔧 Environment Variables

### Required Backend Variables

Set these in Dokploy for your backend service:

```bash
# Django Core
SECRET_KEY=your-super-secret-key-min-50-chars-random-string
DEBUG=True  # Set to False in production
ALLOWED_HOSTS=localhost,127.0.0.1,tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me

# Database (Internal Dokploy Network)
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=ltivsr15rtap3jvz
DB_HOST=tickets-db-ydxqzn
DB_PORT=5432

# Security
USE_HTTPS=False  # Set to True when using SSL

# CORS (Must include your frontend URL)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

### Required Frontend Variables

Set these in Dokploy for your frontend service:

```bash
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

## 🚀 Deployment Steps

### 1. Initial Deployment

1. **Create database service in Dokploy**

   - Type: PostgreSQL
   - Note the internal host (e.g., `tickets-db-ydxqzn`)
   - Save the password

2. **Deploy backend service**

   - Set all environment variables listed above
   - Dokploy will:
     - Build Docker image from `backend/Dockerfile`
     - Run `entrypoint.sh` which handles migrations
     - Start Gunicorn server

3. **Deploy frontend service**
   - Set frontend environment variables
   - Build and serve the React app

### 2. Updating with New Migrations

When you add new models or change existing ones:

**Option A: Automatic (Recommended)**

```bash
# Just push your code and redeploy in Dokploy
# The entrypoint.sh will automatically:
# 1. Run makemigrations
# 2. Apply migrations
# 3. Restart server
```

**Option B: Manual Migration Check**

```bash
# SSH into the backend container via Dokploy terminal
python manage.py showmigrations
python manage.py migrate
```

### 3. Recent Migration Added

The latest migration `0004_project_members.py` adds a `members` field to projects:

- Allows project leads to invite team members
- Both leads and members get access to projects
- Automatically applied on next deployment

## 🔍 Verification

### Check Backend Health

Visit: `http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/`

Expected response:

```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "host": "tickets-db-ydxqzn",
    "name": "postgres"
  },
  "config": {
    "DEBUG": true,
    "CORS_ALLOWED_ORIGINS": [...]
  }
}
```

### Check Migrations

```bash
# In Dokploy backend terminal
python manage.py showmigrations

# Should show all migrations with [X] marks:
tickets
 [X] 0001_initial
 [X] 0002_alter_ticket_options_ticket_following_and_more
 [X] 0003_create_default_project
 [X] 0004_project_members
```

### Check API Documentation

Visit: `http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/docs/`

Should show interactive Swagger UI with all endpoints.

## 🐛 Troubleshooting

### Migrations Not Running

**Problem:** New migrations not being created or applied

**Solution:**

1. Check Dokploy logs for errors during startup
2. Verify database connection settings
3. Manually run migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate --plan  # Preview changes
   python manage.py migrate
   ```

### Database Connection Failed

**Problem:** "Database is unavailable" repeating in logs

**Solution:**

1. Verify `DB_HOST` matches internal database hostname
2. Check `DB_PASSWORD` is correct
3. Ensure database service is running
4. Use internal network addresses, not external URLs

### Static Files Not Loading

**Problem:** Admin panel has no styling

**Solution:**

```bash
python manage.py collectstatic --noinput
# Or check if WhiteNoise is properly configured in settings.py
```

### Migration Conflicts

**Problem:** Migration conflicts after merging code

**Solution:**

```bash
# Delete conflicting migration files (locally)
# Then recreate:
python manage.py makemigrations --merge
python manage.py migrate
```

## 📊 Database Backup

Before major migrations, back up your database:

```bash
# In Dokploy database service terminal
pg_dump -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore if needed:
psql -U postgres -d postgres < backup_YYYYMMDD_HHMMSS.sql
```

## 🔐 Security Checklist

Before going to production:

- [ ] Set `DEBUG=False`
- [ ] Generate new `SECRET_KEY` (50+ random characters)
- [ ] Set `USE_HTTPS=True` if using SSL
- [ ] Update `ALLOWED_HOSTS` to only include production domains
- [ ] Change default admin password (`admin/admin123`)
- [ ] Review `CORS_ALLOWED_ORIGINS` to only include trusted domains
- [ ] Enable database backups in Dokploy
- [ ] Set up monitoring/alerting

## 📝 Notes

- The entrypoint script uses `set -e` to exit on errors
- Database wait check prevents race conditions on startup
- Migrations are created AND applied automatically
- Superuser is only created if it doesn't exist
- Gunicorn runs with 4 workers and 120s timeout
- All logs are sent to stdout/stderr for Dokploy visibility

## 🎯 Quick Reference

**Check Migration Status:**

```bash
python manage.py showmigrations
```

**Create New Migration:**

```bash
python manage.py makemigrations tickets
```

**Apply Migrations:**

```bash
python manage.py migrate
```

**Rollback Migration:**

```bash
python manage.py migrate tickets 0003  # Rollback to migration 0003
```

**View SQL for Migration:**

```bash
python manage.py sqlmigrate tickets 0004
```
