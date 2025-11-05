# WebSocket Integration - Quick Start Guide

This guide gets you started with WebSocket real-time features in minutes.

---

## ✅ What's Already Done

The WebSocket infrastructure is **fully implemented** and ready to use:

### Backend ✅

- ✅ Django Channels 4.0 installed
- ✅ Daphne ASGI server configured
- ✅ JWT authentication middleware
- ✅ Three WebSocket consumers (Notifications, Tickets, Presence)
- ✅ Redis channel layer setup
- ✅ Django signals for auto-broadcasting
- ✅ WebSocket URL routing

### Frontend ✅

- ✅ WebSocket service with auto-reconnection
- ✅ Global WebSocketProvider context
- ✅ React hooks (useWebSocket, useNotifications)
- ✅ Connected to MainLayout (auto-connects on project selection)
- ✅ Toast notifications via Ant Design

---

## 🚀 Getting Started

### Option 1: Local Development (Without Docker)

#### Backend

1. **Install Redis** (required for WebSockets in production mode):

```bash
# Windows (via Chocolatey)
choco install redis-64

# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server
```

2. **Start Redis**:

```bash
redis-server
```

3. **Install Python dependencies**:

```bash
cd backend
pip install -r requirements.txt
```

4. **Update .env** (if using production mode):

```bash
DEBUG=False  # To use Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

Or keep `DEBUG=True` to use in-memory channels (no Redis needed).

5. **Run migrations** (if not done):

```bash
python manage.py migrate
```

6. **Start Daphne ASGI server**:

```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

#### Frontend

1. **Start dev server**:

```bash
cd frontend
npm run dev
```

2. **Open browser**: `http://localhost:5173`

3. **Login** and select a project

4. **Check console** for WebSocket connection logs:

```
🔌 [WebSocket] Connecting to ws/notifications/
🔌 [WebSocket] Connected to ws/notifications/
🔌 [MainLayout] Connecting to WebSocket channels for project: 1
```

### Option 2: Docker Compose (Recommended)

1. **Start all services**:

```bash
docker-compose up --build
```

This starts:

- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend with Daphne (port 8000)
- Frontend with Nginx (port 80)

2. **Open browser**: `http://localhost`

3. **Login** and test WebSocket connections

---

## 🧪 Testing WebSocket Features

### Test 1: Real-Time Notifications

1. Open the app in **two browser windows** (different browsers or incognito)
2. Login with different users in each window
3. In Window 1: Assign a ticket to the user logged in to Window 2
4. **Window 2 should instantly show a notification toast** without refresh!

### Test 2: Live Ticket Updates

1. Open the **same project** in two browser tabs
2. In Tab 1: Create a new ticket
3. **Tab 2 should instantly show the new ticket** in the list

### Test 3: WebSocket Connection in DevTools

1. Open browser **DevTools** → **Console**
2. You should see:

```
🔌 [WebSocket] Connecting to ws/notifications/
🔌 [WebSocket] Connected to ws/notifications/
✅ [WebSocket] Received: {type: "connection_established", ...}
```

3. Go to **Network** tab → Filter: **WS**
4. You should see active WebSocket connections:

   - `ws/notifications/`
   - `ws/projects/1/tickets/`
   - `ws/projects/1/presence/`

5. Click on a WebSocket connection → **Messages** tab
6. You'll see heartbeat pings and real-time messages

### Test 4: Manual WebSocket Connection

Open browser console and run:

```javascript
// Get your JWT token
const token = localStorage.getItem("access_token");
console.log("Token:", token);

// Connect to notifications WebSocket
const ws = new WebSocket(
  `ws://localhost:8000/ws/notifications/?token=${token}`
);

ws.onopen = () => console.log("✅ Connected to notifications!");
ws.onmessage = (event) => {
  console.log("📨 Message received:", JSON.parse(event.data));
};
ws.onerror = (error) => console.error("❌ WebSocket error:", error);
ws.onclose = (event) => console.log("🔌 Connection closed:", event.code);

// Send a ping
ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
```

---

## 📡 WebSocket Endpoints

### 1. Notifications (User-Specific)

```
ws://localhost:8000/ws/notifications/?token=<jwt>
```

**Purpose**: Personal notifications for the authenticated user

**Messages**:

- `notification_message` - New notification (ticket assigned, mentioned, etc.)
- `connection_established` - Connected successfully
- `pong` - Response to ping

**Example Message**:

```json
{
  "type": "notification_message",
  "data": {
    "id": "ticket_123_assigned",
    "notification_type": "ticket_assigned",
    "title": "Ticket Assigned",
    "message": "You were assigned to PROJ-456: Fix login bug",
    "ticket_id": 123,
    "ticket_key": "PROJ-456",
    "timestamp": "2025-11-05T12:00:00Z"
  }
}
```

### 2. Tickets (Project-Specific)

```
ws://localhost:8000/ws/projects/{project_id}/tickets/?token=<jwt>
```

**Purpose**: Real-time ticket updates for a specific project

**Messages**:

- `ticket_update` - Ticket created/updated/deleted
- `comment_added` - New comment on a ticket

**Example Message**:

```json
{
  "type": "ticket_update",
  "action": "created",
  "data": {
    "ticket_id": 123,
    "key": "PROJ-456",
    "title": "Fix login bug",
    "status": {
      "id": 1,
      "name": "Open",
      "color": "#1890ff"
    }
  }
}
```

### 3. Presence (Project-Specific)

```
ws://localhost:8000/ws/projects/{project_id}/presence/?token=<jwt>
```

**Purpose**: Track who's online and viewing tickets

**Messages**:

- `user_status` - User joined/left project
- `ticket_viewing` - User is viewing a specific ticket
- `user_typing` - User is typing in a comment

**Example Message**:

```json
{
  "type": "user_status",
  "action": "joined",
  "username": "john_doe",
  "user_id": 5
}
```

---

## 🔧 Backend Integration

### Sending Notifications

Django signals **automatically** send notifications when tickets/comments are created/updated. No additional code needed!

But you can also send custom notifications:

```python
from tickets.signals import send_notification
from django.utils import timezone

