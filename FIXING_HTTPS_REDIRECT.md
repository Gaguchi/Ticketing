# 🔧 Fixing HTTP to HTTPS Redirect Issue

## The Problem

Your backend keeps redirecting HTTP to HTTPS even though:

- HTTPS toggle is OFF in Dokploy
- You're accessing `http://` URLs
- Django should allow HTTP

## Root Causes

### 1. Missing Environment Variable (Most Likely)

The `USE_HTTPS=False` environment variable may not be set in Dokploy.

### 2. Browser HSTS Cache

Modern browsers cache HTTPS redirects (HSTS) for security. If the site previously sent HTTPS redirect headers, your browser will force HTTPS for up to a year.

### 3. Traefik Configuration

Traefik might be configured to redirect HTTP to HTTPS at the load balancer level.

---

## Solution Steps

### Step 1: Set Environment Variable in Dokploy ⚙️

1. Open Dokploy Dashboard
2. Go to **Backend Service**
3. Click **"Environment Variables"** tab
4. Add this variable:
   ```
   Name:  USE_HTTPS
   Value: False
   ```
5. Click **"Save"**
6. Click **"Restart"** or **"Redeploy"** the service
7. Wait for deployment to complete (1-2 minutes)

### Step 2: Verify Configuration 🔍

After redeploying, visit:

```
http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/
```

You should see a JSON response like:

```json
{
  "status": "healthy",
  "service": "backend",
  "config": {
    "USE_HTTPS_env": "False",
    "USE_HTTPS_resolved": false,
    "SECURE_SSL_REDIRECT": false,
    "DEBUG": false,
    "is_secure_request": false,
    "scheme": "http"
  }
}
```

**Check these values:**

- ✅ `SECURE_SSL_REDIRECT` should be `false`
- ✅ `USE_HTTPS_resolved` should be `false`
- ✅ `scheme` should be `"http"`

### Step 3: Clear Browser HSTS Cache 🧹

Even after fixing the server, your browser might still force HTTPS due to cached HSTS policy.

#### Chrome/Edge:

1. Open a new tab
2. Go to: `chrome://net-internals/#hsts`
3. Scroll to **"Delete domain security policies"**
4. Enter: `tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me`
5. Click **"Delete"**
6. Close and reopen browser
7. Try accessing `http://tickets-backend-...` again

#### Firefox:

1. Close Firefox completely
2. Open File Explorer
3. Go to: `%APPDATA%\Mozilla\Firefox\Profiles\`
4. Open your profile folder (usually ends with `.default-release`)
5. Delete the file: `SiteSecurityServiceState.txt`
6. Reopen Firefox
7. Try accessing the site again

#### Safari:

1. Close Safari
2. Open Terminal
3. Run: `rm ~/Library/Cookies/HSTS.plist`
4. Reopen Safari

#### Nuclear Option (All Browsers):

Use **Incognito/Private Window** - this bypasses HSTS cache entirely.

### Step 4: Check Traefik Configuration 🚦

If the above doesn't work, Traefik might be forcing HTTPS at the load balancer level.

In Dokploy:

1. Go to **Backend Service → Settings**
2. Check **"Domain"** section
3. Verify **"HTTPS"** toggle is **OFF**
4. If it's ON, turn it OFF and save
5. Redeploy the service

---

## Quick Test Commands

### Test HTTP Endpoint (PowerShell):

```powershell
# Should NOT redirect (status 200)
Invoke-WebRequest -Uri "http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/" -MaximumRedirection 0
```

**Expected:** Status 200 with JSON response

**If redirecting:** You'll see status 307 or 301

### Test with curl (if installed):

```bash
curl -I http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/
```

Look for these headers:

- ✅ Good: `HTTP/1.1 200 OK`
- ❌ Bad: `HTTP/1.1 307 Temporary Redirect` or `Location: https://...`

---

## Why This Happens

### HSTS (HTTP Strict Transport Security)

When a server sends HSTS headers, browsers remember to ALWAYS use HTTPS for that domain, even if you type `http://`. This cache can last up to 1 year!

**Django's HSTS headers are sent when:**

```python
USE_HTTPS = True  # or not set, defaulting to True in production
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
```

**Our fix:**

```python
USE_HTTPS = False  # Explicitly disable HTTPS enforcement
SECURE_SSL_REDIRECT = False  # No redirects
# HSTS headers not sent
```

---

## Debugging Checklist

- [ ] Set `USE_HTTPS=False` in Dokploy environment variables
- [ ] Restarted/Redeployed backend service
- [ ] Waited 2+ minutes for deployment to complete
- [ ] Checked `/` endpoint shows `SECURE_SSL_REDIRECT: false`
- [ ] Cleared browser HSTS cache (or used Incognito)
- [ ] Verified HTTPS toggle is OFF in Dokploy domain settings
- [ ] Tested with `curl` or `Invoke-WebRequest` to bypass browser cache

---

## Still Having Issues?

### Check Dokploy Logs:

1. Go to Backend Service → **Logs** tab
2. Look for errors like:
   - `DisallowedHost`
   - `ALLOWED_HOSTS`
   - Redirect messages

### Verify Environment Variables Were Applied:

Visit the health check endpoint and check the `config` object:

```
http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/
```

If `USE_HTTPS_env` shows `"NOT_SET"`, the environment variable wasn't applied.

**Fix:**

1. Double-check the variable name is exactly: `USE_HTTPS` (case-sensitive)
2. Make sure you restarted the service after adding it
3. Check for typos in the value (should be `False`, not `false` or `FALSE`)

---

## Working Configuration

### Dokploy Backend Environment Variables:

```
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
USE_HTTPS=False
DB_HOST=tickets-db-ydxqzn
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

### Expected Health Check Response:

```json
{
  "status": "healthy",
  "service": "backend",
  "config": {
    "USE_HTTPS_env": "False",
    "USE_HTTPS_resolved": false,
    "SECURE_SSL_REDIRECT": false,
    "DEBUG": false,
    "is_secure_request": false,
    "scheme": "http"
  }
}
```

---

## Prevention

To avoid this in the future:

1. Always set `USE_HTTPS=False` for HTTP deployments
2. Set `USE_HTTPS=True` ONLY when HTTPS toggle is ON in Dokploy
3. Test in Incognito first to avoid HSTS cache issues
4. Document your infrastructure configuration

---

## Need More Help?

Share the output of:

1. Health check endpoint: `http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/`
2. Dokploy backend logs (last 50 lines)
3. Browser console errors (F12)
4. Result of: `curl -I http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/`
