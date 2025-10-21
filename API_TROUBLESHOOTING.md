# API Troubleshooting Guide

## Common Issues and Solutions

### 1. 404 Not Found on `/api`

**Problem:**
```
Failed to load resource: the server responded with a status of 404 (Not Found)
URL: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api
```

**Cause:** The `/api` endpoint didn't exist. Backend endpoints are at `/api/tickets/`, `/api/docs/`, etc.

**Solution:** ✅ Fixed
- Added `/api/` root endpoint that lists available routes
- Added `/` health check endpoint
- Frontend already correctly uses `/api/tickets/` endpoints

**Test URLs:**
- Health: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/
- API Root: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/
- API Docs: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/docs/
- Tickets: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/tickets/tickets/

---

### 2. Cross-Origin-Opener-Policy (COOP) Warning

**Problem:**
```
The Cross-Origin-Opener-Policy header has been ignored, because the URL's origin was untrustworthy.
It was defined either in the final response or a redirect.
Please deliver the response using the HTTPS protocol.
```

**Cause:** COOP headers are only respected on HTTPS (secure) connections. Using HTTP makes the origin "untrustworthy."

**Solutions:**

#### Option A: Enable HTTPS (Recommended for Production)

In Traefik/Dokploy, enable HTTPS with Let's Encrypt:

1. **Enable HTTPS in Dokploy:**
   - Go to service settings
   - Enable "SSL/TLS" or "Let's Encrypt"
   - Traefik will automatically provision certificates

2. **Update Environment Variables:**

   **Backend:**
   ```bash
   ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
   CORS_ALLOWED_ORIGINS=https://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
   ```

   **Frontend (rebuild required):**
   ```bash
   VITE_API_BASE_URL=https://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
   ```

#### Option B: Suppress Warning (Development Only)

The warning is just informational. The custom middleware now:
- Only adds COOP header on HTTPS connections
- Still allows the application to work on HTTP
- Adds other security headers that work on HTTP

**Current State:** ✅ Fixed
- COOP header only added on HTTPS
- Warning won't appear (header not sent on HTTP)
- App works normally on HTTP

---

### 3. CORS Errors

**Problem:**
```
Access to fetch at 'http://backend...' from origin 'http://frontend...' has been blocked by CORS policy
```

**Cause:** Backend doesn't allow requests from frontend domain.

**Solution:** ✅ Already Configured

Ensure backend has correct `CORS_ALLOWED_ORIGINS`:

```bash
# In Dokploy Backend Environment Variables
CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

Or for HTTPS:
```bash
CORS_ALLOWED_ORIGINS=https://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

**Multiple origins (comma-separated):**
```bash
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me,https://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

---

## Verification Steps

### 1. Check Backend is Running

Visit: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/

Expected response:
```json
{
  "status": "healthy",
  "service": "backend"
}
```

### 2. Check API Root

Visit: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/

Expected response:
```json
{
  "message": "Ticketing System API",
  "version": "1.0.0",
  "endpoints": {
    "tickets": "/api/tickets/",
    "admin": "/admin/",
    "docs": "/api/docs/",
    "schema": "/api/schema/"
  }
}
```

### 3. Check API Documentation

Visit: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/docs/

Should see Swagger UI with all API endpoints.

### 4. Check Tickets Endpoint

Visit: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/tickets/tickets/

Expected response:
```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

### 5. Test CORS from Frontend

Open browser console on frontend and run:
```javascript
fetch('http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Should see the API root response (no CORS error).

---

## Environment Variable Checklist

### Backend (Dokploy Environment Variables)

```bash
# Django Configuration
SECRET_KEY=<generated-secret-key>
DEBUG=False
ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me

# Database (Internal)
DB_HOST=tickets-db-ydxqzn
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<your-password>

# CORS - IMPORTANT: Match frontend domain exactly
CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

### Frontend (Dokploy Build Arguments)

