# Dokploy Environment Variables Configuration

## Backend Environment Variables

Set these in your Dokploy backend service:

```bash
# Django Settings
SECRET_KEY=your-super-secret-key-change-this-in-production-min-50-chars
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me

# Database Connection (Internal Dokploy network)
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=ltivsr15rtap3jvz
DB_HOST=tickets-db-ydxqzn
DB_PORT=5432

# HTTPS Configuration
USE_HTTPS=False

# CORS Settings (Add your frontend URL)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
```

## Frontend Environment Variables

Set these in your Dokploy frontend service:

```bash
# API Configuration
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
```

## Important Notes

1. **DEBUG=True**: Enables detailed error messages and logging

   - ⚠️ Only use in development/testing environments
   - Set to `False` in production for security

2. **Database Connection**:

   - Use internal host: `tickets-db-ydxqzn` (not external URL)
   - This connects via Docker internal network

3. **CORS Configuration**:

   - Must include your frontend URL
   - Comma-separated, no spaces

4. **SECRET_KEY**:
   - Generate a secure random key for production
   - Minimum 50 characters recommended

## Testing the Connection

After setting these variables and redeploying:

1. **Check Backend Health**:

   ```
   http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/
   ```

   Should show: `{"status": "healthy", ...}`

2. **Check API Docs**:

   ```
   http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/docs/
   ```

3. **Test Frontend**:

   ```
   http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me/
   ```

4. **Monitor Logs**:
   - Backend logs will now show detailed API request/response info
   - Frontend console (F12) will show API calls in development mode

## Debugging API Issues

With DEBUG=True and the new logging middleware, you'll see:

**Backend Logs:**

- Every incoming API request with headers, body, user info
- Every outgoing response with status, duration, data
- SQL queries (if needed)

**Frontend Console:**

- 🌐 API Request logs with URL, method, headers, body
- ✅ Success responses with status, duration, data
- ❌ Error responses with details

## Security Reminder

⚠️ **Before going to production:**

1. Set `DEBUG=False`
2. Generate new `SECRET_KEY`
3. Review `ALLOWED_HOSTS`
4. Consider setting `USE_HTTPS=True` if using SSL
