# WebSocket Implementation Guide

## 🎉 WebSocket System - Successfully Implemented!

A complete real-time communication system using Django Channels + React WebSockets with JWT authentication, automatic reconnection, and multi-channel support.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Architecture](#architecture)
4. [Backend (Django)](#backend-django)
5. [Frontend (React)](#frontend-react)
6. [Usage Examples](#usage-examples)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### Features Implemented

✅ **Backend:**

- Django Channels 4.0 with ASGI support
- JWT authentication for WebSocket connections
- Three consumer types: Notifications, Tickets, Presence
- Redis channel layer (production) / In-Memory (development)
- Project-based access control
- Automatic heartbeat/ping-pong

✅ **Frontend:**

- WebSocket service with automatic reconnection
- Exponential backoff retry strategy
- React Context for global WebSocket state
- Custom hooks for easy integration
- Toast notifications via Ant Design
- Type-safe TypeScript implementation

---

## Installation

### Backend Setup

1. **Install Dependencies:**

```bash
cd backend
pip install -r requirements.txt
```

New packages added:

- `channels==4.0.0` - Django Channels for WebSocket support
- `channels-redis==4.1.0` - Redis backend for production
- `daphne==4.0.0` - ASGI server

2. **Install Redis (for production):**

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Windows
# Download from https://redis.io/download
```

3. **Start Redis:**

```bash
redis-server
```

4. **Run with Daphne (ASGI server):**

```bash
# Development (uses in-memory channel layer)
python manage.py runserver

# Or explicitly with Daphne
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Frontend Setup

No additional dependencies needed! Uses native WebSocket API.

---

## Architecture

### Connection Flow

```
Client (React)
    ↓
WebSocket Connection + JWT Token
    ↓
Django ASGI Application
    ↓
JWTAuthMiddleware (validates token)
    ↓
URLRouter (routes to appropriate consumer)
    ↓
Consumer (NotificationConsumer / TicketConsumer / PresenceConsumer)
    ↓
Channel Layer (Redis/In-Memory)
    ↓
Broadcast to all connected clients in same group
```

### Channel Groups

1. **Notifications**: `user_{user_id}_notifications`

   - One group per user
   - Receives personal notifications

2. **Tickets**: `project_{project_id}_tickets`

   - One group per project
   - Receives ticket updates for that project

3. **Presence**: `project_{project_id}_presence`
   - One group per project
   - Tracks who's online/viewing tickets

---

## Backend (Django)

### Files Created/Modified

#### 1. `backend/config/asgi.py`

ASGI configuration with protocol routing:

```python
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
```

#### 2. `backend/config/settings.py`

Added Channels configuration:

```python
INSTALLED_APPS = [
    'daphne',  # Must be first
    # ... other apps
    'channels',
]

ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}
```

#### 3. `backend/tickets/middleware.py`

JWT authentication for WebSockets:

- Accepts token via query parameter: `?token=<jwt>`
- Validates JWT and attaches user to scope
- Rejects anonymous connections (code 4001)

#### 4. `backend/tickets/consumers.py`

Three consumer classes:

**NotificationConsumer:**

- User-specific notifications
- Handles: ticket assignments, mentions, status changes
- Methods: `mark_read`

**TicketConsumer:**

- Project-specific ticket updates
- Verifies user has project access
- Broadcasts: ticket created/updated/deleted, comments

**PresenceConsumer:**

- Online/offline status
- Ticket viewing indicators
- Typing indicators

#### 5. `backend/tickets/routing.py`

WebSocket URL patterns:

```python
websocket_urlpatterns = [
    re_path(r'ws/notifications/$', NotificationConsumer.as_asgi()),
    re_path(r'ws/projects/(?P<project_id>\d+)/tickets/$', TicketConsumer.as_asgi()),
    re_path(r'ws/projects/(?P<project_id>\d+)/presence/$', PresenceConsumer.as_asgi()),
]
```

---

## Frontend (React)

### Files Created

#### 1. `frontend/src/services/websocket.service.ts`

Core WebSocket service:

- `connect(path, onMessage, onError, onClose)` - Connect to WebSocket
- `send(path, data)` - Send message
- `subscribe(path, handler)` - Subscribe to messages
- `disconnect(path)` - Close connection
- `disconnectAll()` - Close all connections
- Automatic reconnection with exponential backoff
- Connection pooling

#### 2. `frontend/src/contexts/WebSocketContext.tsx`

Global WebSocket provider:

- Auto-connects to notifications on login
- Manages ticket/presence connections per project
- Heartbeat/ping every 30 seconds
- Exposes connection states

#### 3. `frontend/src/hooks/useWebSocket.ts`

React hook for WebSocket connections:

```typescript
const { isConnected, send, lastMessage } = useWebSocket("ws/notifications/", {
  onMessage: (data) => console.log(data),
  autoConnect: true,
});
```

#### 4. `frontend/src/hooks/useNotifications.ts`

React hook for notifications:

```typescript
const { notifications, unreadCount, markAsRead } = useNotifications();
```

- Shows toast notifications automatically
- Manages notification list
- Mark as read functionality

---

## Usage Examples

### Backend: Send Notification to User

```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()

# Send notification to specific user
async_to_sync(channel_layer.group_send)(
    f'user_{user_id}_notifications',
    {
        'type': 'notification_message',
        'data': {
            'id': str(uuid.uuid4()),
            'notification_type': 'ticket_assigned',
            'title': 'Ticket Assigned',
            'message': f'You were assigned to ticket #{ticket_id}',
            'timestamp': timezone.now().isoformat(),
        }
    }
)
```

### Backend: Broadcast Ticket Update

```python
# Broadcast to all users watching this project
async_to_sync(channel_layer.group_send)(
    f'project_{project_id}_tickets',
    {
        'type': 'ticket_update',
        'action': 'updated',  # or 'created', 'deleted'
        'data': {
            'ticket_id': ticket.id,
            'title': ticket.title,
            'status': ticket.status.name,
            'updated_by': request.user.username,
        }
    }
)
```

### Frontend: Connect to Notifications

```tsx
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { useNotifications } from "./hooks/useNotifications";

// Wrap app with provider
function App() {
  return (
    <WebSocketProvider>
      <YourApp />
    </WebSocketProvider>
  );
}

// Use in component
function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  return (
    <Badge count={unreadCount}>
      <BellOutlined />
    </Badge>
  );
}
```

### Frontend: Connect to Project Tickets

```tsx
import { useWebSocketContext } from "./contexts/WebSocketContext";
import { useWebSocket } from "./hooks/useWebSocket";

function TicketList({ projectId }) {
  const { connectTickets } = useWebSocketContext();

  useEffect(() => {
    connectTickets(projectId);
  }, [projectId]);

  const { lastMessage } = useWebSocket(`ws/projects/${projectId}/tickets/`, {
    onMessage: (data) => {
      if (data.type === "ticket_update") {
        // Refresh ticket list or update specific ticket
        console.log("Ticket updated:", data.data);
      }
    },
  });

  return <div>/* Your ticket list */</div>;
}
```

### Frontend: Show Who's Online

```tsx
function OnlineUsers({ projectId }) {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useWebSocket(`ws/projects/${projectId}/presence/`, {
    onMessage: (data) => {
      if (data.type === "user_status") {
        if (data.action === "joined") {
          setOnlineUsers((prev) => [...prev, data.username]);
        } else if (data.action === "left") {
          setOnlineUsers((prev) => prev.filter((u) => u !== data.username));
        }
      }
    },
  });

  return (
    <div>
      <h4>Online: {onlineUsers.length}</h4>
      {onlineUsers.map((user) => (
        <Tag key={user}>{user}</Tag>
      ))}
    </div>
  );
}
```

---

## Testing

### 1. Test WebSocket Connection

**Browser Console:**

```javascript
// Connect
const token = localStorage.getItem("access_token");
const ws = new WebSocket(
  `ws://localhost:8000/ws/notifications/?token=${token}`
);

ws.onopen = () => console.log("Connected");
ws.onmessage = (e) => console.log("Message:", JSON.parse(e.data));
ws.onerror = (e) => console.error("Error:", e);
ws.onclose = (e) => console.log("Closed:", e.code);

// Send ping
ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
```

### 2. Test from Django Shell

```python
python manage.py shell

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()

# Test notification
async_to_sync(channel_layer.group_send)(
    'user_1_notifications',  # Replace with actual user ID
    {
        'type': 'notification_message',
        'data': {
            'id': '123',
            'notification_type': 'general',
            'title': 'Test',
            'message': 'This is a test notification',
            'timestamp': '2025-11-05T12:00:00Z',
        }
    }
)
```

### 3. Check Redis

```bash
# Connect to Redis CLI
redis-cli

# List all keys
KEYS *

# Check specific channel
SUBSCRIBE asgi:group:user_1_notifications
```

---

## Deployment

### Production Checklist

1. **Use Redis for Channel Layer:**

```python
# settings.py
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')],
        },
    },
}
```

2. **Run with Daphne:**

```bash
daphne -u /tmp/daphne.sock config.asgi:application
```

3. **Nginx Configuration:**

```nginx
upstream channels-backend {
    server unix:/tmp/daphne.sock;
}

