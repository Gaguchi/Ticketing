# Chat System Documentation

## Overview

Real-time chat system for project collaboration with support for direct messages, group chats, file sharing, emoji reactions, and message search.

## Architecture

### Backend Stack

- **Framework**: Django 5.1.4 + Django REST Framework 3.15.2
- **WebSocket**: Django Channels 4.3.1 + channels-redis 4.3.0
- **Server**: Daphne 4.2.1 (ASGI)
- **Database**: PostgreSQL with optimized indexes
- **File Storage**: Django MEDIA_ROOT for attachments

### Frontend Stack

- **Framework**: React 18.3 + TypeScript
- **UI Library**: Ant Design 5.x
- **WebSocket Client**: Native WebSocket API via webSocketService
- **State Management**: React hooks (useState, useEffect, useRef)

## Database Schema

### Models

#### ChatRoom

```python
- id: AutoField (PK)
- name: CharField(255, blank=True)  # Optional for DMs
- type: CharField(10, choices=['direct', 'group'])
- project: ForeignKey(Project, CASCADE)  # Project-scoped
- created_by: ForeignKey(User, SET_NULL, null=True)
- created_at: DateTimeField(auto_now_add=True)
- updated_at: DateTimeField(auto_now=True)
```

**Computed Methods**:

- `get_display_name(for_user)`: Returns room name or other participant's name for DMs

#### ChatMessage

```python
- id: AutoField (PK)
- room: ForeignKey(ChatRoom, CASCADE, related_name='messages')
- user: ForeignKey(User, CASCADE)
- content: TextField(blank=True)
- type: CharField(10, choices=['text', 'image', 'file'])
- attachment: FileField('chat_attachments/%Y/%m/%d/', null=True, blank=True)
- attachment_name: CharField(255, blank=True)
- attachment_size: IntegerField(null=True, blank=True)
- is_edited: BooleanField(default=False)
- edited_at: DateTimeField(null=True, blank=True)
- created_at: DateTimeField(auto_now_add=True)
- updated_at: DateTimeField(auto_now=True)
```

**Indexes**:

- `(room, created_at)` - For efficient message retrieval
- `(user, created_at)` - For user's message history

#### ChatParticipant

```python
- id: AutoField (PK)
- room: ForeignKey(ChatRoom, CASCADE, related_name='participants')
- user: ForeignKey(User, CASCADE)
- joined_at: DateTimeField(auto_now_add=True)
- last_read_at: DateTimeField(null=True, blank=True)
```

**Constraints**:

- unique_together: `['room', 'user']`

#### MessageReaction

```python
- id: AutoField (PK)
- message: ForeignKey(ChatMessage, CASCADE, related_name='reactions')
- user: ForeignKey(User, CASCADE)
- emoji: CharField(10)  # e.g., '👍', '❤️', '😂'
- created_at: DateTimeField(auto_now_add=True)
```

**Constraints**:

- unique_together: `['message', 'user', 'emoji']`

## REST API Endpoints

### Chat Rooms

#### List Rooms

```http
GET /api/chat/rooms/?project={project_id}
Authorization: Bearer {token}

Response 200:
[
  {
    "id": 1,
    "name": "Project Discussion",
    "type": "group",
    "project": 1,
    "participants": [
      {
        "id": 1,
        "user": {
          "id": 1,
          "username": "john",
          "display_name": "John Doe"
        },
        "joined_at": "2025-11-06T10:00:00Z",
        "last_read_at": "2025-11-06T15:30:00Z"
      }
    ],
    "created_by": { "id": 1, "username": "john", "display_name": "John Doe" },
    "last_message": {
      "id": 42,
      "content": "Hello!",
      "created_at": "2025-11-06T15:30:00Z"
    },
    "unread_count": 3,
    "display_name": "Project Discussion",
    "created_at": "2025-11-01T09:00:00Z",
    "updated_at": "2025-11-06T15:30:00Z"
  }
]
```

#### Create Room

```http
POST /api/chat/rooms/
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Design Team",
  "type": "group",
  "project": 1,
  "participant_ids": [1, 2, 3]
}

Response 201: ChatRoom object
```

#### Add Participant

```http
POST /api/chat/rooms/{room_id}/add_participant/
Authorization: Bearer {token}
Content-Type: application/json

{
  "user_id": 4
}

Response 201: ChatParticipant object
```

#### Remove Participant

```http
POST /api/chat/rooms/{room_id}/remove_participant/
Authorization: Bearer {token}
Content-Type: application/json

{
  "user_id": 4
}

Response 204: No Content
```

#### Mark Room as Read

```http
POST /api/chat/rooms/{room_id}/mark_read/
Authorization: Bearer {token}

Response 200:
{
  "status": "marked as read"
}
```

### Messages

#### List Messages

```http
GET /api/chat/messages/?room={room_id}
Authorization: Bearer {token}

Response 200: Array of ChatMessage objects
```

#### Send Text Message

