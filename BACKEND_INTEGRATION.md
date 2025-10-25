# Backend Integration - Ticket Creation

## What We Implemented

### 1. API Service Layer (`frontend/src/services/`)

Created a modular service architecture for backend communication:

- **`api.service.ts`**: Base API service with error handling
  - Generic request wrapper
  - Proper HTTP methods (GET, POST, PUT, PATCH, DELETE)
  - Error handling with custom APIError type
  - Credential management

- **`ticket.service.ts`**: Ticket-specific operations
  - `getTickets()`: Fetch all tickets
  - `getTicket(id)`: Fetch single ticket
  - `createTicket(data)`: Create new ticket ✨
  - `updateTicket(id, data)`: Update existing ticket
  - `deleteTicket(id)`: Delete ticket
  - `moveTicket(id, columnId)`: Move to column
  - `toggleFollow(id)`: Follow/unfollow

- **`column.service.ts`**: Column operations
  - CRUD operations for columns
  - Reorder columns functionality

- **`customer.service.ts`**: Customer operations
  - CRUD operations for customers

### 2. Updated Type Definitions (`frontend/src/types/ticket.ts`)

Enhanced `Ticket` interface to match backend schema:
- Added `description`, `due_date`, `start_date`
- Proper relationship fields (`column`, `customer`, `assignees`)
- Backward compatibility aliases (e.g., `colId`/`column`)
- Metadata fields (`created_at`, `updated_at`, `comments_count`)

### 3. Enhanced TicketModal (`frontend/src/components/TicketModal.tsx`)

Converted to full-featured form with backend integration:

**Features:**
- **Dual mode**: Create new tickets or edit existing ones
- **Controlled inputs**: All form fields are state-managed
- **Form fields**:
  - Title (required)
  - Description
  - Type (task/bug/story/epic)
  - Status
  - Priority (1-4)
  - Due date
  - Start date
  - Customer
- **Save functionality**: Calls backend API on save
- **Success callbacks**: Notifies parent component
- **Error handling**: User-friendly error messages
- **Loading states**: Shows saving indicator

### 4. Dashboard Integration (`frontend/src/pages/Dashboard.tsx`)

Full backend integration for ticket management:

**New Features:**
- ✨ **Create Ticket** button with create modal
- 🔄 **Refresh** button to reload tickets from API
- 📊 **Loading states** in table
- 🔍 **Search** across backend data
- **Auto-fetch** tickets on component mount

**State Management:**
- `tickets`: Stores API data
- `loading`: Loading indicator
- `isCreateModalOpen`: Controls create modal
- `selectedTicket`: Currently editing ticket

**Callbacks:**
- `handleTicketCreated()`: Adds new ticket to list
- `handleTicketUpdated()`: Updates ticket in list
- `fetchTickets()`: Reloads from API

## How It Works

### Creating a Ticket

1. User clicks "Create Ticket" button
2. Modal opens in create mode
3. User fills in form fields
4. Click "Create" button
5. Frontend sends POST to `/api/tickets/tickets/`
6. Backend creates ticket and returns data
7. Frontend adds ticket to list
8. Success message shown
9. Modal closes

### Editing a Ticket

1. User clicks on ticket in table
2. Modal opens in edit mode with ticket data
3. User modifies fields
4. Click "Save" button
5. Frontend sends PATCH to `/api/tickets/tickets/{id}/`
6. Backend updates and returns updated data
7. Frontend updates ticket in list
8. Success message shown
9. Modal closes

## API Endpoints Used

```
POST   /api/tickets/tickets/          - Create ticket
GET    /api/tickets/tickets/          - List tickets
GET    /api/tickets/tickets/{id}/     - Get ticket
PATCH  /api/tickets/tickets/{id}/     - Update ticket
DELETE /api/tickets/tickets/{id}/     - Delete ticket
POST   /api/tickets/tickets/{id}/move_to_column/ - Move ticket
POST   /api/tickets/tickets/{id}/toggle_follow/  - Follow/unfollow
```

## Request/Response Examples

### Create Ticket Request
```json
POST /api/tickets/tickets/
{
  "name": "Fix login bug",
  "description": "Users cannot login with SSO",
  "type": "bug",
  "status": "New",
  "priority_id": 4,
  "column": 1,
  "due_date": "2025-10-30",
  "start_date": "2025-10-25"
}
```

### Response
```json
{
  "id": 15,
  "name": "Fix login bug",
  "description": "Users cannot login with SSO",
  "type": "bug",
  "status": "New",
  "priority_id": 4,
  "column": 1,
  "column_name": "To Do",
  "customer": null,
  "customer_name": null,
  "assignees": [],
  "reporter": null,
  "parent": null,
  "tags": [],
  "following": false,
  "comments_count": 0,
  "due_date": "2025-10-30",
  "start_date": "2025-10-25",
  "created_at": "2025-10-25T14:30:00Z",
  "updated_at": "2025-10-25T14:30:00Z"
}
```

## Error Handling

All API calls include proper error handling:

```typescript
try {
  const ticket = await ticketService.createTicket(data);
  message.success("Ticket created successfully!");
  onSuccess(ticket);
} catch (error: any) {
  console.error('Failed to create ticket:', error);
  message.error(error.message || 'Failed to create ticket');
}
```

Error types:
- Network errors (connection failed)
- HTTP errors (4xx, 5xx responses)
- Validation errors (missing required fields)
- Server errors (backend failures)

## Next Steps

To complete the backend integration:

1. **Customers**: Create customer selection dropdown
2. **Assignees**: Add user assignment functionality  
3. **Tags**: Implement tag selection UI
4. **Comments**: Add comment creation/display
5. **Attachments**: File upload functionality
6. **Subtasks**: Parent/child ticket relationships
7. **Drag & Drop**: Move tickets between columns
8. **Real-time Updates**: WebSocket for live updates
9. **Authentication**: JWT token management
10. **Permissions**: Role-based access control

## Testing

To test the implementation:

1. Start backend:
   ```bash
   cd backend
   ../.venv/Scripts/python.exe manage.py runserver
   ```

2. Start frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open browser: http://localhost:5173
4. Click "Create Ticket"
5. Fill in form and save
6. Check Network tab to see API calls
7. Verify ticket appears in table

## Configuration

Make sure `.env` is set in frontend (if not using Vite defaults):

```env
VITE_API_BASE_URL=http://localhost:8000
```

For Dokploy deployment:
```env
VITE_API_BASE_URL=http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
```
