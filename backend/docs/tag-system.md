# Tag System Documentation

## Overview

The Tag System provides a flexible way to organize tickets by clients, locations, teams, or any other organizational unit. Tags are project-specific and can have associated contacts for easy reference.

## Use Cases

1. **Client Organization**: Tag tickets with client names (e.g., "Nikora", "Nokia")
2. **Location Tracking**: Tag tickets with specific locations (e.g., "Nikora-Batumi")
3. **Team Management**: Tag tickets with team names (e.g., "Finances Team", "Servers Team")
4. **Contact Reference**: Associate contacts with tags for quick access to stakeholder information

## Key Features

### Tags

- **Project-Specific**: Each tag belongs to a specific project/column
- **Superadmin Only**: Only superadmins can create, edit, or delete tags
- **Uniform Color**: All tags use the same color (#0052cc) for visual consistency
- **No Hierarchy**: Flat structure - no parent/child relationships
- **No Types**: All tags are the same type (clients, teams, locations are differentiated by name/description only)
- **Description Field**: Optional description for additional context

### Contacts

- **Multiple Per Tag**: A tag can have many contacts
- **Reusable**: A contact can be associated with multiple tags
- **Rich Information**: Name, email, phone, title, department, description
- **Role Assignment**: Optional role field (e.g., "Primary Contact", "Technical Lead")
- **Not System Users**: Contacts are separate from the User model (external stakeholders)

### Team Membership

- **User-Tag Association**: Users can be members of tag-based teams
- **No Special Permissions**: Team membership is organizational only (no permission grants)
- **Multiple Teams**: A user can belong to multiple tags/teams

## Database Schema

### Core Tables

#### Tag

```sql
CREATE TABLE tag (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#0052cc',
    project_id BIGINT NOT NULL REFERENCES column(id),
    created_by_id BIGINT REFERENCES auth_user(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE (name, project_id)
);
```

#### Contact

```sql
CREATE TABLE contact (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(50),
    title VARCHAR(100),
    department VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

### Junction Tables

#### Ticket_Tags

```sql
CREATE TABLE ticket_tags (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES ticket(id),
    tag_id BIGINT NOT NULL REFERENCES tag(id),
    added_at TIMESTAMP NOT NULL,
    added_by_id BIGINT REFERENCES auth_user(id),
    UNIQUE (ticket_id, tag_id)
);
```

#### Tag_Contacts

```sql
CREATE TABLE tag_contacts (
    id BIGSERIAL PRIMARY KEY,
    tag_id BIGINT NOT NULL REFERENCES tag(id),
    contact_id BIGINT NOT NULL REFERENCES contact(id),
    role VARCHAR(100),
    added_at TIMESTAMP NOT NULL,
    added_by_id BIGINT REFERENCES auth_user(id),
    UNIQUE (tag_id, contact_id)
);
```

#### User_Tags

```sql
CREATE TABLE user_tags (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES auth_user(id),
    tag_id BIGINT NOT NULL REFERENCES tag(id),
    added_at TIMESTAMP NOT NULL,
    added_by_id BIGINT REFERENCES auth_user(id),
    UNIQUE (user_id, tag_id)
);
```

## API Endpoints

### Tags

| Method    | Endpoint                                 | Description             | Permission |
| --------- | ---------------------------------------- | ----------------------- | ---------- |
| GET       | `/api/tickets/tags/`                     | List all tags           | All        |
| POST      | `/api/tickets/tags/`                     | Create new tag          | Superadmin |
| GET       | `/api/tickets/tags/{id}/`                | Get tag details         | All        |
| PUT/PATCH | `/api/tickets/tags/{id}/`                | Update tag              | Superadmin |
| DELETE    | `/api/tickets/tags/{id}/`                | Delete tag              | Superadmin |
| GET       | `/api/tickets/tags/{id}/contacts/`       | Get tag contacts        | All        |
| POST      | `/api/tickets/tags/{id}/add_contact/`    | Add contact to tag      | Superadmin |
| DELETE    | `/api/tickets/tags/{id}/remove_contact/` | Remove contact from tag | Superadmin |
| GET       | `/api/tickets/tags/{id}/tickets/`        | Get tickets with tag    | All        |

### Contacts

| Method    | Endpoint                           | Description          |
| --------- | ---------------------------------- | -------------------- |
| GET       | `/api/tickets/contacts/`           | List all contacts    |
| POST      | `/api/tickets/contacts/`           | Create new contact   |
| GET       | `/api/tickets/contacts/{id}/`      | Get contact details  |
| PUT/PATCH | `/api/tickets/contacts/{id}/`      | Update contact       |
| DELETE    | `/api/tickets/contacts/{id}/`      | Delete contact       |
| GET       | `/api/tickets/contacts/{id}/tags/` | Get tags for contact |

### Ticket Tags

| Method | Endpoint                         | Description                  |
| ------ | -------------------------------- | ---------------------------- |
| GET    | `/api/tickets/ticket-tags/`      | List ticket-tag associations |
| POST   | `/api/tickets/ticket-tags/`      | Add tag to ticket            |
| DELETE | `/api/tickets/ticket-tags/{id}/` | Remove tag from ticket       |

### User Tags (Team Membership)

| Method | Endpoint                       | Description                |
| ------ | ------------------------------ | -------------------------- |
| GET    | `/api/tickets/user-tags/`      | List user-tag associations |
| POST   | `/api/tickets/user-tags/`      | Add user to team           |
| DELETE | `/api/tickets/user-tags/{id}/` | Remove user from team      |

## Usage Examples

### Creating a Tag

```bash
POST /api/tickets/tags/
{
  "name": "Nikora",
  "description": "Nikora supermarket chain tickets",
  "color": "#0052cc",
  "project": 1
}
```

### Creating a Contact

```bash
POST /api/tickets/contacts/
{
  "name": "Giorgi Beridze",
  "email": "g.beridze@nikora.ge",
  "phone": "+995 555 123 456",
  "title": "IT Manager",
  "department": "IT Department",
  "description": "Primary technical contact for Nikora"
}
```

### Associating Contact with Tag

```bash
POST /api/tickets/tags/1/add_contact/
{
  "contact_id": 1,
  "role": "Primary Contact"
}
```

### Adding Tag to Ticket

```bash
POST /api/tickets/ticket-tags/
{
  "ticket": 5,
  "tag_id": 1
}
```

### Adding User to Team

```bash
POST /api/tickets/user-tags/
{
  "user_id": 2,
  "tag_id": 4
}
```

### Filtering Tickets by Tag

```bash
GET /api/tickets/tickets/?tags=1
```

### Filtering Tickets by Multiple Tags

```bash
GET /api/tickets/tickets/?tags=1&tags=2
```

## Django Models

### Tag Model

```python
class Tag(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    color = models.CharField(max_length=7, default='#0052cc')
    project = models.ForeignKey(Column, on_delete=models.CASCADE, related_name='tags')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tags')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['name', 'project']]
```

### Contact Model

```python
class Contact(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, null=True)
    title = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## Frontend Integration

### Display Tag in Ticket Modal

```typescript
interface Tag {
  id: number;
  name: string;
  description: string;
  color: string;
  project_name: string;
  contacts: Contact[];
}

interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  department?: string;
  role?: string; // Role in tag-contact relationship
}
```

### Tag Selector Component

```typescript
<Select
  mode="multiple"
  placeholder="Select tags"
  value={selectedTagIds}
  onChange={handleTagChange}
>
  {tags.map((tag) => (
    <Select.Option key={tag.id} value={tag.id}>
      <Tag color={tag.color}>{tag.name}</Tag>
    </Select.Option>
  ))}
</Select>
```

### Display Contacts for Selected Tag

```typescript
{
  selectedTag &&
    selectedTag.contacts.map((tc) => (
      <div key={tc.contact.id}>
        <h4>{tc.contact.name}</h4>
        {tc.role && <span>{tc.role}</span>}
        <p>Email: {tc.contact.email}</p>
        {tc.contact.phone && <p>Phone: {tc.contact.phone}</p>}
        {tc.contact.title && <p>Title: {tc.contact.title}</p>}
      </div>
    ));
}
```

## Permission System

### Current State (Temporary)

- All endpoints use `AllowAny` permission
- No authentication required

### Future Implementation

- **Tag Creation/Edit/Delete**: `IsSuperAdmin` permission
- **Contact Management**: `IsAuthenticated` permission
- **Viewing Tags/Contacts**: `AllowAny` permission
- **Adding/Removing Tags from Tickets**: `IsAuthenticated` permission
- **Team Membership Management**: `IsSuperAdmin` or `IsProjectLead` permission

## Future Enhancements

### Not Implemented (By Design)

1. **No Hierarchy**: Intentionally flat structure for simplicity
2. **No Tag Types**: All tags are the same - differentiation by name/description
3. **No Auto-Notifications**: Users are not automatically notified when tags are added
4. **No Tag-Based Permissions**: Team membership doesn't grant special access

### Potential Future Additions

1. **Tag Colors**: Allow custom colors per tag (currently all use #0052cc)
2. **Tag Statistics**: Dashboard showing ticket distribution by tag
3. **Contact Import**: Bulk import contacts from CSV
4. **Tag Templates**: Pre-defined tag sets for common project types
5. **Contact History**: Track when contacts are added/removed from tags
6. **Auto-Tagging**: Automatically tag tickets based on keywords in title/description
7. **Tag Suggestions**: Suggest tags based on ticket content using AI

## Migration Guide

### From Old System (labels field)

If you have existing tickets with `labels` JSON field:

```python
# Migration script to convert JSON labels to Tag model
from tickets.models import Ticket, Tag, TicketTag

for ticket in Ticket.objects.exclude(labels__isnull=True):
    for label_name in ticket.labels:
        # Create tag if doesn't exist
        tag, created = Tag.objects.get_or_create(
            name=label_name,
            project=ticket.column,
            defaults={'created_by': ticket.reporter}
        )

        # Associate tag with ticket
        TicketTag.objects.get_or_create(
            ticket=ticket,
            tag=tag,
            defaults={'added_by': ticket.reporter}
        )
```

## Best Practices

1. **Naming Convention**: Use clear, descriptive tag names (e.g., "Nikora-Batumi" instead of "NB")
2. **Description Field**: Always add descriptions to explain tag purpose
3. **Contact Roles**: Use consistent role names (e.g., "Primary Contact", "Technical Lead", "Billing Contact")
4. **Tag Consolidation**: Avoid creating duplicate tags with similar meanings
5. **Regular Cleanup**: Periodically review and remove unused tags
6. **Documentation**: Maintain a list of active tags and their purposes

## Troubleshooting

### Tag Not Appearing in Dropdown

- Verify tag belongs to the correct project
- Check if tag was created by superadmin
- Ensure tag hasn't been deleted

### Contact Not Showing for Tag

- Verify TagContact relationship exists
- Check if contact was properly associated with tag
- Ensure contact hasn't been deleted

### Cannot Create Tag

- Verify user has superadmin privileges
- Check if tag name already exists in project
- Ensure project_id is valid

### Filtering by Tags Not Working

- Use correct query parameter: `?tags=1&tags=2`
- Verify tag IDs exist in database
- Check if tickets actually have these tags assigned