```http
POST /api/chat/messages/
Authorization: Bearer {token}
Content-Type: application/json

{
  "room": 1,
  "content": "Hello, world!",
  "type": "text"
}

Response 201: ChatMessage object
```

#### Send File Message

```http
POST /api/chat/messages/
Authorization: Bearer {token}
Content-Type: multipart/form-data

room: 1
content: "Check this out"
type: file
attachment: [binary file data]

Response 201: ChatMessage object with attachment_url
```

#### Edit Message

```http
PATCH /api/chat/messages/{message_id}/
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Updated message content"
}

Response 200: ChatMessage object (is_edited=true, edited_at updated)
```

#### Delete Message

```http
DELETE /api/chat/messages/{message_id}/
Authorization: Bearer {token}

Response 204: No Content
```

#### Add Reaction

```http
POST /api/chat/messages/{message_id}/add_reaction/
Authorization: Bearer {token}
Content-Type: application/json

{
  "emoji": "👍"
}

Response 201: MessageReaction object
```

#### Remove Reaction

```http
POST /api/chat/messages/{message_id}/remove_reaction/
Authorization: Bearer {token}
Content-Type: application/json

{
  "emoji": "👍"
}

Response 204: No Content
```

#### Search Messages

```http
GET /api/chat/messages/?search=query&room={room_id}
Authorization: Bearer {token}

Response 200: Array of matching ChatMessage objects
```

## WebSocket API

### Connection

#### URL Pattern

```
ws://{host}/ws/chat/{room_id}/
```

#### Authentication

- JWT token required in connection headers
- User must be a participant in the room
- Connection rejected if not authenticated or not a participant

### Events to Send (Client → Server)

#### Send Message

```json
{
  "type": "message_send",
  "content": "Hello!",
  "message_type": "text"
}
```

#### Edit Message

```json
{
  "type": "message_edit",
  "message_id": 42,
  "content": "Updated content"
}
```

#### Delete Message

```json
{
  "type": "message_delete",
  "message_id": 42
}
```

#### Add Reaction

```json
{
  "type": "reaction_add",
  "message_id": 42,
  "emoji": "👍"
}
```

#### Remove Reaction

```json
{
  "type": "reaction_remove",
  "message_id": 42,
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

### Events to Receive (Server → Client)

#### New Message

```json
{
  "type": "message_new",
  "message": {
    "id": 42,
    "room": 1,
    "user": { "id": 1, "username": "john", "display_name": "John Doe" },
    "content": "Hello!",
    "type": "text",
    "reactions": [],
    "is_edited": false,
    "created_at": "2025-11-06T15:30:00Z"
  }
}
```

#### Message Edited

```json
{
  "type": "message_edited",
  "message": {
    "id": 42,
    "content": "Updated!",
    "is_edited": true,
    "edited_at": "2025-11-06T15:35:00Z"
  }
}
```

#### Message Deleted

```json
{
  "type": "message_deleted",
  "message_id": 42
}
```

#### Reaction Added

```json
{
  "type": "reaction_added",
  "reaction": {
    "id": 10,
    "user": { "id": 2, "username": "jane", "display_name": "Jane Smith" },
    "emoji": "👍",
    "created_at": "2025-11-06T15:30:00Z"
  }
}
```

#### Reaction Removed

```json
{
  "type": "reaction_removed",
  "message_id": 42,
  "user_id": 2,
  "emoji": "👍"
}
```

#### User Typing

```json
{
  "type": "user_typing",
  "user_id": 2,
  "username": "jane",
  "is_typing": true
}
```

#### User Joined

```json
{
  "type": "user_joined",
  "user_id": 3,
  "username": "bob"
}
```

#### User Left

```json
{
  "type": "user_left",
  "user_id": 3,
  "username": "bob"
}
```

## Frontend Implementation

### Key Components

#### Chat.tsx

Main chat interface with:

- Conversations list (left sidebar)
- Active chat view (right panel)
- Message input with file upload
- Real-time message updates via WebSocket
- Typing indicators
- Auto-scroll to new messages

### Services

#### chatService

```typescript
// API methods
getRooms(projectId?: number): Promise<ChatRoom[]>
getRoom(roomId: number): Promise<ChatRoom>
createRoom(data: ChatRoomCreate): Promise<ChatRoom>
deleteRoom(roomId: number): Promise<void>
addParticipant(roomId: number, userId: number): Promise<void>
removeParticipant(roomId: number, userId: number): Promise<void>
markRoomAsRead(roomId: number): Promise<void>
getMessages(roomId: number): Promise<ChatMessage[]>
sendMessage(data: ChatMessageCreate): Promise<ChatMessage>
editMessage(messageId: number, data: ChatMessageUpdate): Promise<ChatMessage>
deleteMessage(messageId: number): Promise<void>
addReaction(messageId: number, emoji: string): Promise<void>
removeReaction(messageId: number, emoji: string): Promise<void>
searchMessages(query: string, roomId?: number): Promise<ChatMessage[]>
```

#### webSocketService

Handles WebSocket connections with:

- Connection management
- Message broadcasting
- Error handling
- Auto-reconnect

### State Management

```typescript
const [rooms, setRooms] = useState<ChatRoom[]>([]);
const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [messageInput, setMessageInput] = useState("");
const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
const [uploadFile, setUploadFile] = useState<File | null>(null);
```

## File Upload

### Backend Configuration

```python
# settings.py
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

