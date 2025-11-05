# Environment Variables Reference

Complete guide to all environment variables used in the Ticketing System.

---

## Backend Environment Variables

### Database Configuration

| Variable      | Required | Default    | Description              | Example                       |
| ------------- | -------- | ---------- | ------------------------ | ----------------------------- |
| `DB_HOST`     | ✅ Yes   | -          | PostgreSQL database host | `localhost` or `ticketing-db` |
| `DB_PORT`     | No       | `5432`     | PostgreSQL database port | `5432`                        |
| `DB_NAME`     | No       | `postgres` | Database name            | `ticketing`                   |
| `DB_USER`     | No       | `postgres` | Database username        | `postgres`                    |
| `DB_PASSWORD` | ✅ Yes   | -          | Database password        | `your-secure-password`        |

### Django Core Settings

| Variable        | Required | Default               | Description                                            | Example                     |
| --------------- | -------- | --------------------- | ------------------------------------------------------ | --------------------------- |
| `DEBUG`         | No       | `False`               | Enable debug mode (set to `True` only for development) | `False`                     |
| `SECRET_KEY`    | ✅ Yes   | Dev key               | Django secret key for cryptographic signing            | `django-insecure-...`       |
| `ALLOWED_HOSTS` | ✅ Yes   | `localhost,127.0.0.1` | Comma-separated list of allowed hosts                  | `api.example.com,localhost` |

**Generate SECRET_KEY:**

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### CORS Configuration

| Variable               | Required | Default | Description                                      | Example                                               |
| ---------------------- | -------- | ------- | ------------------------------------------------ | ----------------------------------------------------- |
| `CORS_ALLOWED_ORIGINS` | ✅ Yes   | -       | Comma-separated list of allowed origins for CORS | `https://tickets.example.com,https://api.example.com` |

**Important**:

- No trailing slashes
- Use exact protocol (`https://` or `http://`)
- Separate multiple origins with commas
- No spaces between origins

### Redis Configuration (WebSockets)

| Variable     | Required | Default     | Description                                            | Example                          |
| ------------ | -------- | ----------- | ------------------------------------------------------ | -------------------------------- |
| `REDIS_HOST` | No       | `127.0.0.1` | Redis server host (required for production WebSockets) | `ticketing-redis` or `localhost` |
| `REDIS_PORT` | No       | `6379`      | Redis server port                                      | `6379`                           |

**Purpose**: Redis is used by Django Channels to route WebSocket messages between multiple server instances.

**Development**: In-memory channel layer is used automatically when `DEBUG=True`.

**Production**: Redis-backed channel layer is used when `DEBUG=False`.

### JWT Authentication

| Variable                        | Required | Default | Description                                | Example |
| ------------------------------- | -------- | ------- | ------------------------------------------ | ------- |
| `ACCESS_TOKEN_LIFETIME_MINUTES` | No       | `60`    | How long access tokens are valid (minutes) | `60`    |
| `REFRESH_TOKEN_LIFETIME_DAYS`   | No       | `7`     | How long refresh tokens are valid (days)   | `7`     |

### Development/Testing Only

| Variable           | Required | Default | Description                                             | Example |
| ------------------ | -------- | ------- | ------------------------------------------------------- | ------- |
| `SUPER_SECRET_KEY` | ❌ No    | Dev key | **REMOVE IN PRODUCTION!** Bypasses JWT auth for testing | -       |

⚠️ **Warning**: Remove `SUPER_SECRET_KEY` from production environments!

---

## Frontend Build Arguments

These are set during Docker build, not runtime.

### API Configuration

| Variable            | Required | Default                 | Description          | Example                   |
| ------------------- | -------- | ----------------------- | -------------------- | ------------------------- |
| `VITE_API_BASE_URL` | ✅ Yes   | `http://localhost:8000` | Backend API base URL | `https://api.example.com` |
| `VITE_WS_BASE_URL`  | ✅ Yes   | (derived from API URL)  | WebSocket base URL   | `wss://api.example.com`   |

**Important**:

- Use `https://` for `VITE_API_BASE_URL` in production
- Use `wss://` for `VITE_WS_BASE_URL` in production
- Both should point to the **backend** domain
- No trailing slashes

### Application Metadata

| Variable           | Required | Default            | Description                  | Example            |
| ------------------ | -------- | ------------------ | ---------------------------- | ------------------ |
| `VITE_APP_NAME`    | No       | `Ticketing System` | Application name shown in UI | `Ticketing System` |
| `VITE_APP_VERSION` | No       | `1.0.0`            | Application version          | `1.0.0`            |

---

## Environment Setup Examples

### Local Development (.env file)

**Backend** (`backend/.env`):

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing
DB_USER=postgres
DB_PASSWORD=postgres123

