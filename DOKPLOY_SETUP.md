# Dokploy Deployment Configuration

## Backend Environment Variables

Set these in Dokploy for the **backend** service:

```bash
# Database (use internal Dokploy database service)
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=tickets-db-ydxqzn  # Internal Dokploy database hostname
DB_PORT=5432

# Django Configuration
SECRET_KEY=your-production-secret-key-change-this
DEBUG=False
ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me,localhost,127.0.0.1

# HTTPS Configuration (set to False for HTTP deployment)
USE_HTTPS=False

# CORS - Allow frontend domain
CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me,http://localhost:5173
```

## Frontend Environment Variables

Set these in Dokploy for the **frontend** service:

```bash
# API URL - points to backend service
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me

# App Configuration
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

## Database Migrations

After deploying the backend, run these commands in Dokploy terminal:

```bash
# 1. Run migrations
python manage.py migrate

# 2. Create default project (if needed)
python manage.py migrate tickets 0003_create_default_project

# 3. Create superuser (optional)
python manage.py createsuperuser
```

## Testing the Deployment

### 1. Test Backend Health

```bash
curl http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/health/
```

Expected response:

```json
{
  "status": "healthy",
  "database": "connected",
  "debug_mode": false,
  "use_https": false
}
```

### 2. Test Authentication Endpoints

**Register a user:**

```bash
curl -X POST http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/tickets/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

**Login:**

```bash
curl -X POST http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/tickets/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

Expected response:

```json
{
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User"
  },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 3. Test Project Creation

```bash
# Get the access token from login response, then:
curl -X POST http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/tickets/projects/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "key": "PROJ",
    "name": "My Project",
    "description": "Test project",
    "lead_username": "testuser"
  }'
```

### 4. Test Frontend

Open: http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me/

1. Click "Create Account"
2. Fill in registration form
3. Should redirect to /setup
4. Create a project
5. Should redirect to dashboard

## Common Issues

### CORS Errors

**Symptom:** Browser shows "CORS policy" errors

**Fix:** Ensure `CORS_ALLOWED_ORIGINS` in backend includes the frontend domain:

```bash
CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

### Connection Refused

**Symptom:** `ERR_CONNECTION_REFUSED` when calling APIs

**Fix:** Check that:

1. Backend service is running in Dokploy
2. Frontend `.env.production` has correct `VITE_API_BASE_URL`
3. Backend domain is accessible: `curl http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/health/`

### Migration Errors

**Symptom:** Database errors on first deployment

**Fix:** Run migrations in Dokploy terminal:

```bash
python manage.py migrate
```

### 401 Unauthorized

**Symptom:** All API calls return 401 after login

**Fix:** Check that:

1. JWT token is being stored in localStorage
2. API service includes `Authorization: Bearer TOKEN` header
3. Token hasn't expired (default: 1 day)

## Security Checklist

- [ ] Change `SECRET_KEY` to a strong random value
- [ ] Set `DEBUG=False` in production
- [ ] Update `DB_PASSWORD` to a strong password
- [ ] Verify `ALLOWED_HOSTS` includes only your domains
- [ ] Verify `CORS_ALLOWED_ORIGINS` includes only your frontend domain
- [ ] Set `USE_HTTPS=True` when HTTPS is enabled in Dokploy

## Deployment Steps

1. **Update Backend Environment Variables in Dokploy**

   - Go to backend service settings
   - Add all environment variables listed above
   - Save and redeploy

2. **Update Frontend Environment Variables in Dokploy**

   - Go to frontend service settings
   - Add `VITE_API_BASE_URL` with backend domain
   - Save and redeploy

3. **Run Migrations**

   - Open backend terminal in Dokploy
   - Run `python manage.py migrate`

4. **Create Superuser (Optional)**

   - Run `python manage.py createsuperuser`
   - Access admin at: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/admin/

5. **Test the Application**
   - Open frontend URL
   - Register a new user
   - Create a project
   - Verify everything works

## URLs Reference

- **Frontend:** http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me/
- **Backend API:** http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/
- **Backend Admin:** http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/admin/
- **API Docs:** http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/docs/
- **Health Check:** http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/health/