send_notification(
    user_id=123,
    notification_data={
        'id': 'custom_notification_1',
        'notification_type': 'general',
        'title': 'System Alert',
        'message': 'Your report is ready!',
        'timestamp': timezone.now().isoformat(),
    }
)
```

### Broadcasting Ticket Updates

Already handled by Django signals! When you save a ticket:

```python
ticket = Ticket.objects.get(id=123)
ticket.status = new_status
ticket.save()  # ← This automatically broadcasts to WebSocket!
```

The signal in `tickets/signals.py` will:

1. Broadcast to all users in the project
2. Send notification to the assignee
3. Update all connected clients in real-time

---

## 🎨 Frontend Integration

### Using the Notifications Hook

```tsx
import { useNotifications } from "@/hooks/useNotifications";

function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  return (
    <Badge count={unreadCount}>
      <BellOutlined />
    </Badge>
  );
}
```

**Features**:

- Auto-connects to `ws/notifications/` on login
- Shows toast messages automatically
- Tracks unread count
- Persists notifications in state

### Using the Generic WebSocket Hook

```tsx
import { useWebSocket } from "@/hooks/useWebSocket";

function TicketList({ projectId }) {
  const { lastMessage, send } = useWebSocket(
    `ws/projects/${projectId}/tickets/`,
    {
      onMessage: (data) => {
        if (data.type === "ticket_update") {
          console.log("Ticket updated:", data.data);
          // Refresh your ticket list or update specific ticket
        }
      },
      autoConnect: true,
    }
  );

  return <div>Your ticket list</div>;
}
```

### Using the WebSocket Context

```tsx
import { useWebSocketContext } from "@/contexts/WebSocketContext";

function ProjectView({ projectId }) {
  const { connectTickets, connectPresence, isTicketConnected } =
    useWebSocketContext();

  useEffect(() => {
    connectTickets(projectId);
    connectPresence(projectId);
  }, [projectId]);

  return <div>Connection: {isTicketConnected ? "🟢 Live" : "🔴 Offline"}</div>;
}
```

---

## 🐛 Troubleshooting

### WebSocket Won't Connect

**Check**:

1. Backend running with Daphne (not Gunicorn)
2. Redis running (if `DEBUG=False`)
3. JWT token valid (check localStorage)

**Test**:

```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Check JWT token in browser console
localStorage.getItem('access_token')
```

### Messages Not Received

**Check**:

1. WebSocket connection is open (check DevTools → Network → WS)
2. User has permission to access the project
3. Django signals are registered (see `tickets/apps.py`)

**Test**:

```python
# In Django shell
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()
async_to_sync(channel_layer.group_send)(
    'user_1_notifications',
    {
        'type': 'notification_message',
        'data': {
            'id': 'test',
            'notification_type': 'general',
            'title': 'Test',
            'message': 'Hello from Django!',
            'timestamp': '2025-11-05T12:00:00Z',
        }
    }
)
```

### 403 Forbidden on WebSocket

**Cause**: Invalid JWT token

**Solution**:

1. Logout and login again
2. Check token expiration settings
3. Verify token in URL: `ws://localhost:8000/ws/notifications/?token=YOUR_TOKEN`

---

## 📚 Next Steps

1. **Test locally** using the steps above
2. **Deploy to Dokploy** following `DOKPLOY_DEPLOYMENT.md`
3. **Customize notifications** by editing `tickets/signals.py`
4. **Add more WebSocket features**:
   - Typing indicators
   - File upload progress
   - Real-time activity feed
   - Collaborative editing

---

## 📖 Documentation

- **Full WebSocket Guide**: `WEBSOCKET_GUIDE.md`
- **Dokploy Deployment**: `DOKPLOY_DEPLOYMENT.md`
- **Environment Variables**: `ENVIRONMENT_VARIABLES.md`

---

## ✅ Checklist

Setup complete when:

- [ ] Redis installed and running (for production)
- [ ] Backend running with Daphne
- [ ] Frontend running
- [ ] Can login successfully
- [ ] See WebSocket connection logs in console
- [ ] Network tab shows WS connections
- [ ] Notifications appear when creating tickets
- [ ] Tickets update in real-time across tabs

---

## 🎉 Success!

You now have a fully functional real-time ticketing system with:

- ✅ Live notifications
- ✅ Real-time ticket updates
- ✅ Presence tracking
- ✅ Auto-reconnection
- ✅ Production-ready architecture

Enjoy the real-time magic! 🚀
