# ServiceDesk Ticket Workflow

This document describes the ticket lifecycle in the ServiceDesk client portal.

## Ticket Status Flow

Tickets move through project columns in order:

```
[First Column] → [Middle Columns...] → [Final Column] → Resolved (via rating)
```

Example for IT-Tech project:

```
To Do → In Progress → Review → Done → Resolved
```

The key points:

- Tickets can move through any columns in the project
- When a ticket reaches the **final column** (highest order), the customer can rate it
- After rating, the ticket is marked as **resolved** (stays in the final column)

### Status Descriptions

| Status           | Description                                       |
| ---------------- | ------------------------------------------------- |
| **In Column**    | Ticket is being worked on, moving through columns |
| **Final Column** | Work is complete, awaiting customer review/rating |
| **Resolved**     | Customer has rated the ticket, ticket is closed   |

## Customer Review Process

When a ticket reaches the **final column** of the project:

1. **Review UI Appears**: Customer sees a rating interface
2. **Rating**: Customer provides 1-5 star rating
3. **Optional Feedback**: Customer can add resolution feedback
4. **Resolved**: Upon submission, `resolved_at` is set, marking ticket as resolved

### Rating Scale

| Stars      | Meaning           |
| ---------- | ----------------- |
| ⭐         | Very Dissatisfied |
| ⭐⭐       | Dissatisfied      |
| ⭐⭐⭐     | Neutral           |
| ⭐⭐⭐⭐   | Satisfied         |
| ⭐⭐⭐⭐⭐ | Very Satisfied    |

### Implementation Details

#### How "Final Column" is Determined

The backend checks if the ticket's column has the highest `order` value among all columns in the project:

```python
max_order = Column.objects.filter(project=ticket.project).aggregate(Max('order'))['order__max']
is_final = ticket.column.order == max_order
```

This is exposed via `is_final_column` field in the ticket API response.

#### Frontend Components

**TicketDetail.tsx** - Shows review UI when ticket is in "Done" status:

- Star rating component (1-5 stars, interactive)
- Optional feedback textarea
- Submit button

**ProgressChain.tsx** - Visual status indicator showing:

- Open → In Progress → Waiting → Done → Review → Resolved

#### API Endpoint

```
POST /api/tickets/tickets/{id}/review/
```

**Request Body:**

```json
{
  "rating": 5,
  "feedback": "Great support, issue resolved quickly!"
}
```

**Response:**

```json
{
  "id": 123,
  "status": "resolved",
  "resolution_rating": 5,
  "resolution_feedback": "Great support, issue resolved quickly!",
  "resolved_at": "2025-01-15T10:30:00Z"
}
```

#### Backend Model Fields (Ticket)

```python
resolution_rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
resolution_feedback = models.TextField(blank=True)
resolved_at = models.DateTimeField(null=True, blank=True)
```

## Status Transitions

### Allowed Transitions

| From        | To                      | Who                        |
| ----------- | ----------------------- | -------------------------- |
| Open        | In Progress, Waiting    | Admin/Agent                |
| In Progress | Waiting, Done, Open     | Admin/Agent                |
| Waiting     | In Progress, Done, Open | Admin/Agent                |
| Done        | Review                  | Customer (via rating)      |
| Done        | In Progress, Waiting    | Admin/Agent (reopen)       |
| Review      | Resolved                | System (auto after rating) |

### Special Cases

1. **Reopen from Done**: If customer has issues, admin can move ticket back to In Progress
2. **Skip Review**: Admin can move directly to Resolved (bypasses customer rating)
3. **Review Timeout**: Optional - auto-resolve after X days if customer doesn't respond

## Visual Progress Chain

The ServiceDesk displays a progress chain showing the ticket's journey:

```
[ ● ]---[ ● ]---[ ● ]---[ ○ ]---[ ○ ]---[ ○ ]
Open   InProg  Wait    Done   Review  Resolved
```

- **Filled dot**: Completed or current status
- **Empty dot**: Future status
- **Colored dot**: Current status (color varies by status)

### Status Colors

| Status      | Color  | Tailwind Class         |
| ----------- | ------ | ---------------------- |
| Open        | Blue   | `bg-status-open`       |
| In Progress | Yellow | `bg-status-inProgress` |
| Waiting     | Orange | `bg-status-waiting`    |
| Done        | Brand  | `bg-brand-500`         |
| Review      | Amber  | `bg-amber-500`         |
| Resolved    | Green  | `bg-status-resolved`   |

## Implementation Checklist

### Backend

- [x] Add `resolution_rating`, `resolution_feedback`, `resolved_at` fields to Ticket model
- [x] Create migration
- [x] Add `review` action to TicketViewSet
- [x] Add "Resolved" column to default project columns

### ServiceDesk Frontend

- [x] Update ProgressChain to include Done and Review statuses
- [x] Update getStatusKey mapping in TicketDetail
- [x] Add StarRating component
- [x] Add review form when ticket is in Done status
- [x] Handle review submission
- [x] Show rating on resolved tickets

### Main Frontend (Admin)

- [ ] Display customer ratings on tickets
- [ ] Add rating column to ticket tables (optional)
- [ ] Show rating statistics in company/project dashboards