server {
    location /ws/ {
        proxy_pass http://channels-backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

4. **Use Supervisor/Systemd:**

```ini
[program:daphne]
command=/path/to/venv/bin/daphne -u /tmp/daphne.sock config.asgi:application
directory=/path/to/project
user=www-data
autostart=true
autorestart=true
```

5. **Secure WebSocket (WSS):**

- Use HTTPS for main site
- WebSocket will automatically upgrade to WSS

---

## Troubleshooting

### Connection Refused (4001)

**Cause:** Invalid or missing JWT token

**Solution:**

- Check token in localStorage: `localStorage.getItem('access_token')`
- Verify token is valid (not expired)
- Check CORS settings allow WebSocket upgrade

### Connection Closed Immediately

**Cause:** User doesn't have access to project

**Solution:**

- Check user is member of project
- Verify project_id is correct
- Check consumer access control logic

### Messages Not Received

**Cause:** Not subscribed to correct group

**Solution:**

- Check group name format: `user_{id}_notifications` or `project_{id}_tickets`
- Verify consumer is calling `group_add`
- Check Redis is running (production)

### Reconnection Loop

**Cause:** Token expired

**Solution:**

- Refresh token before WebSocket connection
- Handle 403 errors and redirect to login
- Implement token refresh in WebSocket middleware

### No Notifications Appearing

**Cause:** WebSocketProvider not wrapping app

**Solution:**

```tsx
// App.tsx
<AuthProvider>
  <WebSocketProvider>
    {" "}
    {/* Add this */}
    <YourApp />
  </WebSocketProvider>
</AuthProvider>
```

---

## Next Steps

### Recommended Enhancements

1. **Notification Model:**

   - Create Django model to persist notifications
   - Add notification history page
   - Implement notification preferences

2. **Real-time Ticket Updates:**

   - Auto-update ticket lists when changes occur
   - Show live editing indicators
   - Optimistic UI updates

3. **Typing Indicators:**

   - Show who's typing in comments
   - Debounced typing events

4. **File Upload Progress:**

   - Real-time upload progress
   - Thumbnail generation notifications

5. **Activity Feed:**

   - Real-time project activity stream
   - Filter by event type

6. **Mobile Support:**
   - Push notifications via FCM
   - Background WebSocket handling

---

## Summary

Your ticketing system now has a complete real-time communication infrastructure:

- ✅ **Notifications**: Users get instant notifications for assignments, mentions, etc.
- ✅ **Live Updates**: Tickets update in real-time across all clients
- ✅ **Presence**: See who's online and viewing tickets
- ✅ **Scalable**: Redis-backed channels for horizontal scaling
- ✅ **Secure**: JWT authentication on WebSocket connections
- ✅ **Reliable**: Automatic reconnection with exponential backoff

The system is production-ready and can be extended for more real-time features!

---

## Quick Start Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
redis-server  # In separate terminal
python manage.py runserver

# Frontend (already set up, no changes needed)
cd frontend
npm run dev
```

WebSocket endpoints:

- Notifications: `ws://localhost:8000/ws/notifications/?token=<jwt>`
- Tickets: `ws://localhost:8000/ws/projects/{id}/tickets/?token=<jwt>`
- Presence: `ws://localhost:8000/ws/projects/{id}/presence/?token=<jwt>`
