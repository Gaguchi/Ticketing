# Quick Deployment Checklist

## Step 1: Backend Dokploy Environment Variables

Copy and paste these into your **backend** service environment variables in Dokploy:

```
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=YOUR_DB_PASSWORD_HERE
DB_HOST=tickets-db-ydxqzn
DB_PORT=5432
SECRET_KEY=CHANGE_THIS_TO_RANDOM_STRING
DEBUG=False
ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me,localhost
USE_HTTPS=False
CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me,http://localhost:5173
```

**Important:** 
- Replace `YOUR_DB_PASSWORD_HERE` with your actual database password
- Generate a new `SECRET_KEY` (use: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)

## Step 2: Frontend Dokploy Environment Variables

Copy and paste this into your **frontend** service environment variables in Dokploy:

```
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

## Step 3: Deploy Backend

1. Go to backend service in Dokploy
2. Click "Redeploy" or "Deploy"
3. Wait for build to complete

## Step 4: Run Migrations

1. Open backend terminal in Dokploy
2. Run: `python manage.py migrate`
3. (Optional) Create superuser: `python manage.py createsuperuser`

## Step 5: Deploy Frontend

1. Go to frontend service in Dokploy
2. Click "Redeploy" or "Deploy"
3. Wait for build to complete

## Step 6: Test

1. Open: http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me/
2. Click "Create Account"
3. Register a new user
4. Should redirect to project setup
5. Create a project
6. Should see dashboard

## Troubleshooting

### If registration fails with connection error:
- Check backend is running: `curl http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/health/`
- Verify `CORS_ALLOWED_ORIGINS` includes frontend domain
- Check browser console for specific error

### If CORS error appears:
- Verify backend has: `CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me`
- Redeploy backend after adding CORS setting

### If 500 Internal Server Error:
- Check backend logs in Dokploy
- Verify all environment variables are set correctly
- Ensure migrations have been run

## Next Steps After Deployment

1. Create your first project
2. Set up columns (To Do, In Progress, Done, etc.)
3. Start creating tickets!
4. Invite team members

---

**Need more details?** See [DOKPLOY_SETUP.md](./DOKPLOY_SETUP.md) for comprehensive deployment guide.
