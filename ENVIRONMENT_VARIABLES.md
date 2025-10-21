# Environment Variables Quick Reference

## 🔧 Backend (Runtime Environment Variables)

Set these in **Dokploy Dashboard → Backend Service → Environment Variables**:

| Variable               | Value                                                            | Required |
| ---------------------- | ---------------------------------------------------------------- | -------- |
| `SECRET_KEY`           | Generate with `get_random_secret_key()`                          | ✅ Yes   |
| `DEBUG`                | `False`                                                          | ✅ Yes   |
| `ALLOWED_HOSTS`        | `tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me`         | ✅ Yes   |
| `USE_HTTPS`            | `False` (HTTP) or `True` (HTTPS enabled in Dokploy)             | ✅ Yes   |
| `DB_HOST`              | `tickets-db-ydxqzn`                                              | ✅ Yes   |
| `DB_PORT`              | `5432`                                                           | ✅ Yes   |
| `DB_NAME`              | `postgres`                                                       | ✅ Yes   |
| `DB_USER`              | `postgres`                                                       | ✅ Yes   |
| `DB_PASSWORD`          | Your secure password                                             | ✅ Yes   |
| `CORS_ALLOWED_ORIGINS` | `http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me` | ✅ Yes   |

### Copy-Paste Template (Backend):

```
SECRET_KEY=<generate-this>
DEBUG=False
ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
USE_HTTPS=False
DB_HOST=tickets-db-ydxqzn
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<your-password>
CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

---

## 🎨 Frontend (Build Arguments)

Set these in **Dokploy Dashboard → Frontend Service → Build Arguments** (NOT Environment Variables):

| Variable            | Value                                                           | Required    |
| ------------------- | --------------------------------------------------------------- | ----------- |
| `VITE_API_BASE_URL` | `http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me` | ✅ Yes      |
| `VITE_APP_NAME`     | `Ticketing System`                                              | ⚠️ Optional |
| `VITE_APP_VERSION`  | `1.0.0`                                                         | ⚠️ Optional |

### Copy-Paste Template (Frontend):

```
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

---

## 🗄️ Database (Environment Variables)

Set these in **Dokploy Dashboard → Database Service → Environment Variables**:

| Variable            | Value                | Required |
| ------------------- | -------------------- | -------- |
| `POSTGRES_DB`       | `postgres`           | ✅ Yes   |
| `POSTGRES_USER`     | `postgres`           | ✅ Yes   |
| `POSTGRES_PASSWORD` | Your secure password | ✅ Yes   |

### Copy-Paste Template (Database):

```
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<your-secure-password>
```

---

## 🔐 How to Generate SECRET_KEY

Run this command locally:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Or in Django shell:

```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

---

## ⚠️ Important Notes

### Backend

- **Environment Variables** are set at **runtime**
- Changes require **service restart**
- No rebuild needed

### Frontend

- **Build Arguments** are embedded at **build time**
- Changes require **full rebuild**
- Not accessible at runtime

### Domains

- Backend: `http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me`
- Frontend: `http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me`

### CORS

- Must include frontend domain in `CORS_ALLOWED_ORIGINS`
- Must include backend domain in `ALLOWED_HOSTS`
- Both services must use matching protocols (http/https)

---

## 🚀 Deployment Checklist

### Before Deploying:

- [ ] Generate new `SECRET_KEY`
- [ ] Set strong `DB_PASSWORD`
- [ ] Set `DEBUG=False`
- [ ] Configure `ALLOWED_HOSTS` with backend domain
- [ ] Configure `CORS_ALLOWED_ORIGINS` with frontend domain
- [ ] Set `VITE_API_BASE_URL` to backend domain
- [ ] Commit and push code changes

### After Deploying Backend:

- [ ] Run migrations: `python manage.py migrate`
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Collect static files: `python manage.py collectstatic --noinput`
- [ ] Test API: Visit `/api/docs/`
- [ ] Test admin: Visit `/admin/`

### After Deploying Frontend:

- [ ] Test health check: Visit `/health`
- [ ] Test main app: Visit `/`
- [ ] Check browser console for errors
- [ ] Test API connectivity

---

## 🔍 Verification URLs

After deployment, test these URLs:

### Backend:

- Admin: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/admin/
- API Docs: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/docs/
- API Tickets: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/tickets/tickets/

### Frontend:

- Main App: http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me/
- Health: http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me/health

---

## 🐛 Troubleshooting

### "CORS Error" in browser

**Fix Backend:**

```
CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

Restart backend service.

### "Failed to fetch" or "Network Error"

**Fix Frontend (rebuild required):**

```
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
```

Rebuild frontend service.

### "DisallowedHost" error

**Fix Backend:**

```
ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
```

Restart backend service.

### Database connection failed

**Fix Backend:**

```
DB_HOST=tickets-db-ydxqzn
DB_PORT=5432
DB_PASSWORD=<correct-password>
```

Restart backend service.