```bash
# IMPORTANT: Match backend domain exactly
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

---

## Common Mistakes

### ❌ Wrong: Trailing Slash in API_BASE_URL
```bash
VITE_API_BASE_URL=http://backend.../   # DON'T include trailing slash
```

### ✅ Correct:
```bash
VITE_API_BASE_URL=http://backend...
```

### ❌ Wrong: Mismatched Protocols
```bash
# Backend
CORS_ALLOWED_ORIGINS=https://frontend...

# Frontend
VITE_API_BASE_URL=http://backend...    # ← Different protocol!
```

### ✅ Correct: Match Protocols
```bash
# Backend
CORS_ALLOWED_ORIGINS=http://frontend...

# Frontend
VITE_API_BASE_URL=http://backend...    # ← Same protocol!
```

### ❌ Wrong: Using Internal DB Host from External
```bash
# Local development .env
DB_HOST=tickets-db-ydxqzn  # ← Won't work from outside Docker
```

### ✅ Correct: Use External Host for Local Dev
```bash
# Local development .env
DB_HOST=31.97.181.167
DB_PORT=5433
```

---

## Browser Console Debugging

### Check CORS Headers

Open DevTools → Network tab → Click on API request → Check Response Headers:

**Should see:**
```
Access-Control-Allow-Origin: http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
Access-Control-Allow-Credentials: true
```

**If missing:**
- Backend `CORS_ALLOWED_ORIGINS` not set correctly
- Restart backend service after changing env vars

### Check Request Headers

Request should include:
```
Origin: http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

### Check Preflight Requests

For POST/PUT/DELETE, you'll see two requests:
1. **OPTIONS** (preflight) - checks CORS permissions
2. **POST/PUT/DELETE** (actual request)

Both must succeed!

---

## Production HTTPS Upgrade Path

When ready to enable HTTPS:

1. **Enable Let's Encrypt in Dokploy** for both services

2. **Update Backend Environment Variables:**
   ```bash
   ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
   CORS_ALLOWED_ORIGINS=https://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
   DEBUG=False
   ```

3. **Update Frontend Build Arguments (rebuild required):**
   ```bash
   VITE_API_BASE_URL=https://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
   ```

4. **Restart Backend** (for env var changes)

5. **Rebuild Frontend** (build args require rebuild)

6. **Test all URLs with HTTPS:**
   - https://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me/
   - https://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/

---

## Additional Security Headers (Now Configured)

The backend now sends these security headers:

### On HTTP:
- `Cross-Origin-Resource-Policy: cross-origin` (allows CORS)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `X-Frame-Options: SAMEORIGIN`

### On HTTPS (in addition to above):
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Strict-Transport-Security` headers (HSTS)

---

## Need More Help?

### Check Logs

**In Dokploy:**
- Click service → "Logs" tab
- Look for errors, 404s, CORS rejections

**Django Debug Mode (Local Only):**
```bash
DEBUG=True  # Shows detailed errors
```

### Common Log Messages

**CORS rejection:**
```
Origin 'http://frontend...' not in CORS_ALLOWED_ORIGINS
```
**Solution:** Add frontend domain to `CORS_ALLOWED_ORIGINS`

**DisallowedHost:**
```
Invalid HTTP_HOST header: 'backend...'
```
**Solution:** Add backend domain to `ALLOWED_HOSTS`

---

## Testing Checklist After Deployment

- [ ] Health check: `http://backend.../` returns `{"status": "healthy"}`
- [ ] API root: `http://backend.../api/` returns endpoint list
- [ ] API docs: `http://backend.../api/docs/` loads Swagger UI
- [ ] Tickets endpoint: `http://backend.../api/tickets/tickets/` returns JSON
- [ ] Admin panel: `http://backend.../admin/` shows login page
- [ ] Frontend loads: `http://frontend.../` shows app
- [ ] Frontend→Backend: No CORS errors in console
- [ ] Create ticket works (if UI implemented)
- [ ] No security warnings in console (except COOP on HTTP - that's OK)
