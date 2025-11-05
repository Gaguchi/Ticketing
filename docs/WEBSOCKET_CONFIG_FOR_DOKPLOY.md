# WebSocket Configuration for Your Dokploy Deployment

Based on your current environment variables, here's what you need to configure WebSockets.

---

## ✅ Current Environment Variables

### Frontend (Already Set)

```bash
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
VITE_APP_NAME=Ticketing System
VITE_APP_VERSION=1.0.0
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAB-Zzi_4DhSnwjXp
VITE_TURNSTILE_ENABLED=false
```

### Backend (Already Set)

```bash
SECRET_KEY=@0gpb1x43@o4d#&5x3smjwp3hf0cyu0#k&dxejj!+oy#*k!w%7
DEBUG=True
DB_HOST=tickets-db-ydxqzn
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=ltivsr15rtap3jvz
CORS_ALLOWED_ORIGINS=http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me
ALLOWED_HOSTS=tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me,localhost
USE_HTTPS=False
```

---

## 🔧 Required Changes

### Option 1: Quick Test (Development Mode - Current Setup)

**No changes needed!** Your current `DEBUG=True` means Django Channels will use **in-memory** channel layer.

✅ **Works for testing** WebSocket connections
⚠️ **Limitation**: Only works with single backend instance (no scaling)

**Add to Frontend** (optional but recommended):

```bash
VITE_WS_BASE_URL=ws://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
```

This is auto-derived from `VITE_API_BASE_URL`, so it's optional.

### Option 2: Production Setup (Recommended)

For production-ready WebSockets with horizontal scaling:

#### Step 1: Create Redis in Dokploy

1. Go to Dokploy Dashboard
2. Click **Databases** → **Create Database**
3. Select **Redis**
4. **Name**: `tickets-redis`
5. Click **Create**
6. Note the internal hostname (usually `tickets-redis`)

#### Step 2: Update Backend Environment Variables

Add these to your backend in Dokploy:

```bash
# Add these new variables
REDIS_HOST=tickets-redis
REDIS_PORT=6379

# Change this for production
DEBUG=False
```

#### Step 3: Update Frontend (Optional)

Add explicit WebSocket URL:

```bash
VITE_WS_BASE_URL=ws://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
```

---

## 🧪 Testing WebSocket Connection

### Method 1: Browser Console Test

1. Open your frontend: `http://tickets-frontend-wzaz6z-11ca3e-31-97-181-167.traefik.me`
2. Login to the app
3. Open DevTools → Console
4. Copy and paste the contents of `test-websocket.js`
5. You should see:
   ```
   ✅ JWT token found: eyJ0eXBlIjoiSldUIi...
   📡 Connecting to: ws://tickets-backend...
   ✅ WebSocket Connected!
   📨 Message received: {type: "connection_established"}
   ✅ Pong received - connection is alive!
   ```

### Method 2: Check Network Tab

1. Open DevTools → Network → WS (WebSocket filter)
2. Login to the app
3. Select a project
4. You should see active WebSocket connections:
   - `ws/notifications/`
   - `ws/projects/1/tickets/`
   - `ws/projects/1/presence/`

### Method 3: Check Console Logs

After logging in, you should see in the browser console:

```
🔌 [WebSocket] Connecting to ws/notifications/
🔌 [WebSocket] Connected to ws/notifications/
✅ [WebSocket] Received: {type: "connection_established", ...}
🔌 [MainLayout] Connecting to WebSocket channels for project: 1
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "WebSocket connection failed"

**Possible Causes:**

- Backend not running with Daphne (using Gunicorn instead)
- CORS not allowing WebSocket upgrade
- JWT token expired

**Solution:**

1. Check backend is using Daphne:

   ```bash
   # In Dockerfile or entrypoint.sh, should see:
   daphne -b 0.0.0.0 -p 8000 config.asgi:application
   ```

2. Check backend logs in Dokploy for WebSocket connection attempts

### Issue 2: "403 Forbidden" on WebSocket

**Cause:** JWT token invalid or expired

**Solution:**

1. Logout and login again
2. Check token in localStorage: `localStorage.getItem('access_token')`
3. Verify token is being sent in WebSocket URL

### Issue 3: "Connection closes immediately"

**Possible Causes:**

- User doesn't have access to project
- Backend middleware rejecting connection

**Solution:**

1. Check backend logs for rejection reason
2. Verify user has access to the project
3. Check JWT middleware is working

### Issue 4: Messages not routing between instances

**Cause:** Using in-memory channel layer with multiple backend instances

**Solution:**

- Set `DEBUG=False`
- Add Redis configuration (see Option 2 above)

---

## 📊 Current Setup Status

| Component             | Status            | Notes                            |
| --------------------- | ----------------- | -------------------------------- |
| Backend Code          | ✅ Ready          | Django Channels configured       |
| Frontend Code         | ✅ Ready          | WebSocket service implemented    |
| Redis                 | ⚠️ Not configured | Optional for `DEBUG=True`        |
| Environment Variables | ⚠️ Missing Redis  | Need `REDIS_HOST` for production |

---

## 🎯 Recommended Actions

### Immediate (Test WebSockets Now)

Since you have `DEBUG=True`, WebSockets should work **right now** with in-memory channels:

1. ✅ **No changes needed to test**
2. Login to your frontend
3. Open browser DevTools
4. Run the test script from `test-websocket.js`
5. Verify connection in Network → WS tab

### Short-term (Production Readiness)

1. **Create Redis database** in Dokploy
2. **Add environment variables**:
   ```bash
   REDIS_HOST=tickets-redis
   REDIS_PORT=6379
   DEBUG=False  # Change to production mode
   ```
3. **Redeploy backend**
4. **Test WebSocket connections** again

---

## 🔍 Verification Checklist

- [ ] Backend running with Daphne (check logs: "Listening on TCP address")
- [ ] Can login to frontend successfully
- [ ] Browser console shows WebSocket connection logs
- [ ] Network tab shows active WS connections
- [ ] Test script connects successfully
- [ ] Notifications appear when creating tickets

---

## 📝 Next Steps After Testing

Once WebSockets are working:

1. Test real-time features:
   - Create ticket → Should appear in other tabs instantly
   - Assign ticket → Assignee should get notification
2. Monitor performance:
   - Check WebSocket connection stability
   - Monitor Redis memory usage (when added)
3. Production deployment:
   - Set `DEBUG=False`
   - Add Redis
   - Test with multiple backend instances

---

## 💡 Quick Win

**To test WebSockets immediately without any changes:**

1. Your current `DEBUG=True` is perfect for testing
2. WebSocket URL will auto-derive from `VITE_API_BASE_URL`
3. In-memory channels will handle message routing
4. Just login and check browser console for connection logs!

**Expected in console:**

```
🔌 [WebSocket] Connecting to ws/notifications/
🔌 [WebSocket] Connected to ws/notifications/
```

If you see this, WebSockets are working! 🎉

---

## 🆘 Need Help?

If WebSockets aren't connecting:

1. Share backend logs from Dokploy
2. Share browser console errors
3. Run the test script and share output
4. Check Network tab for WebSocket connection attempts

**Most Common Fix**: Ensure backend is using Daphne, not Gunicorn!
