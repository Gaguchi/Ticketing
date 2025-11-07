# Production API URL Fix

## Issue Description

**Problem**: Chat API requests were failing in production with "405 Method Not Allowed" error because requests were being sent to the frontend domain instead of the backend domain.

**Error**:

```
POST http://tickets-frontend-wzaz6z.../api/chat/rooms/ 405 (Method Not Allowed)
Failed to load chat rooms: Unexpected token '<', "<!doctype"... is not valid JSON
```

**Root Cause**:
The `api.service.ts` was using relative URLs (e.g., `/api/chat/rooms/`) which work in development due to Vite's proxy configuration, but in production there's no proxy server, so these relative URLs were resolving to the frontend's static file server instead of the Django backend.

## Solution

Modified `frontend/src/services/api.service.ts` to intelligently handle URL construction:

1. **Development Mode**: Continue using relative URLs (Vite dev server proxies them)
2. **Production Mode**: Prepend `API_BASE_URL` from environment variables

### Code Changes

Added `buildUrl()` method to `APIService` class:

```typescript
/**
 * Build full URL from relative path
 * In development: use relative URLs (Vite proxy handles routing)
 * In production: prepend API_BASE_URL
 */
private buildUrl(path: string): string {
  // If already an absolute URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // In development, use relative URLs (Vite dev server proxy)
  if (this.isDevelopment) {
    return path;
  }

  // In production, prepend API_BASE_URL
  return `${API_BASE_URL}${path}`;
}
```

Updated `request()` method to use `buildUrl()`:

```typescript
private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
  // Build full URL (adds base URL in production)
  const fullUrl = this.buildUrl(url);

  // ... rest of the method uses fullUrl instead of url
}
```

## Environment Configuration

The fix relies on the `.env.production` file which defines:

```bash
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
```

This ensures all API requests in production are sent to the correct backend domain.

## Deployment Steps

1. ✅ **Code Fix Applied**: Updated `api.service.ts` with `buildUrl()` method
2. ✅ **Build Completed**: `npm run build` successful
3. 🔄 **Next Step**: Deploy the new `dist/` folder to Dokploy frontend service
4. 🔄 **Verify**: After deployment, test chat functionality in production

## Testing After Deployment

Once deployed, verify the fix by:

```powershell
# 1. Login and get token
$loginResponse = Invoke-RestMethod -Uri "http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/tickets/auth/login/" -Method POST -Body '{"username":"Gaga","password":"your_password"}' -ContentType "application/json"

# 2. Test chat rooms endpoint
Invoke-RestMethod -Uri "http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/chat/rooms/" -Headers @{"Authorization"="Bearer $($loginResponse.access)"}
```

Expected result: JSON response with chat rooms array

## Why It Worked Locally But Not in Production

| Environment                 | URL Resolution                                                | How It Works                                       |
| --------------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| **Development**             | `/api/chat/rooms/` → `http://localhost:8000/api/chat/rooms/`  | Vite dev server proxy forwards `/api` to Django    |
| **Production (Before Fix)** | `/api/chat/rooms/` → `http://frontend-domain/api/chat/rooms/` | No proxy, relative URL stays on frontend domain ❌ |
| **Production (After Fix)**  | `/api/chat/rooms/` → `http://backend-domain/api/chat/rooms/`  | `buildUrl()` prepends backend URL ✅               |

## Related Files

- `frontend/src/services/api.service.ts` - Core API service (FIXED)
- `frontend/src/config/api.ts` - API configuration with base URL
- `frontend/.env.production` - Production environment variables
- `frontend/vite.config.ts` - Vite proxy config (development only)

## Notes

- This same pattern applies to **all API requests** in the application, not just chat
- The fix is backward-compatible and doesn't affect local development
- WebSocket URLs use a similar pattern in `websocket.service.ts` (already working correctly)

---

**Date**: November 7, 2025  
**Status**: ✅ Code Fixed, 🔄 Awaiting Production Deployment
