# Frontend API Guide

Complete guide to using the Ticketing System frontend API services.

## Table of Contents

- [Overview](#overview)
- [Type System](#type-system)
- [Services](#services)
- [Pagination](#pagination)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Overview

The frontend uses a service-based architecture to interact with the backend API. All services are located in `src/services/` and use centralized types from `src/types/api.ts`.

### Key Principles

1. **Type Safety**: All API responses and requests are fully typed
2. **Snake Case**: API uses snake_case (e.g., `due_date`, `priority_id`)
3. **Pagination**: Most list endpoints return `PaginatedResponse<T>`
4. **JWT Authentication**: Uses access/refresh token flow

---

## Type System

All types are defined in `src/types/api.ts` and match the actual API structure.

### Core Types

```typescript
// Pagination wrapper for list endpoints
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Pagination parameters
interface PaginationParams {
  page?: number;
  page_size?: number;
}

// Error responses
interface ErrorResponse {
  error?: string;
  detail?: string;
  message?: string;
  [key: string]: any; // Field-specific errors
}
```

### Entity Types

```typescript
// User with nested relationships
interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  projects?: Project[];
  companies?: Company[];
}

// Project with members
interface Project {
  id: number;
  key: string;
  name: string;
  description?: string;
  lead: User;
  members: ProjectMember[];
  companies: Company[];
  created_at: string;
  updated_at: string;
}

// Ticket with full relationships
interface Ticket {
  id: number;
  name: string;
  description?: string;
  type: TicketType;
  status: TicketStatus;
  priority_id: number;
  urgency: TicketUrgency;
  importance: TicketImportance;

  // Relationships (nested objects, not IDs)
  project: number;
  column: number;
  assignees: User[]; // Array of User objects
  reporter: User; // User object
  tags_detail: Tag[];

  // Metadata
  due_date?: string;
  created_at: string;
  updated_at: string;
  comments_count?: number;
}
```

### Important Notes

- **assignees**: Array of `User` objects, not `number[]`
- **reporter**: `User` object, not `number`
- **Field names**: Use snake_case (`due_date`, not `dueDate`)

---

## Services

### Authentication Service

```typescript
import { authService } from "../services";

// Login
const response = await authService.login({
  username: "john",
  password: "secret123",
});
// Returns: { user: User, tokens: { access: string, refresh: string } }

// Access tokens
const accessToken = response.tokens.access;
const refreshToken = response.tokens.refresh;

// Register
await authService.register({
  username: "john",
  email: "john@example.com",
  password: "secret123",
  password_confirm: "secret123",
});

// Refresh token
const newTokens = await authService.refreshToken(refreshToken);

// Logout
await authService.logout();
```

### Project Service

```typescript
import { projectService } from "../services";
import type { Project, PaginatedResponse } from "../types/api";

// Get paginated projects
const response: PaginatedResponse<Project> = await projectService.getProjects({
  page: 1,
  page_size: 20,
});

// Get all projects (unpaginated helper)
const allProjects: Project[] = await projectService.getAllProjects();

// Get single project
const project: Project = await projectService.getProject(1);

// Create project
const newProject = await projectService.createProject({
  key: "PROJ",
  name: "New Project",
  description: "Project description",
});

// Update project
await projectService.updateProject(1, {
  name: "Updated Name",
});

// Delete project
await projectService.deleteProject(1);

// Get project columns
const columns = await projectService.getProjectColumns(1);
```

### Ticket Service

```typescript
import { ticketService } from "../services";
import type { Ticket, TicketFilterParams } from "../types/api";

// Get tickets with filtering
const response = await ticketService.getTickets({
  project: 1, // Filter by project
  status: "open", // Filter by status
  type: "bug", // Filter by type
  assignee: 5, // Filter by assignee ID
  reporter: 3, // Filter by reporter ID
  column: 2, // Filter by column
  tag: "urgent", // Filter by tag
  priority_id: 4, // Filter by priority
  search: "bug fix", // Search in name/description
  ordering: "-created_at", // Sort order
  page: 1,
  page_size: 50,
});

// Get all tickets for a project (helper)
const tickets: Ticket[] = await ticketService.getAllProjectTickets(1);

// Get single ticket
const ticket: Ticket = await ticketService.getTicket(123);

// Create ticket
const newTicket = await ticketService.createTicket({
  name: "Fix login bug",
  description: "Users can't log in",
  type: "bug",
  project: 1,
  column: 1,
  priority_id: 4,
  urgency: "high",
  importance: "critical",
  assignees: [5, 8], // Array of user IDs
  tags: [1, 2], // Array of tag IDs
  due_date: "2025-11-15",
});

// Update ticket
await ticketService.updateTicket(123, {
  name: "Updated title",
  priority_id: 3,
});

// Move ticket to different column
await ticketService.moveTicket(123, 2);

// Delete ticket
await ticketService.deleteTicket(123);
```

### Column Service

```typescript
import { columnService } from "../services";

// Get columns (paginated)
const response = await columnService.getColumns({
  page: 1,
  page_size: 100,
});

// Get all columns (helper)
const columns = await columnService.getAllColumns();

// Create column
const column = await columnService.createColumn({
  name: "In Review",
  project: 1,
  order: 3,
});

// Reorder columns
await columnService.reorderColumns(1, [
  { id: 1, order: 0 },
  { id: 2, order: 1 },
  { id: 3, order: 2 },
]);
```

### Tag Service

```typescript
import { tagService } from "../services";

// Get tags for project
const response = await tagService.getTags(projectId, {
  page: 1,
  page_size: 50,
});

// Get all tags (helper)
const tags = await tagService.getAllTags(projectId);

// Create tag
const tag = await tagService.createTag({
  name: "urgent",
  color: "#ff0000",
  project: 1,
  description: "Urgent issues",
});

// Manage tag contacts
await tagService.addContact(tagId, contactId);
await tagService.removeContact(tagId, contactId);
```

### Comment Service

```typescript
import { commentService } from "../services";

// Get comments for a ticket
const comments = await commentService.getComments(ticketId, {
  page: 1,
  page_size: 20,
});

// Create comment
const comment = await commentService.createComment({
  ticket: ticketId,
  content: "This looks good!",
});

// Update comment
await commentService.updateComment(commentId, {
  content: "Updated comment",
});

// Delete comment
await commentService.deleteComment(commentId);
```

### Attachment Service

```typescript
import { attachmentService } from "../services";

// Upload file
const file = fileInput.files[0];
const attachment = await attachmentService.uploadAttachment({
  ticket: ticketId,
  file: file,
});

// Get attachments for ticket
const attachments = await attachmentService.getAttachments(ticketId);

// Delete attachment
await attachmentService.deleteAttachment(attachmentId);
```

### Company Service

```typescript
import { companyService } from "../services";

// Get companies
const companies = await companyService.getCompanies({
  page: 1,
  page_size: 20,
});

// Create company
const company = await companyService.createCompany({
  name: "Acme Corp",
  description: "Client company",
});

// Assign admin/user
await companyService.assignAdmin(companyId, userId);
await companyService.assignUser(companyId, userId);

// Get company tickets
const tickets = await companyService.getCompanyTickets(companyId);
```

### User Service

```typescript
import { userService } from "../services";

// Get users
const users = await userService.getUsers({
  page: 1,
  page_size: 50,
});

// Manage roles
await userService.assignRole(userId, roleId);
await userService.removeRole(userId, roleId);

// Set password
await userService.setPassword(userId, "newpassword123");

// Toggle active status
await userService.toggleActive(userId, true);
```

---

## Pagination

All list endpoints return `PaginatedResponse<T>`:

```typescript
interface PaginatedResponse<T> {
  count: number; // Total count
  next: string | null; // URL to next page
  previous: string | null; // URL to previous page
  results: T[]; // Array of items
}
```

### Pagination Patterns

**Pattern 1: Use paginated response directly**

```typescript
const response = await ticketService.getTickets({
  project: 1,
  page: 1,
  page_size: 20,
});

setTickets(response.results);
setTotalCount(response.count);
setHasMore(response.next !== null);
```

**Pattern 2: Use helper methods for all data**

```typescript
// Helper methods fetch with page_size=1000
const allTickets = await ticketService.getAllProjectTickets(projectId);
const allProjects = await projectService.getAllProjects();
const allColumns = await columnService.getAllColumns();
```

**Pattern 3: Load more (infinite scroll)**

```typescript
const [tickets, setTickets] = useState<Ticket[]>([]);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

const loadMore = async () => {
  const response = await ticketService.getTickets({
    project: projectId,
    page: page,
    page_size: 20,
  });

  setTickets((prev) => [...prev, ...response.results]);
  setHasMore(response.next !== null);
  setPage((prev) => prev + 1);
};
```

---

## Error Handling

Use the error handling utilities from `utils/api-errors.ts`:

```typescript
import {
  parseApiError,
  isAuthError,
  isValidationError,
  getFieldErrors,
  getOperationErrorMessage,
} from "../utils/api-errors";
import { message } from "antd";

// Basic error handling
try {
  await ticketService.createTicket(data);
  message.success("Ticket created successfully");
} catch (error) {
  const errorMessage = parseApiError(error);
  message.error(errorMessage);
}

// Check error type
try {
  await ticketService.updateTicket(id, data);
} catch (error) {
  if (isAuthError(error)) {
    // Redirect to login
    router.push("/login");
  } else if (isValidationError(error)) {
    // Show field errors
    const fieldErrors = getFieldErrors(error);
    Object.entries(fieldErrors).forEach(([field, errors]) => {
      message.error(`${field}: ${errors.join(", ")}`);
    });
  } else {
    message.error(parseApiError(error));
  }
}

// Context-specific messages
try {
  await projectService.createProject(data);
} catch (error) {
  const msg = getOperationErrorMessage("create", "project", error);
  message.error(msg);
  // "Failed to create project. Validation failed..."
}
```

### Error Utilities

```typescript
// Parse error to user-friendly message
parseApiError(error: any): string

// Get HTTP status code
getErrorStatus(error: any): number | null

// Check error types
isAuthError(error: any): boolean        // 401, 403
isValidationError(error: any): boolean  // 400, 422
isNotFoundError(error: any): boolean    // 404
isServerError(error: any): boolean      // 500+
isNetworkError(error: any): boolean     // No response

// Get field-specific errors
getFieldErrors(error: any): Record<string, string[]>

// Format for logging
formatErrorForLog(error: any, context?: string): string

// Retry logic
shouldRetry(error: any, attemptNumber: number): boolean
getRetryDelay(attemptNumber: number): number
```

---

## Examples

### Complete Ticket Creation Flow

```typescript
import { ticketService, projectService } from "../services";
import {
  parseApiError,
  isValidationError,
  getFieldErrors,
} from "../utils/api-errors";
import { message } from "antd";
import type { CreateTicketData } from "../types/api";

const createTicket = async (formData: any) => {
  try {
    // Prepare data
    const ticketData: CreateTicketData = {
      name: formData.title,
      description: formData.description,
      type: formData.type,
      project: selectedProject.id,
      column: formData.column,
      priority_id: formData.priority,
      urgency: formData.urgency,
      importance: formData.importance,
      assignees: formData.assignees,
      tags: formData.tags,
      due_date: formData.dueDate?.format("YYYY-MM-DD"),
    };

    // Create ticket
    const ticket = await ticketService.createTicket(ticketData);

    message.success(`Ticket ${ticket.id} created successfully`);
    return ticket;
  } catch (error: any) {
    console.error("Failed to create ticket:", error);

    if (isValidationError(error)) {
      // Show field-specific errors
      const fieldErrors = getFieldErrors(error);
      Object.entries(fieldErrors).forEach(([field, errors]) => {
        message.error(`${field}: ${errors.join(", ")}`);
      });
    } else {
      // Show general error
      message.error(parseApiError(error));
    }

    throw error;
  }
};
```

### Fetching and Filtering Tickets

```typescript
import { useState, useEffect } from "react";
import { ticketService } from "../services";
import type { Ticket, TicketFilterParams } from "../types/api";

const TicketList = ({ projectId }: { projectId: number }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TicketFilterParams>({});

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const response = await ticketService.getTickets({
          project: projectId,
          ...filters,
          page_size: 50,
        });

        setTickets(response.results);
      } catch (error) {
        message.error(parseApiError(error));
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [projectId, filters]);

  const handleFilter = (field: string, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <Select onChange={(v) => handleFilter("status", v)}>
        <Option value="open">Open</Option>
        <Option value="closed">Closed</Option>
      </Select>

      <Select onChange={(v) => handleFilter("type", v)}>
        <Option value="bug">Bug</Option>
        <Option value="task">Task</Option>
      </Select>

      {loading ? (
        <Spin />
      ) : (
        <List
          dataSource={tickets}
          renderItem={(ticket) => <TicketCard ticket={ticket} />}
        />
      )}
    </div>
  );
};
```

### File Upload with Progress

```typescript
import { attachmentService } from "../services";
import { message, Upload } from "antd";

const FileUpload = ({ ticketId }: { ticketId: number }) => {
  const handleUpload = async (file: File) => {
    try {
      const attachment = await attachmentService.uploadAttachment({
        ticket: ticketId,
        file: file,
      });

      message.success(`File uploaded: ${attachment.file_name}`);
      return attachment;
    } catch (error) {
      message.error(parseApiError(error));
      throw error;
    }
  };

  return (
    <Upload
      customRequest={({ file, onSuccess, onError }) => {
        handleUpload(file as File)
          .then(onSuccess)
          .catch(onError);
      }}
    >
      <Button icon={<UploadOutlined />}>Upload</Button>
    </Upload>
  );
};
```

### Optimistic Updates

```typescript
const handleMoveTicket = async (ticketId: number, newColumnId: number) => {
  const previousColumn = ticket.column;

  // Optimistic update
  setTickets((prev) =>
    prev.map((t) => (t.id === ticketId ? { ...t, column: newColumnId } : t))
  );

  try {
    await ticketService.moveTicket(ticketId, newColumnId);
  } catch (error) {
    // Rollback on error
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, column: previousColumn } : t
      )
    );

    message.error(parseApiError(error));
  }
};
```

---

## Best Practices

1. **Always use types from `types/api.ts`**

   ```typescript
   import type { Ticket, Project } from "../types/api";
   ```

2. **Use snake_case for API field names**

   ```typescript
   ticket.due_date; // ✅ Correct
   ticket.dueDate; // ❌ Wrong
   ```

3. **Handle pagination properly**

   ```typescript
   const response = await service.getItems(); // Returns PaginatedResponse
   const items = response.results; // Extract array
   ```

4. **Use error utilities**

   ```typescript
   catch (error) {
     message.error(parseApiError(error));
   }
   ```

5. **Leverage helper methods**

   ```typescript
   // Instead of managing pagination manually
   const allProjects = await projectService.getAllProjects();
   ```

6. **Type your components**
   ```typescript
   interface Props {
     ticket: Ticket; // Use API types
     onUpdate: (ticket: Ticket) => void;
   }
   ```

---

## Migration from Old Types

If you're migrating from `types/ticket.ts`:

| Old (Deprecated)      | New (types/api.ts)         |
| --------------------- | -------------------------- |
| `assignees: number[]` | `assignees: User[]`        |
| `assigneeIds`         | `assignees.map(u => u.id)` |
| `priorityId`          | `priority_id`              |
| `dueDate`             | `due_date`                 |
| `createdAt`           | `created_at`               |
| `columnName`          | `column_name`              |
| `tag_names: string[]` | `tags_detail: Tag[]`       |

---

## Additional Resources

- **Type Definitions**: `src/types/api.ts`
- **Services**: `src/services/`
- **Error Utilities**: `src/utils/api-errors.ts`
- **API Base URL**: `src/config/api.ts`

---

**Last Updated**: October 30, 2025
