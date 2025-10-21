# Dokploy Deployment Configuration

## Services Overview

- **Frontend**: http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me/
- **Backend**: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/
- **Database**: Internal (tickets-db-ydxqzn:5432)

---

## Backend Service Configuration

### Environment Variables (Runtime)

Set these in the Dokploy dashboard for the backend service:

```bash
# Django Configuration
SECRET_KEY=<generate-with-get_random_secret_key>
DEBUG=False
ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me,localhost,127.0.0.1

# Database Configuration (Internal Docker Network)
DB_HOST=tickets-db-ydxqzn
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<your-database-password>
DATABASE_URL=postgresql://postgres:<password>@tickets-db-ydxqzn:5432/postgres

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me,https://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

### Build Configuration

**Dockerfile**: `backend/Dockerfile`

**Build Context**: `./backend`

**Port**: 8000

### Health Check

Endpoint: `/api/tickets/tickets/` or `/admin/`

### Commands

```bash
# Migrations (run once after deployment)
python manage.py migrate

# Create superuser (run once)
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic --noinput
```

---

## Frontend Service Configuration

### Environment Variables (Build-time)

⚠️ **Important**: In Dokploy, set these as **Build Arguments** (not Runtime Variables) because Vite embeds them at build time.

```bash
# API Configuration
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me

# App Configuration
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

### Build Configuration

**Dockerfile**: `frontend/Dockerfile`

**Build Context**: `./frontend`

**Port**: 80 (Nginx)

### Build Arguments in Dockerfile

Update your `frontend/Dockerfile` to accept build arguments:

```dockerfile
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Accept build arguments
ARG VITE_API_BASE_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION

# Set environment variables for build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build the application
RUN npm run build

# Production stage
FROM nginx:1.26.2-alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

Ensure `frontend/nginx.conf` handles the API proxy correctly:

```nginx
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Client-side routing support
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Don't cache index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

---

## Database Service Configuration

### Environment Variables

```bash
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<your-secure-password>
```

### Internal Connection (from Backend)

```
Host: tickets-db-ydxqzn
Port: 5432
Database: postgres
User: postgres
Password: <password>
```

### External Connection (for local development)

```
Host: 31.97.181.167
Port: 5433
Database: postgres
User: postgres
Password: <password>
```

---

## Deployment Steps

### Initial Setup

1. **Create Backend Service in Dokploy**
   - Name: `tickets-backend`
   - Type: Docker
   - Repository: Your Git repository
   - Branch: `main`
   - Dockerfile path: `backend/Dockerfile`
   - Build context: `./backend`
   - Port: 8000
   - Domain: `tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me`

2. **Set Backend Environment Variables**
   ```
   SECRET_KEY=<generated-key>
   DEBUG=False
   ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
   DB_HOST=tickets-db-ydxqzn
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=<password>
   CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
   ```

3. **Deploy Backend**
   - Click "Deploy"
   - Wait for build to complete

4. **Run Migrations**
   ```bash
   # In Dokploy terminal or SSH
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py collectstatic --noinput
   ```

5. **Create Frontend Service in Dokploy**
   - Name: `tickets-frontend`
   - Type: Docker
   - Repository: Your Git repository
   - Branch: `main`
   - Dockerfile path: `frontend/Dockerfile`
   - Build context: `./frontend`
   - Port: 80
   - Domain: `tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me`

6. **Set Frontend Build Arguments**
   ```
   VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
   VITE_APP_NAME=Ticketing System
   VITE_APP_VERSION=1.0.0
   ```

7. **Deploy Frontend**
   - Click "Deploy"
   - Wait for build to complete

### Verification

1. **Check Backend**
   - Visit: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/admin/
   - Should see Django admin login

2. **Check API**
   - Visit: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/docs/
   - Should see Swagger API documentation

3. **Check Frontend**
   - Visit: http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me/
   - Should see the ticketing system interface

---

