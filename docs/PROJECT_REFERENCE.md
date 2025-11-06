# Project Reference - Ticketing System

## Overview

This document provides implementation patterns and reference information for the Ticketing System with integrated real-time chat functionality.

## Table of Contents

- [Architecture](#architecture)
- [Chat System](#chat-system)
- [API Patterns](#api-patterns)
- [WebSocket Integration](#websocket-integration)
- [Frontend Patterns](#frontend-patterns)
- [Database Schema](#database-schema)

## Architecture

### Technology Stack

**Backend:**

- Django 5.1.4
- Django REST Framework 3.15.2
- Django Channels 4.3.1 (WebSocket support)
- channels-redis 4.3.0
- Daphne 4.2.1 (ASGI server)
- PostgreSQL

**Frontend:**

- React 18.3
- TypeScript
- Ant Design 5.x
- emoji-picker-react

**Real-time Communication:**

- WebSocket (via Django Channels)
- Redis (for channel layers)

## Chat System

### Features Implemented

✅ Direct messaging (DM) and group chats  
✅ Project-scoped conversations  
✅ Real-time messaging via WebSocket  
✅ File uploads (images and documents)  
✅ Emoji reactions  
✅ Message editing  
✅ Message search  
✅ Typing indicators  
✅ Unread message tracking  
✅ Participant management

### Models

#### ChatRoom

```python
- id: AutoField
- name: CharField (optional for group chats)
- type: CharField (choices: 'direct', 'group')
- project: ForeignKey(Project)
- created_by: ForeignKey(User)
- created_at: DateTimeField
- updated_at: DateTimeField
```

#### ChatMessage

```python
- id: AutoField
- room: ForeignKey(ChatRoom)
- user: ForeignKey(User)
- content: TextField
- type: CharField (choices: 'text', 'image', 'file')
- attachment: FileField (optional)
- attachment_name: CharField
- attachment_size: IntegerField
- created_at: DateTimeField (indexed)
- updated_at: DateTimeField
- is_edited: BooleanField
- edited_at: DateTimeField (nullable)

# Indexes:
- (room, created_at)
- (user, created_at)
```

#### ChatParticipant

```python
- id: AutoField
- room: ForeignKey(ChatRoom)
- user: ForeignKey(User)
- joined_at: DateTimeField
- last_read_at: DateTimeField (nullable)

# Unique constraint: (room, user)
```

#### MessageReaction

```python
- id: AutoField
- message: ForeignKey(ChatMessage)
- user: ForeignKey(User)
- emoji: CharField
- created_at: DateTimeField

# Unique constraint: (message, user, emoji)
```

## API Patterns

### Chat REST API Endpoints

**Base URL:** `/api/chat/`

#### Chat Rooms

**List Rooms**

```http
GET /api/chat/rooms/
GET /api/chat/rooms/?project={project_id}

Response:
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "name": "Team Chat",
      "display_name": "Team Chat",
      "type": "group",
      "project": 1,
      "created_by": {...},
      "participants": [...],
      "last_message": {...},
      "unread_count": 3,
      "created_at": "2025-11-06T10:00:00Z"
    }
  ]
}
```

**Create Room**

```http
POST /api/chat/rooms/
Content-Type: application/json

{
  "name": "New Chat",
  "type": "group",
  "project": 1,
  "participant_ids": [1, 2, 3]
}
```

**Get Room Details**

```http
GET /api/chat/rooms/{id}/
```

**Delete Room**

```http
DELETE /api/chat/rooms/{id}/
```

**Add Participant**

```http
POST /api/chat/rooms/{id}/add_participant/

{
  "user_id": 5
}
```

**Remove Participant**

```http
POST /api/chat/rooms/{id}/remove_participant/

{
  "user_id": 5
}
```

**Mark as Read**

```http
POST /api/chat/rooms/{id}/mark_read/
```

#### Chat Messages

**List Messages**

```http
GET /api/chat/messages/?room={room_id}
GET /api/chat/messages/?search=query
GET /api/chat/messages/?search=query&room={room_id}
```

**Send Message**

```http
POST /api/chat/messages/
Content-Type: application/json

{
  "room": 1,
  "content": "Hello!",
  "type": "text"
}
```

**Send Message with File**

```http
POST /api/chat/messages/
Content-Type: multipart/form-data

room: 1
content: "Check this out"
type: "image"
attachment: [file]
```

**Edit Message**

```http
PATCH /api/chat/messages/{id}/

{
  "content": "Updated message"
}
```

**Delete Message**

```http
DELETE /api/chat/messages/{id}/
```

**Add Reaction**

```http
POST /api/chat/messages/{id}/add_reaction/

{
  "emoji": "👍"
}
```

**Remove Reaction**

```http
POST /api/chat/messages/{id}/remove_reaction/

{
  "emoji": "👍"
}
```

## WebSocket Integration

### Connection URL Pattern

```
ws://localhost:8000/ws/chat/{room_id}/
```

### Authentication

Include JWT token in URL or initial message:

```javascript
const ws = new WebSocket(
  `ws://localhost:8000/ws/chat/${roomId}/?token=${jwtToken}`
);
```

### Events to Send

#### Send Message

```json
{
  "type": "message_send",
  "content": "Hello, World!",
  "message_type": "text"
}
```

#### Edit Message

```json
{
  "type": "message_edit",
  "message_id": 123,
  "content": "Updated content"
}
```

#### Delete Message

```json
{
  "type": "message_delete",
  "message_id": 123
}
```

#### Add Reaction

```json
{
  "type": "reaction_add",
  "message_id": 123,
  "emoji": "👍"
}
```

#### Remove Reaction

```json
{
  "type": "reaction_remove",
  "message_id": 123,
  "emoji": "👍"
}
```

#### Typing Indicator

```json
{
  "type": "typing",
  "is_typing": true
}
```

### Events to Receive

#### New Message

```json
{
  "type": "message_new",
  "message": {
    "id": 123,
    "user": {...},
    "content": "Hello!",
    "type": "text",
    "created_at": "2025-11-06T10:00:00Z",
    "reactions": []
  }
}
```

#### Message Edited

```json
{
  "type": "message_edited",
  "message": {...}
}
```

#### Message Deleted

```json
{
  "type": "message_deleted",
  "message_id": 123
}
```

#### Reaction Added

```json
{
  "type": "reaction_added",
  "message_id": 123,
  "reaction": {
    "user": {...},
    "emoji": "👍",
    "created_at": "2025-11-06T10:00:00Z"
  }
}
```

#### Reaction Removed

```json
{
  "type": "reaction_removed",
  "message_id": 123,
  "user_id": 5,
  "emoji": "👍"
}
```

#### User Typing

```json
{
  "type": "user_typing",
  "user_id": 5,
  "is_typing": true
}
```

#### User Joined/Left

```json
{
  "type": "user_joined",
  "user": {...}
}
```

## Frontend Patterns

### Chat Service Usage

```typescript
import { chatService } from "../services/chat.service";

// Get rooms
const rooms = await chatService.getRooms(projectId);

// Send message
await chatService.sendMessage({
  room: roomId,
  content: "Hello!",
  type: "text",
});

// Send message with file
await chatService.sendMessage({
  room: roomId,
  content: "Check this out",
  type: "image",
  attachment: fileObject,
});

// Add reaction
await chatService.addReaction(messageId, "👍");

// Search messages
const results = await chatService.searchMessages("query", roomId);
```

### WebSocket Service Usage

```typescript
import { webSocketService } from "../services/websocket.service";

// Connect
const wsUrl = `ws/chat/${roomId}/`;
webSocketService.connect(
  wsUrl,
  (event) => console.log("Received:", event),
  (error) => console.error("Error:", error),
  () => console.log("Disconnected")
);

// Send message
const ws = webSocketService.getConnection(wsUrl);
ws.send(
  JSON.stringify({
    type: "message_send",
    content: "Hello!",
    message_type: "text",
  })
);

// Disconnect
webSocketService.disconnect(wsUrl);
```

### Component Patterns

#### Chat Component Structure

```tsx
const Chat: React.FC = () => {
  // State management
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [emojiPickerVisible, setEmojiPickerVisible] = useState<number | null>(
    null
  );

  // Load rooms on mount
  useEffect(() => {
    const loadRooms = async () => {
      const data = await chatService.getRooms(selectedProject.id);
      setRooms(data);
    };
    loadRooms();
  }, [selectedProject]);

  // WebSocket connection
  useEffect(() => {
    if (!activeRoom) return;

    const wsUrl = `ws/chat/${activeRoom.id}/`;
    webSocketService.connect(wsUrl, handleWebSocketEvent);

    return () => webSocketService.disconnect(wsUrl);
  }, [activeRoom]);

  // Handle WebSocket events
  const handleWebSocketEvent = (event: ChatWebSocketEvent) => {
    switch (event.type) {
      case "message_new":
        setMessages((prev) => [...prev, event.message]);
        break;
      case "reaction_added":
        // Update message reactions
        break;
      // ... handle other events
    }
  };
};
```

#### Emoji Reactions Pattern

```tsx
{
  /* Display reactions grouped by emoji */
}
{
  Object.entries(
    msg.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction);
      return acc;
    }, {} as Record<string, typeof msg.reactions>)
  ).map(([emoji, reactions]) => {
    const hasUserReacted = reactions.some((r) => r.user.id === user?.id);
    return (
      <Badge key={emoji} count={reactions.length}>
        <div onClick={() => toggleReaction(msg.id, emoji)}>{emoji}</div>
      </Badge>
    );
  });
}

{
  /* Emoji picker */
}
<Popover
  content={
    <EmojiPicker onEmojiClick={(emojiData) => addReaction(msg.id, emojiData)} />
  }
>
  <SmileOutlined />
</Popover>;
```

#### Search Pattern

```tsx
// Search handler
const handleSearch = async (query: string) => {
  setSearchQuery(query);
  if (!query.trim()) {
    setSearchResults([]);
    return;
  }
  const results = await chatService.searchMessages(query, activeRoom?.id);
  setSearchResults(results);
};

// Display search results
{
  isSearching && searchQuery ? (
    <div>
      <Text>Search Results: {searchResults.length} found</Text>
      {searchResults.map((msg) => (
        <MessageItem message={msg} />
      ))}
    </div>
  ) : (
    <div>
      {messages.map((msg) => (
        <MessageItem message={msg} />
      ))}
    </div>
  );
}
```

## Database Schema

### Migrations Applied

- `chat.0001_initial` - Creates all chat tables with indexes and constraints

### Indexes for Performance

1. `ChatMessage`: (room, created_at) - Fast message retrieval
2. `ChatMessage`: (user, created_at) - User message history
3. Foreign key indexes on all relationships

### Unique Constraints

1. `ChatParticipant`: (room, user) - No duplicate participants
2. `MessageReaction`: (message, user, emoji) - No duplicate reactions

## Configuration

### Backend Settings

**settings.py**

```python
INSTALLED_APPS = [
    # ...
    'daphne',
    'channels',
    'chat',
]

ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
        },
    },
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

