# Token Management System - Implementation Guide

## Overview

This document describes the comprehensive token management system implemented for handling JWT authentication, automatic token refresh, and multi-tab synchronization.

## Features Implemented

### 1. **Automatic Token Refresh (Proactive)**

- ✅ Tokens are automatically refreshed **10 minutes before expiration**
- ✅ Uses JWT decoder to calculate exact expiration time
- ✅ Scheduled using `setTimeout` in AuthContext
- ✅ Runs silently in the background without user interaction

**Location:** `frontend/src/contexts/AuthContext.tsx`

**How it works:**

```typescript
// Token is decoded to get expiration time
const refreshIn = getRefreshTime(accessToken, 10); // 10 min buffer

// Refresh is scheduled
setTimeout(() => {
  refreshTokenProactively();
}, refreshIn);
```

### 2. **Reactive Token Refresh (On 401 Errors)**

- ✅ When any API request gets a 401 error, token refresh is automatically attempted
- ✅ Original request is retried after successful refresh
- ✅ Multiple simultaneous 401 errors are queued and processed after single refresh
- ✅ If refresh fails, user is logged out and redirected to login

**Location:** `frontend/src/utils/token-interceptor.ts` + `frontend/src/services/api.service.ts`

**How it works:**

```typescript
// On 401 error in api.service.ts
if (response.status === 401) {
  return await tokenInterceptor.handle401Error(
    () => this.request<T>(url, options),
    url
  );
}
```

### 3. **Multi-Tab Synchronization**

- ✅ Token refresh in one tab updates all other open tabs
- ✅ Logout in one tab logs out all other tabs
- ✅ Uses localStorage events for cross-tab communication

**Location:** `frontend/src/utils/tab-sync.ts`

**How it works:**

```typescript
// Listen for storage events from other tabs
window.addEventListener("storage", (event) => {
  if (event.key === "access_token" && event.newValue === null) {
    // Logout in another tab detected
    window.location.href = "/login";
  }
});
```

### 4. **JWT Token Decoding**

- ✅ Decode JWT tokens to extract expiration time
- ✅ Check if token is expired
- ✅ Calculate time until expiration
- ✅ Determine when proactive refresh should occur

**Location:** `frontend/src/utils/jwt-decoder.ts`

**Available functions:**

```typescript
decodeJWT(token: string): JWTPayload | null
getTokenExpiration(token: string): number | null
isTokenExpired(token: string): boolean
getTimeUntilExpiration(token: string): number
shouldRefreshToken(token: string, bufferMinutes = 10): boolean
getRefreshTime(token: string, bufferMinutes = 10): number
```

### 5. **Centralized API Service**

- ✅ All API requests go through centralized service
- ✅ Automatic Authorization header injection
- ✅ Automatic X-Project-ID header injection
- ✅ Support for JSON and FormData requests
- ✅ Comprehensive error handling and logging

**Location:** `frontend/src/services/api.service.ts`

**Methods added:**

```typescript
postFormData<T>(url: string, formData: FormData): Promise<T>
patchFormData<T>(url: string, formData: FormData): Promise<T>
```

## Token Lifecycle

### Login Flow

1. User logs in → Backend returns access + refresh tokens
2. Tokens stored in localStorage
3. AuthContext schedules proactive refresh (10 min before expiry)
4. TabSync initializes for multi-tab communication

### Active Session

1. **Before expiration (proactive):**

   - Timer triggers 10 minutes before token expires
   - `authService.refreshToken()` is called
   - New access token received and stored
   - All tabs receive updated token via storage event
   - New refresh timer is scheduled

2. **On API request with expired token (reactive):**
   - Request returns 401 error
   - Token interceptor catches the error
   - Refresh token is used to get new access token
   - Original request is retried with new token
   - User experiences no interruption

### Token Expiration

- **Access token lifetime:** 1 day (24 hours)
- **Refresh token lifetime:** 7 days
- **Proactive refresh:** 10 minutes before access token expires
- **Absolute timeout:** After 7 days, user must re-login

### Logout Flow

1. User clicks logout → `authService.logout()` called
2. TabSync broadcasts logout event to all tabs
3. All tokens cleared from localStorage
4. All tabs redirect to `/login`
5. Refresh timer is cleared

## File Structure

```
frontend/src/
├── contexts/
│   └── AuthContext.tsx          # Proactive refresh & tab sync initialization
├── services/
│   ├── api.service.ts           # Centralized API with 401 interceptor
│   └── auth.service.ts          # Token storage & refresh endpoint
├── utils/
│   ├── token-interceptor.ts     # 401 error handler with retry
│   ├── jwt-decoder.ts           # JWT decode & expiration utilities
│   └── tab-sync.ts              # Multi-tab synchronization
└── pages/
    └── Companies.tsx            # Updated to use apiService (no manual headers)
```