## Environment Variable Templates

### Backend `.env` (for Dokploy)

```bash
# Django
SECRET_KEY=django-insecure-REPLACE-WITH-SECURE-KEY-FROM-get_random_secret_key
DEBUG=False
ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me,localhost

# Database (Internal)
DB_HOST=tickets-db-ydxqzn
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=REPLACE-WITH-SECURE-PASSWORD
DATABASE_URL=postgresql://postgres:REPLACE-WITH-PASSWORD@tickets-db-ydxqzn:5432/postgres

# CORS
CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me,https://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

### Frontend Build Args (for Dokploy)

```bash
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

---

## Troubleshooting

### CORS Errors

If you see CORS errors in browser console:

1. **Check Backend CORS_ALLOWED_ORIGINS**
   - Must include frontend domain
   - Check for typos
   - Include both http and https if needed

2. **Check Backend ALLOWED_HOSTS**
   - Must include backend domain

3. **Restart Backend Service** after changing environment variables

### Frontend Can't Connect to Backend

1. **Check VITE_API_BASE_URL**
   - Must match backend domain exactly
   - Include protocol (http://)

2. **Rebuild Frontend** after changing build arguments
   - Vite embeds variables at build time
   - Changes require rebuild

### Database Connection Issues

1. **Check DB_HOST**
   - Use internal host: `tickets-db-ydxqzn`
   - NOT external IP `31.97.181.167`

2. **Check Database Service is Running**
   - Verify in Dokploy dashboard

3. **Check Database Password**
   - Must match in backend and database service

### 502 Bad Gateway

1. **Check Service is Running**
2. **Check Port Configuration** (8000 for backend, 80 for frontend)
3. **Check Application Logs** in Dokploy

---

## Updating Deployment

### Backend Updates

1. Push code changes to Git
2. In Dokploy, click "Redeploy"
3. Run migrations if models changed:
   ```bash
   python manage.py migrate
   ```

### Frontend Updates

1. Push code changes to Git
2. In Dokploy, click "Redeploy"
3. Frontend automatically rebuilds with build arguments

### Environment Variable Changes

1. Update in Dokploy dashboard
2. **Backend**: Restart service
3. **Frontend**: Rebuild service (build arguments need rebuild)

---

## Security Checklist

- [ ] Change default database password
- [ ] Generate new SECRET_KEY for Django
- [ ] Set DEBUG=False in production
- [ ] Configure ALLOWED_HOSTS correctly
- [ ] Configure CORS_ALLOWED_ORIGINS correctly
- [ ] Enable HTTPS (upgrade Traefik domains to HTTPS)
- [ ] Set up regular database backups
- [ ] Monitor application logs
- [ ] Set up error tracking (Sentry)

---

## Monitoring

### Health Checks

- **Backend**: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/tickets/tickets/
- **Frontend**: http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me/health

### Logs

Access logs in Dokploy dashboard:
- Click on service → "Logs" tab
- Filter by date/time
- Search for errors

---

## Backup & Restore

### Database Backup

```bash
# Backup (from Dokploy terminal or SSH with access to internal network)
docker exec <db-container-id> pg_dump -U postgres postgres > backup.sql

# Or from external connection
pg_dump -h 31.97.181.167 -p 5433 -U postgres postgres > backup.sql
```

### Database Restore

```bash
# Restore
docker exec -i <db-container-id> psql -U postgres postgres < backup.sql

# Or from external connection
psql -h 31.97.181.167 -p 5433 -U postgres postgres < backup.sql
```

---

## Next Steps

1. **Enable HTTPS**: Configure Let's Encrypt in Traefik for both domains
2. **Authentication**: Implement JWT token authentication
3. **Monitoring**: Set up Sentry or similar for error tracking
4. **CI/CD**: Automate deployments with GitHub Actions
5. **Backups**: Set up automated daily database backups
6. **CDN**: Consider using a CDN for static assets
