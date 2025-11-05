# Dokploy Deployment Guide - Ticketing System with WebSockets

This guide covers deploying the Ticketing System to Dokploy with full WebSocket support using Django Channels and Redis.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Dokploy Setup](#dokploy-setup)
4. [Database Setup (PostgreSQL)](#database-setup-postgresql)
5. [Redis Setup](#redis-setup)
6. [Backend Deployment](#backend-deployment)
7. [Frontend Deployment](#frontend-deployment)
8. [Environment Variables](#environment-variables)
9. [WebSocket Configuration](#websocket-configuration)
10. [Testing the Deployment](#testing-the-deployment)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance](#maintenance)

---

## Prerequisites

- ✅ Dokploy instance running and accessible
- ✅ Domain name (optional but recommended)
- ✅ GitHub repository with your code
- ✅ Basic understanding of Docker and environment variables

---

## Architecture Overview

```
┌─────────────┐     HTTPS/WSS      ┌──────────────┐
│   Browser   │ ◄──────────────────► │   Traefik    │
└─────────────┘                     │   (Proxy)    │
                                    └──────┬───────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        │                  │                  │
                   ┌────▼────┐       ┌─────▼─────┐     ┌─────▼─────┐
                   │ Frontend│       │  Backend  │     │   Redis   │
                   │ (Nginx) │       │ (Daphne)  │◄────┤ (Channels)│
                   └─────────┘       └─────┬─────┘     └───────────┘
                                           │
                                     ┌─────▼─────┐
                                     │PostgreSQL │
                                     │ (Database)│
                                     └───────────┘
```

### Key Components

1. **Frontend**: React app served via Nginx (port 80)
2. **Backend**: Django with Daphne ASGI server for WebSocket support (port 8000)
3. **PostgreSQL**: Database for storing tickets, users, etc.
4. **Redis**: Channel layer for Django Channels (WebSocket message broker)
5. **Traefik**: Reverse proxy handling HTTPS/WSS (managed by Dokploy)

---

## Dokploy Setup

### 1. Access Dokploy Dashboard

Navigate to your Dokploy instance: `https://your-dokploy-domain.com`

### 2. Create a New Project

1. Click **"Create Project"**
2. Name: `ticketing-system`
3. Click **"Create"**

---

## Database Setup (PostgreSQL)

### 1. Create PostgreSQL Database

1. In Dokploy, navigate to **Databases** → **Create Database**
2. Select **PostgreSQL**
3. Configuration:
   - **Name**: `ticketing-db`
   - **Database Name**: `ticketing`
   - **Username**: `postgres`
   - **Password**: Generate a strong password (save it!)
   - **Version**: `16` (latest stable)
4. Click **"Create Database"**

### 2. Note Database Connection Details

After creation, note these values (you'll need them for the backend):

```
DB_HOST: <database-container-name>  (e.g., ticketing-db)
DB_PORT: 5432
DB_NAME: ticketing
DB_USER: postgres
DB_PASSWORD: <your-generated-password>
```

---

## Redis Setup

### 1. Create Redis Instance

1. In Dokploy, navigate to **Databases** → **Create Database**
2. Select **Redis**
3. Configuration:
   - **Name**: `ticketing-redis`
   - **Version**: `7-alpine`
   - **Port**: `6379` (default)
4. Click **"Create Database"**

### 2. Note Redis Connection Details

```
REDIS_HOST: ticketing-redis
REDIS_PORT: 6379
```

> **Note**: Redis is used by Django Channels for WebSocket message routing between server instances.

---

## Backend Deployment

### 1. Create Backend Application

1. Navigate to **Applications** → **Create Application**
2. Select **"From GitHub"** (or your Git provider)
3. Configuration:
   - **Name**: `ticketing-backend`
   - **Repository**: `your-username/Ticketing`
   - **Branch**: `main`
   - **Build Path**: `/backend`
   - **Dockerfile Path**: `/backend/Dockerfile`

### 2. Configure Environment Variables

Click on **Environment Variables** and add the following:

#### Database Configuration

```bash
DB_HOST=ticketing-db
DB_PORT=5432
DB_NAME=ticketing
DB_USER=postgres
DB_PASSWORD=<your-postgres-password>
```

#### Django Configuration

```bash
DEBUG=False
SECRET_KEY=<generate-a-strong-secret-key>
ALLOWED_HOSTS=<your-backend-domain>,localhost,127.0.0.1
```

To generate a secret key:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### CORS Configuration

```bash
CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>,https://<your-backend-domain>
```

#### Redis Configuration (for Django Channels)

```bash
REDIS_HOST=ticketing-redis
REDIS_PORT=6379
```

#### JWT Configuration (Optional)

```bash
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7
```

### 3. Configure Port

- **Internal Port**: `8000`
- **Protocol**: HTTP (Traefik will handle HTTPS)

### 4. Configure Domain (Optional)

1. Go to **Domains** tab
2. Add domain: `api.your-domain.com`
3. Enable **HTTPS** (Let's Encrypt)

### 5. Deploy

Click **"Deploy"** and wait for the build to complete.

### 6. Run Migrations

After first deployment, open **Terminal** in Dokploy:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

Or the entrypoint.sh script should handle this automatically.

---

## Frontend Deployment

### 1. Create Frontend Application

1. Navigate to **Applications** → **Create Application**
2. Select **"From GitHub"**
3. Configuration:
   - **Name**: `ticketing-frontend`
   - **Repository**: `your-username/Ticketing`
   - **Branch**: `main`
   - **Build Path**: `/frontend`
   - **Dockerfile Path**: `/frontend/Dockerfile`

### 2. Configure Build Arguments

In **Build Arguments**, add:

```bash
VITE_API_BASE_URL=https://api.your-domain.com
VITE_WS_BASE_URL=wss://api.your-domain.com
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

> **Important**:
>
> - Use `https://` for VITE_API_BASE_URL
> - Use `wss://` for VITE_WS_BASE_URL (secure WebSocket)
> - Both should point to your **backend** domain

### 3. Configure Port

- **Internal Port**: `80`
- **Protocol**: HTTP

### 4. Configure Domain

1. Go to **Domains** tab
2. Add domain: `tickets.your-domain.com`
3. Enable **HTTPS**

### 5. Deploy

Click **"Deploy"** and wait for the build.

---

## Environment Variables

### Complete Backend Environment Variables

```bash
# Database
DB_HOST=ticketing-db
DB_PORT=5432
DB_NAME=ticketing
DB_USER=postgres
DB_PASSWORD=<strong-password>

# Django Core
DEBUG=False
SECRET_KEY=<django-secret-key>
ALLOWED_HOSTS=api.your-domain.com,localhost,127.0.0.1

# CORS
CORS_ALLOWED_ORIGINS=https://tickets.your-domain.com,https://api.your-domain.com

# Redis (for WebSockets)
REDIS_HOST=ticketing-redis
REDIS_PORT=6379

# JWT (Optional)
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7

# Super Secret Key (Development Only - Remove in Production!)
# SUPER_SECRET_KEY=<only-for-testing>
```

### Complete Frontend Build Arguments

```bash
VITE_API_BASE_URL=https://api.your-domain.com
VITE_WS_BASE_URL=wss://api.your-domain.com
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

---

## WebSocket Configuration

### 1. Verify Redis is Running

In Dokploy, check that the `ticketing-redis` database is **running**.

### 2. Update Backend Settings (if needed)

The `backend/config/settings.py` should already have:

```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [(os.getenv('REDIS_HOST', '127.0.0.1'), int(os.getenv('REDIS_PORT', 6379)))],
        },
    } if not DEBUG else {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}
```

### 3. WebSocket Endpoints

Once deployed, WebSocket connections will be available at:

```
wss://api.your-domain.com/ws/notifications/
wss://api.your-domain.com/ws/projects/<project_id>/tickets/
wss://api.your-domain.com/ws/projects/<project_id>/presence/
```

### 4. Traefik Configuration

Dokploy's Traefik automatically handles:

- ✅ HTTP → HTTPS redirect
- ✅ WebSocket upgrade headers
- ✅ Let's Encrypt SSL certificates
- ✅ WSS (WebSocket Secure) connections

**No additional configuration needed!**

---

## Testing the Deployment

### 1. Test Backend API

```bash
curl https://api.your-domain.com/api/health/
```

Expected response: `{"status": "ok"}`

### 2. Test Frontend

Open browser: `https://tickets.your-domain.com`

You should see the login page.

### 3. Test WebSocket Connection

1. Login to the app
2. Open browser DevTools → Console
3. You should see WebSocket connection logs:

```
🔌 [WebSocket] Connecting to ws/notifications/
🔌 [WebSocket] Connected to ws/notifications/
```

4. Check Network tab → WS filter → You should see active WebSocket connections

### 4. Test Real-Time Features

1. Open the app in two different browsers/tabs
2. Create a ticket in one tab
3. The other tab should receive the update instantly (without refresh)

---

## Troubleshooting

### Issue: WebSocket Connection Failed

**Symptoms**: Console shows `WebSocket connection to 'wss://...' failed`

**Solutions**:

1. Verify VITE_WS_BASE_URL uses `wss://` (not `ws://`)
2. Check backend logs for WebSocket errors
3. Ensure Redis is running
4. Check JWT token is valid

**Debug in Console**:

```javascript
const token = localStorage.getItem("access_token");
console.log("Token:", token);
const ws = new WebSocket(
  `wss://api.your-domain.com/ws/notifications/?token=${token}`
);
ws.onopen = () => console.log("Connected!");
ws.onerror = (e) => console.error("Error:", e);
```

### Issue: 403 Forbidden on WebSocket

**Cause**: Invalid or expired JWT token

**Solution**:

1. Logout and login again
2. Check token expiration in backend settings
3. Verify JWT middleware is correctly configured

### Issue: Messages Not Broadcasting

**Cause**: Redis not connected or channel layer misconfigured

**Solutions**:

1. Check Redis is running:

```bash
# In Dokploy terminal for backend
python manage.py shell
>>> from channels.layers import get_channel_layer
>>> channel_layer = get_channel_layer()
>>> print(channel_layer)
```

2. Verify REDIS_HOST and REDIS_PORT environment variables
3. Check backend logs for channel layer errors

### Issue: CORS Errors

**Symptoms**: `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`

**Solution**:
Update backend environment variable:

```bash
CORS_ALLOWED_ORIGINS=https://tickets.your-domain.com,https://api.your-domain.com
```

Make sure **NO trailing slashes** and use exact domains.

### Issue: 502 Bad Gateway

**Cause**: Backend not running or crashed

**Solutions**:

1. Check backend logs in Dokploy
2. Verify database connection (DB_HOST, DB_PASSWORD)
3. Check if migrations ran successfully
4. Restart backend container

### Issue: Static Files Not Loading

**Solution**:

```bash
# In backend terminal
python manage.py collectstatic --noinput
```

Or verify `entrypoint.sh` includes collectstatic command.

---

## Maintenance

### Updating the Application

#### Backend Updates

1. Push changes to GitHub
2. In Dokploy, go to backend app
3. Click **"Redeploy"**
4. Dokploy will rebuild and restart

#### Frontend Updates

1. Push changes to GitHub
2. In Dokploy, go to frontend app
3. Click **"Redeploy"**
4. New build will be created with updated code

### Database Backups

#### Manual Backup

```bash
# In Dokploy terminal for PostgreSQL
pg_dump -U postgres ticketing > backup.sql
```

#### Automated Backups

Configure in Dokploy → Database → Backups:

- Schedule: Daily at 2 AM
- Retention: 7 days

### Monitoring

#### Check Logs

- **Backend**: Dokploy → Backend App → Logs
- **Frontend**: Dokploy → Frontend App → Logs
- **PostgreSQL**: Dokploy → Database → Logs
- **Redis**: Dokploy → Redis → Logs

#### WebSocket Metrics

Monitor in backend logs:

```
🔌 [WebSocket] User 1 connected to notifications
🔌 [WebSocket] Broadcasting to project_5_tickets
```

### Scaling

#### Horizontal Scaling (Multiple Instances)

1. Dokploy → Backend App → Scale
2. Increase replicas: 2-3 instances
3. Redis will handle message distribution

**Note**: Redis is **required** for horizontal scaling of WebSocket connections.

---

## Production Checklist

Before going live, verify:

- [ ] PostgreSQL database created and accessible
- [ ] Redis instance running
- [ ] Backend deployed with correct environment variables
- [ ] Frontend deployed with correct build arguments
- [ ] HTTPS enabled on both frontend and backend
- [ ] CORS_ALLOWED_ORIGINS configured correctly
- [ ] DEBUG=False in backend
- [ ] Strong SECRET_KEY generated
- [ ] Database migrations applied
- [ ] Superuser created
- [ ] Static files collected
- [ ] WebSocket connections working (test in browser)
- [ ] Real-time notifications appearing
- [ ] Domain names configured
- [ ] SSL certificates active (Let's Encrypt)
- [ ] Backup strategy configured

---

## Security Best Practices

1. **Never commit secrets to Git**

   - Use Dokploy environment variables
   - Add `.env` to `.gitignore`

2. **Use strong passwords**

   - PostgreSQL password: 20+ characters
   - Django SECRET_KEY: 50+ characters

3. **Enable HTTPS everywhere**

   - Let's Encrypt for domains
   - WSS for WebSocket connections

4. **Restrict CORS origins**

   - Only allow your frontend domain
   - No wildcards in production

5. **Regular updates**

   - Keep dependencies updated
   - Monitor security advisories

6. **Remove development features**
   - Remove SUPER_SECRET_KEY
   - Set DEBUG=False
   - Disable development CORS settings

---

## Quick Reference

### WebSocket URLs (Production)

```
wss://api.your-domain.com/ws/notifications/
wss://api.your-domain.com/ws/projects/<id>/tickets/
wss://api.your-domain.com/ws/projects/<id>/presence/
```

### Environment Variables Files

**Backend** (set in Dokploy):

```bash
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
DEBUG, SECRET_KEY, ALLOWED_HOSTS
CORS_ALLOWED_ORIGINS
REDIS_HOST, REDIS_PORT
```

**Frontend** (build args in Dokploy):

```bash
VITE_API_BASE_URL
VITE_WS_BASE_URL
VITE_APP_NAME
VITE_APP_VERSION
```

### Useful Commands

```bash
# Backend
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Database
pg_dump -U postgres ticketing > backup.sql
psql -U postgres ticketing < backup.sql

# Redis
redis-cli ping
redis-cli KEYS *
```

---

## Support

If you encounter issues:

1. Check logs in Dokploy
2. Review this guide's troubleshooting section
3. Verify all environment variables
4. Test WebSocket connections in browser console

---

## Summary

Your Ticketing System with WebSockets is now deployed on Dokploy! 🎉

**What's Working**:

- ✅ Real-time notifications via WebSocket
- ✅ Live ticket updates across all clients
- ✅ Presence indicators (who's online)
- ✅ Secure connections (HTTPS/WSS)
- ✅ Scalable architecture with Redis
- ✅ Auto-reconnection on network issues

**Architecture**:

- Frontend: React + Nginx → `https://tickets.your-domain.com`
- Backend: Django + Daphne → `https://api.your-domain.com`
- Database: PostgreSQL
- WebSockets: Django Channels + Redis
- Proxy: Traefik (managed by Dokploy)

Enjoy your real-time ticketing system! 🚀
