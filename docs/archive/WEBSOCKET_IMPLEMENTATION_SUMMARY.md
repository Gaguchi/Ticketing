# 🎉 WebSocket Integration Complete!

The Ticketing System now has **full real-time WebSocket support** with Django Channels and React.

---

## 🚀 What's New

### Real-Time Features

✅ **Instant Notifications**

- Ticket assignments
- Comments added
- Status changes
- @mentions (coming soon)

✅ **Live Ticket Updates**

- See tickets appear/update instantly
- No page refresh needed
- Synchronized across all clients

✅ **Presence Tracking**

- See who's online in each project
- Track who's viewing tickets
- Typing indicators (foundation ready)

✅ **Auto-Reconnection**

- Exponential backoff retry logic
- Survives network interruptions
- Max 5 reconnect attempts

---

## 📁 New Files

### Backend

| File                            | Purpose                                  |
| ------------------------------- | ---------------------------------------- |
| `backend/tickets/middleware.py` | JWT authentication for WebSockets        |
| `backend/tickets/consumers.py`  | WebSocket message handlers (3 consumers) |
| `backend/tickets/routing.py`    | WebSocket URL routing                    |
| `backend/tickets/signals.py`    | Auto-broadcast on ticket/comment changes |
| `backend/config/asgi.py`        | ASGI application with WebSocket support  |

### Frontend

| File                                         | Purpose                         |
| -------------------------------------------- | ------------------------------- |
| `frontend/src/services/websocket.service.ts` | WebSocket connection manager    |
| `frontend/src/contexts/WebSocketContext.tsx` | Global WebSocket state provider |
| `frontend/src/hooks/useWebSocket.ts`         | Generic WebSocket hook          |
| `frontend/src/hooks/useNotifications.ts`     | Notifications hook with toasts  |

### Documentation

| File                       | Purpose                                 |
| -------------------------- | --------------------------------------- |
| `WEBSOCKET_GUIDE.md`       | Complete WebSocket implementation guide |
| `DOKPLOY_DEPLOYMENT.md`    | Step-by-step Dokploy deployment guide   |
| `ENVIRONMENT_VARIABLES.md` | All environment variables reference     |
| `QUICKSTART_WEBSOCKETS.md` | Quick start guide for testing           |
| `docker-compose.yml`       | Local development with Redis            |

### Updated Files

| File                                  | Changes                                         |
| ------------------------------------- | ----------------------------------------------- |
| `frontend/src/App.tsx`                | Added WebSocketProvider wrapper                 |
| `frontend/src/layouts/MainLayout.tsx` | Auto-connect to WebSockets on project selection |
| `backend/config/settings.py`          | Added Channels and Redis configuration          |
| `backend/Dockerfile`                  | Updated to use Daphne ASGI server               |
| `backend/entrypoint.sh`               | Start with Daphne instead of Gunicorn           |
| `frontend/Dockerfile`                 | Added VITE_WS_BASE_URL build arg                |
| `backend/requirements.txt`            | Added channels, channels-redis, daphne          |
| `backend/tickets/apps.py`             | Auto-load signals                               |

---

## 🔧 Setup & Testing

### Quick Start (Local)

1. **Install Redis** (required for production mode):

```bash
# Windows
choco install redis-64

# macOS
brew install redis

# Linux
sudo apt-get install redis-server
```

2. **Start Redis**:

```bash
redis-server
```

3. **Install backend dependencies**:

```bash
cd backend
pip install -r requirements.txt
```

4. **Run backend with Daphne**:

```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

5. **Start frontend**:

```bash
cd frontend
npm run dev
```

6. **Test**:

- Login to the app
- Open DevTools Console
- Look for WebSocket connection logs
- Open Network tab → WS filter → See active connections

### Docker Compose (Recommended)

```bash
docker-compose up --build
```

This starts everything: PostgreSQL, Redis, Backend (Daphne), Frontend (Nginx)

Access: `http://localhost`

---

## 📡 WebSocket Endpoints

### 1. Notifications (User-Specific)

```
ws://localhost:8000/ws/notifications/?token=<jwt>
```

Receives personal notifications for the authenticated user.

### 2. Tickets (Project-Specific)

```
ws://localhost:8000/ws/projects/{project_id}/tickets/?token=<jwt>
```

Receives real-time ticket updates for a specific project.

### 3. Presence (Project-Specific)

```
ws://localhost:8000/ws/projects/{project_id}/presence/?token=<jwt>
```

Tracks who's online and viewing tickets in a project.

---

## 🏗️ Architecture

```
┌─────────────┐
│   React     │  ← WebSocketProvider (global state)
│   Frontend  │  ← useWebSocket hook (subscriptions)
└──────┬──────┘  ← useNotifications hook (toast messages)
       │
       │ WSS (Secure WebSocket)
       │
┌──────▼──────┐
│   Django    │  ← Daphne ASGI Server
│   Backend   │  ← Django Channels
└──────┬──────┘  ← JWT Middleware
       │
       │ Channel Layer
       │
┌──────▼──────┐
│    Redis    │  ← Message Routing
│  (Optional) │  ← In-memory for dev
└─────────────┘
```

**Development**: Uses in-memory channel layer (no Redis needed)

**Production**: Uses Redis for horizontal scaling

---

## 🚢 Deployment (Dokploy)

### Prerequisites

1. PostgreSQL database
2. Redis instance
3. Domain names (optional but recommended)

### Backend Environment Variables