**asgi.py**

```python
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from chat.routing import websocket_urlpatterns as chat_ws_patterns

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(chat_ws_patterns)
    ),
})
```

### Frontend Configuration

**TypeScript Types**

```typescript
// types/chat.ts
interface ChatRoom {
  id: number;
  name?: string;
  display_name: string;
  type: "direct" | "group";
  project: number;
  created_by: ChatUser;
  participants: ChatParticipant[];
  last_message: ChatMessage | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: number;
  room: number;
  user: ChatUser;
  content: string;
  type: "text" | "image" | "file";
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  reactions: MessageReaction[];
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  edited_at: string | null;
}
```

## Future Enhancements

Planned features for future implementation:

1. **Ticket Linking in Chat** - Allow users to add links to tickets in chat messages with graceful handling and preview
2. **Message Threading** - Reply to specific messages with threaded conversations
3. **@Mentions** - Mention users with @ symbol and notifications
4. **Rich Text Formatting** - Markdown support for message formatting
5. **Voice Messages** - Record and send audio messages
6. **Video Calls** - Integrate video calling functionality
7. **Message Pinning** - Pin important messages to top of chat
8. **Chat Templates** - Predefined message templates for common responses
9. **Read Receipts** - Show when messages have been read by participants
10. **Message Encryption** - End-to-end encryption for sensitive conversations

## Testing

See `TEST_CHAT_API.md` for comprehensive testing guide with curl examples.

## Documentation

Additional documentation:

- `CHAT_SYSTEM.md` - Detailed chat system architecture and WebSocket API
- `TEST_CHAT_API.md` - API testing guide with PowerShell commands
