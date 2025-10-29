# Quick Fix: Database Reset on Server

## The Issue

You're seeing this error on your server:

```
❌ Database reset is only allowed when DEBUG=True
This prevents accidental data loss in production.
```

## Solutions

### Option 1: Set DEBUG=True (Recommended for Dev Server)

Since this is a development server, add `DEBUG=True` to your environment:

**In your `.env` file:**
```bash
DEBUG=True
```

**Or export it directly:**
```bash
export DEBUG=True
python manage.py reset_db --create-superuser
```

**Or set it inline:**
```bash
DEBUG=True python manage.py reset_db --create-superuser
```

### Option 2: Use --force-dev Flag

If you can't or don't want to set DEBUG=True, use the force flag:

```bash
python manage.py reset_db --create-superuser --force-dev
```

⚠️ **Warning**: This bypasses the safety check. Only use on development servers!

### Option 3: Complete One-Liner

Skip all confirmations and force development mode:

```bash
python manage.py reset_db --create-superuser --no-input --force-dev
```

## What Happens Next

After running the command successfully:

1. All database tables will be dropped
2. Migrations will run from scratch
3. A superuser will be created:
   - Username: `admin`
   - Password: `admin123`
   - Email: `admin@example.com`

## Login to Admin Panel

Visit your admin panel and login:

```
URL: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/admin
Username: admin
Password: admin123
```

## For Production Servers

⚠️ **NEVER run database reset commands on production!**

The safety check exists for a reason. If you need to reset a production database:
1. Take a full backup first
2. Use proper migration rollback procedures
3. Consider manual SQL scripts instead

---

**Your Next Command:**

```bash
# On your development server
python manage.py reset_db --create-superuser --force-dev
```