## Configuration

### Backend (Django)

**File:** `backend/config/settings.py`

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),      # 24 hours
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),     # 7 days
    'ROTATE_REFRESH_TOKENS': True,                   # New refresh token on each refresh
}
```

### Frontend

**Proactive refresh buffer:** 10 minutes (configurable in `AuthContext.tsx`)

```typescript
const refreshIn = getRefreshTime(accessToken, 10); // 10 min buffer
```

## Testing Scenarios

### 1. Test Proactive Refresh

1. Login to application
2. Open browser DevTools → Console
3. Look for log: `⏰ [AuthContext] Scheduling token refresh in X minutes`
4. Wait for scheduled time
5. Should see: `🔄 [AuthContext] Proactively refreshing token...`
6. Should see: `✅ [AuthContext] Token refreshed proactively`

### 2. Test Reactive Refresh (401 Handling)

1. Login to application
2. Manually expire the access token in localStorage (or wait 24 hours)
3. Make any API request (e.g., load tickets)
4. Should see: `🔒 [APIService] 401 error detected, attempting token refresh...`
5. Should see: `🔄 [TokenInterceptor] Attempting to refresh token...`
6. Request should succeed after retry

### 3. Test Multi-Tab Sync

**Token Refresh:**

1. Open app in two tabs (Tab A and Tab B)
2. Wait for proactive refresh in Tab A
3. Tab B should automatically receive the new token

**Logout:**

1. Open app in two tabs (Tab A and Tab B)
2. Click logout in Tab A
3. Tab B should automatically redirect to login

### 4. Test Refresh Token Expiration

1. Login to application
2. Wait 7 days (or manually clear refresh_token)
3. When access token expires, refresh will fail
4. Should redirect to login immediately

## Security Considerations

1. **Token Storage:** Tokens stored in localStorage (XSS vulnerable)

   - Consider httpOnly cookies for production
   - Ensure strict CSP headers

2. **Token Rotation:** Enabled - new refresh token on each refresh

   - Prevents token replay attacks
   - Old refresh tokens are invalidated

3. **Automatic Logout:** On refresh failure, immediate logout

   - Prevents unauthorized access with expired tokens

4. **CORS:** Properly configured with credentials
   - `withCredentials: true` in API config
   - Backend allows `X-Project-ID` header

## Troubleshooting

### Token Refresh Not Working

- Check console for errors during refresh
- Verify refresh token exists in localStorage
- Check backend `/api/tickets/auth/token/refresh/` endpoint
- Ensure SIMPLE_JWT settings are correct

### Multi-Tab Sync Not Working

- Check if localStorage events are firing (DevTools → Application → Storage)
- Verify TabSync is initialized (look for `📡 [TabSync] Multi-tab synchronization initialized`)
- Test in normal windows (not incognito - each incognito window has separate storage)

### 401 Errors Not Retrying

- Check if token interceptor is catching the error
- Look for `🔒 [APIService] 401 error detected` in console
- Verify api.service.ts is using tokenInterceptor.handle401Error()

### Proactive Refresh Not Scheduled

- Check if token has valid expiration time (use jwt.io to decode)
- Verify getRefreshTime() returns positive value
- Look for `⏰ [AuthContext] Scheduling token refresh` in console

## Future Enhancements

### Potential Improvements:

1. **Activity-based refresh:** Only refresh if user is active (mouse/keyboard events)
2. **Session expiry warning:** Show modal 5 minutes before absolute session end
3. **Offline support:** Queue failed requests when offline, retry when online
4. **Token encryption:** Encrypt tokens in localStorage for additional security
5. **Remember me:** Optional persistent login with longer refresh token lifetime
6. **Biometric re-auth:** Use WebAuthn for sensitive operations

## Changelog

### 2025-11-05 - Initial Implementation

- ✅ Created token-interceptor.ts for 401 handling
- ✅ Created jwt-decoder.ts for token expiration detection
- ✅ Created tab-sync.ts for multi-tab communication
- ✅ Updated AuthContext with proactive refresh scheduler
- ✅ Updated api.service.ts with interceptor integration
- ✅ Added patchFormData method to api.service.ts
- ✅ Removed manual Authorization headers from Companies.tsx
- ✅ All token management fully automated

## Summary

The token management system provides a seamless, secure experience for users:

- ✅ **No interruptions:** Tokens refresh automatically before expiry
- ✅ **No data loss:** Failed requests are retried after token refresh
- ✅ **Synchronized:** All tabs stay in sync for refresh and logout
- ✅ **Secure:** Automatic logout on refresh failure, token rotation enabled
- ✅ **Developer-friendly:** Comprehensive logging for debugging

Users will never see "Session expired" errors during active use, as tokens are refreshed proactively in the background. The system handles all edge cases gracefully and provides a production-ready authentication experience.