```bash
# Database
DB_HOST=ticketing-db
DB_PASSWORD=<strong-password>

# Django
DEBUG=False
SECRET_KEY=<strong-key>
ALLOWED_HOSTS=api.your-domain.com

# CORS
CORS_ALLOWED_ORIGINS=https://tickets.your-domain.com

# Redis (WebSockets)
REDIS_HOST=ticketing-redis
REDIS_PORT=6379
```

### Frontend Build Arguments

```bash
VITE_API_BASE_URL=https://api.your-domain.com
VITE_WS_BASE_URL=wss://api.your-domain.com
```

**Complete deployment guide**: See `DOKPLOY_DEPLOYMENT.md`

---

## 🧪 Testing WebSocket Features

### Browser Console Test

```javascript
// Get your JWT token
const token = localStorage.getItem("access_token");

// Connect to notifications
const ws = new WebSocket(
  `ws://localhost:8000/ws/notifications/?token=${token}`
);

ws.onopen = () => console.log("✅ Connected!");
ws.onmessage = (e) => console.log("📨 Message:", JSON.parse(e.data));

// Send ping
ws.send(JSON.stringify({ type: "ping" }));
```

### Django Shell Test

```python
from tickets.signals import send_notification
from django.utils import timezone

send_notification(
    user_id=1,  # Replace with actual user ID
    notification_data={
        'id': 'test_notification',
        'notification_type': 'general',
        'title': 'Test Notification',
        'message': 'WebSocket is working!',
        'timestamp': timezone.now().isoformat(),
    }
)
```

If connected, you should see a toast notification appear in the browser!

---

## 📚 Documentation

| Document                   | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `WEBSOCKET_GUIDE.md`       | Complete implementation guide, architecture, usage examples |
| `DOKPLOY_DEPLOYMENT.md`    | Full Dokploy deployment with WebSocket configuration        |
| `ENVIRONMENT_VARIABLES.md` | All environment variables with examples                     |
| `QUICKSTART_WEBSOCKETS.md` | Quick start guide to test WebSocket features                |

---

## 🔐 Security

✅ **JWT Authentication**

- All WebSocket connections require valid JWT token
- Token passed in URL query parameter
- Validated by middleware before connection

✅ **Access Control**

- Project-specific channels verify user access
- Notifications only sent to authorized users
- Connection rejected if unauthorized (code 4003)

✅ **Secure in Production**

- WSS (WebSocket Secure) over HTTPS
- CORS restrictions
- Redis for secure message routing

---

## 🎯 What Works Now

✅ User logs in → Auto-connects to notifications WebSocket
✅ User selects project → Auto-connects to tickets & presence WebSockets
✅ Ticket created → Broadcasts to all users in project
✅ Comment added → Notifies ticket assignee/reporter
✅ Ticket assigned → Sends notification to assignee
✅ Network disconnect → Auto-reconnects with exponential backoff
✅ Multiple tabs → All tabs receive updates simultaneously
✅ Toast notifications → Appear automatically for new notifications

---

## 🛠️ Development

### Adding Custom Notifications

Edit `backend/tickets/signals.py`:

```python
send_notification(
    user_id=user.id,
    notification_data={
        'id': f'custom_{uuid.uuid4()}',
        'notification_type': 'custom_event',
        'title': 'Custom Event',
        'message': 'Something happened!',
        'timestamp': timezone.now().isoformat(),
    }
)
```

### Broadcasting Custom Messages

```python
from tickets.signals import send_to_channel_layer

send_to_channel_layer(
    f'project_{project_id}_tickets',
    'ticket_update',
    {
        'action': 'custom_action',
        'data': {'custom': 'data'}
    }
)
```

### Adding New WebSocket Consumers

1. Create consumer in `backend/tickets/consumers.py`
2. Add route in `backend/tickets/routing.py`
3. Create React hook in `frontend/src/hooks/`
4. Use in components

---

## 🐛 Troubleshooting

### WebSocket Won't Connect

- Check Redis is running (`redis-cli ping`)
- Check JWT token is valid
- Check backend is using Daphne (not Gunicorn)
- Check CORS settings

### Messages Not Received

- Verify WebSocket connection is open (DevTools → Network → WS)
- Check Django signals are loaded (`tickets/apps.py`)
- Test with Django shell (see Testing section above)

### 403 Forbidden

- Token expired → Logout and login again
- Token invalid → Check localStorage
- Middleware error → Check backend logs

**Full troubleshooting**: See `WEBSOCKET_GUIDE.md` and `DOKPLOY_DEPLOYMENT.md`

---

## 📦 Dependencies Added

### Backend

```
channels==4.0.0
channels-redis==4.1.0
daphne==4.0.0
```

### Frontend

No additional dependencies (uses native WebSocket API)

---

## 🎉 Summary

Your Ticketing System now has **production-ready real-time capabilities**:

- ✅ WebSocket infrastructure (Django Channels + Redis)
- ✅ Three WebSocket consumers (Notifications, Tickets, Presence)
- ✅ Auto-reconnection with exponential backoff
- ✅ JWT authentication on WebSocket connections
- ✅ React integration with Context and Hooks
- ✅ Toast notifications via Ant Design
- ✅ Docker Compose for local testing
- ✅ Dokploy deployment guide
- ✅ Comprehensive documentation

**Next Steps**:

1. Test locally following `QUICKSTART_WEBSOCKETS.md`
2. Deploy to Dokploy following `DOKPLOY_DEPLOYMENT.md`
3. Customize notifications in `backend/tickets/signals.py`
4. Add more real-time features (typing indicators, activity feeds, etc.)

Enjoy your real-time ticketing system! 🚀