# Django
DEBUG=True
SECRET_KEY=django-insecure-local-dev-key
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Redis (optional for development - in-memory is used when DEBUG=True)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7
```

**Frontend** (`frontend/.env`):

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_APP_NAME=Ticketing System (Dev)
VITE_APP_VERSION=1.0.0-dev
```

### Docker Compose

Set in `docker-compose.yml` under `environment:` sections (see docker-compose.yml file).

### Dokploy Production

**Backend Environment Variables** (set in Dokploy UI):

```bash
# Database (from Dokploy PostgreSQL service)
DB_HOST=ticketing-db
DB_PORT=5432
DB_NAME=ticketing
DB_USER=postgres
DB_PASSWORD=<strong-generated-password>

# Django
DEBUG=False
SECRET_KEY=<strong-generated-key>
ALLOWED_HOSTS=api.your-domain.com,localhost,127.0.0.1

# CORS
CORS_ALLOWED_ORIGINS=https://tickets.your-domain.com,https://api.your-domain.com

# Redis (from Dokploy Redis service)
REDIS_HOST=ticketing-redis
REDIS_PORT=6379

# JWT
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7
```

**Frontend Build Arguments** (set in Dokploy UI):

```bash
VITE_API_BASE_URL=https://api.your-domain.com
VITE_WS_BASE_URL=wss://api.your-domain.com
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

---

## Validation

### Backend

Check if environment variables are loaded:

```bash
# In Django shell
python manage.py shell

>>> import os
>>> print(os.getenv('DB_HOST'))
>>> print(os.getenv('REDIS_HOST'))
>>> print(os.getenv('DEBUG'))
```

### Frontend

Check build-time variables in browser console:

```javascript
console.log(import.meta.env.VITE_API_BASE_URL);
console.log(import.meta.env.VITE_WS_BASE_URL);
```

---

## Security Checklist

Before deploying to production:

- [ ] `DEBUG=False`
- [ ] Strong `SECRET_KEY` (50+ characters)
- [ ] Strong `DB_PASSWORD` (20+ characters)
- [ ] `CORS_ALLOWED_ORIGINS` restricted to your domains only
- [ ] No `SUPER_SECRET_KEY` in production
- [ ] `ALLOWED_HOSTS` restricted to your domains
- [ ] HTTPS enabled (`https://` and `wss://`)
- [ ] Redis host accessible from backend
- [ ] All secrets stored in Dokploy (not in Git)

---

## Troubleshooting

### Issue: Database Connection Failed

**Check**:

```bash
echo $DB_HOST
echo $DB_PASSWORD
```

**Solution**: Verify DB credentials match PostgreSQL service.

### Issue: CORS Errors

**Check**:

```bash
echo $CORS_ALLOWED_ORIGINS
```

**Solution**:

- Must include frontend domain
- No trailing slashes
- Correct protocol (https)

### Issue: WebSocket Connection Failed

**Check**:

```bash
echo $REDIS_HOST
echo $REDIS_PORT
```

**Solution**:

- Verify Redis is running
- Check REDIS_HOST matches Redis service name
- In production, DEBUG must be False to use Redis

### Issue: "DisallowedHost" Error

**Check**:

```bash
echo $ALLOWED_HOSTS
```

**Solution**: Add your domain to ALLOWED_HOSTS.

### Issue: Frontend can't connect to backend

**Check build args**:

- `VITE_API_BASE_URL` should point to backend domain
- Use `https://` in production
- No trailing slash

---

## Quick Reference

### Required for Local Development

```bash
# Backend
DB_HOST=localhost
DB_PASSWORD=<password>
DEBUG=True

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```

### Required for Production

```bash
# Backend
DB_HOST=<db-service>
DB_PASSWORD=<strong-password>
SECRET_KEY=<strong-key>
ALLOWED_HOSTS=<your-domains>
CORS_ALLOWED_ORIGINS=<your-frontend-domain>
REDIS_HOST=<redis-service>
DEBUG=False

# Frontend
VITE_API_BASE_URL=https://<backend-domain>
VITE_WS_BASE_URL=wss://<backend-domain>
```

---

## Notes

1. **Frontend variables are build-time only** - They're compiled into the JavaScript bundle during build. Changes require rebuild.

2. **Backend variables are runtime** - Changes take effect after container restart.

3. **Never commit .env files to Git** - Add to `.gitignore`

4. **Use Dokploy UI for secrets** - Don't hardcode in Dockerfiles

5. **Redis is optional for development** - Django Channels uses in-memory layer when DEBUG=True

6. **WebSocket URL derivation** - If VITE_WS_BASE_URL is not set, it's automatically derived from VITE_API_BASE_URL (http→ws, https→wss)