### File Validation

- Maximum size: 10MB
- Supported types: images (jpg, png, gif), documents (pdf, doc, docx, txt)
- Validation on both frontend and backend

### Storage Path

```
media/chat_attachments/YYYY/MM/DD/filename
```

## Performance Optimizations

### Database Indexes

- Composite index on `(room_id, created_at)` for efficient message retrieval
- Composite index on `(user_id, created_at)` for user history

### Query Optimization

- Use `select_related()` for user and room foreign keys
- Use `prefetch_related()` for participants and reactions
- Pagination for large message lists (future enhancement)

### WebSocket Optimization

- Channel layers with Redis for message broadcasting
- Connection pooling for database queries
- Debounced typing indicators (3-second timeout)

## Security

### Authentication

- JWT tokens required for all API endpoints
- WebSocket connections validate JWT on connect
- Participant validation before allowing WebSocket connection

### Authorization

- Users can only access rooms they are participants in
- Users can only edit/delete their own messages
- Project-scoped rooms (no cross-project chatting)

### Input Validation

- Message content sanitization
- File type and size validation
- Emoji validation (limit to valid Unicode emoji)

## Future Enhancements

### Planned Features

1. **Ticket Linking**: Rich previews of tickets mentioned in chat
2. **Message Threading**: Reply to specific messages
3. **Read Receipts**: See who has read each message
4. **@Mentions**: Notify users when mentioned
5. **Message Forwarding**: Share messages between rooms
6. **Voice/Video Calls**: Integrate WebRTC for calls
7. **Message Pinning**: Pin important messages to room
8. **Rich Text Formatting**: Markdown support
9. **Code Snippets**: Syntax highlighting for code blocks
10. **Notification Preferences**: Mute rooms, customize alerts

### Technical Improvements

1. **Pagination**: Infinite scroll for message history
2. **Full-Text Search**: PostgreSQL full-text search
3. **Message Caching**: Redis cache for recent messages
4. **Offline Support**: Service workers for PWA
5. **Analytics**: Track message metrics, user engagement
6. **Export**: Export chat history to PDF/CSV

## Troubleshooting

### Common Issues

#### WebSocket Connection Failed

- Check JWT token validity
- Verify user is a participant in the room
- Ensure Redis is running for channel layers
- Check ALLOWED_HOSTS in Django settings

#### Messages Not Appearing

- Verify WebSocket connection is open
- Check browser console for errors
- Ensure user has necessary permissions
- Verify message saved to database

#### File Upload Failed

- Check file size (max 10MB)
- Verify MEDIA_ROOT permissions
- Ensure multipart/form-data content type
- Check server disk space

#### Typing Indicator Not Working

- Verify WebSocket connection
- Check typing timeout (3 seconds)
- Ensure event is being broadcast to room group

## Testing

### Manual Testing Checklist

- [ ] Create direct message conversation
- [ ] Create group chat conversation
- [ ] Send text messages
- [ ] Upload image file
- [ ] Upload document file
- [ ] Edit own message
- [ ] Delete own message
- [ ] Add emoji reaction
- [ ] Remove emoji reaction
- [ ] Test typing indicator
- [ ] Mark room as read (verify unread count)
- [ ] Search messages
- [ ] Test WebSocket reconnection
- [ ] Test with multiple users simultaneously
- [ ] Test file download
- [ ] Test on mobile viewport

### API Testing with cURL

```bash
# Create a room
curl -X POST http://localhost:8000/api/chat/rooms/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Room",
    "type": "group",
    "project": 1,
    "participant_ids": [1, 2]
  }'

# Send a message
curl -X POST http://localhost:8000/api/chat/messages/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room": 1,
    "content": "Test message",
    "type": "text"
  }'

# Upload a file
curl -X POST http://localhost:8000/api/chat/messages/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "room=1" \
  -F "content=File attachment" \
  -F "type=file" \
  -F "attachment=@/path/to/file.pdf"
```

## Deployment Checklist

- [ ] Configure MEDIA_ROOT and MEDIA_URL for production
- [ ] Set up file storage (AWS S3, Azure Blob, etc.)
- [ ] Configure Redis for channel layers
- [ ] Set up Daphne/uvicorn as ASGI server
- [ ] Configure nginx/Apache to serve media files
- [ ] Set ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS
- [ ] Enable HTTPS for WebSocket connections (wss://)
- [ ] Set up database connection pooling
- [ ] Configure log rotation for Django logs
- [ ] Set up monitoring for WebSocket connections
- [ ] Configure rate limiting for API endpoints
- [ ] Set up backup for chat database
- [ ] Test WebSocket through load balancer/proxy
