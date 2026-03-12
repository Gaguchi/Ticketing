# Jira-Style Status System Implementation

## How Jira Actually Works

After researching Jira's actual implementation, here's the complete picture:

### The Two-Layer System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          JIRA'S ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 1: STATUSES (Global, Admin-Managed)                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Stored on the ISSUE itself: issue.status = "In Progress"              │  │
│  │                                                                        │  │
│  │ Status Table (site-wide):                                              │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐   │  │
│  │ │ id   │ name           │ category      │ color  │                │   │  │
│  │ ├──────┼────────────────┼───────────────┼────────┤                │   │  │
│  │ │ 1    │ Open           │ TO_DO         │ gray   │                │   │  │
│  │ │ 2    │ To Do          │ TO_DO         │ gray   │                │   │  │
│  │ │ 3    │ In Progress    │ IN_PROGRESS   │ blue   │                │   │  │
│  │ │ 4    │ In Review      │ IN_PROGRESS   │ blue   │                │   │  │
│  │ │ 5    │ Done           │ DONE          │ green  │                │   │  │
│  │ │ 6    │ Closed         │ DONE          │ green  │                │   │  │
│  │ └─────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                        │  │
│  │ Categories (fixed - cannot add more):                                  │  │
│  │   • TO_DO (gray)       - Work not started                             │  │
│  │   • IN_PROGRESS (blue) - Work being done                              │  │
│  │   • DONE (green)       - Work completed                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  LAYER 2: BOARD COLUMNS (Per-Board, User-Managed)                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Board columns are VISUAL ONLY - they group statuses for display       │  │
│  │                                                                        │  │
│  │ Board A Config:                                                        │  │
│  │ ┌──────────────┬────────────────────────────────────────────────┐     │  │
│  │ │ Column       │ Mapped Statuses                                 │     │  │
│  │ ├──────────────┼────────────────────────────────────────────────┤     │  │
│  │ │ "To Do"      │ [Open, To Do]                                   │     │  │
│  │ │ "Working"    │ [In Progress]                                   │     │  │
│  │ │ "Review"     │ [In Review]                                     │     │  │
│  │ │ "Complete"   │ [Done, Closed]                                  │     │  │
│  │ └──────────────┴────────────────────────────────────────────────┘     │  │
│  │                                                                        │  │
│  │ Board B Config (same project, different view):                         │  │
│  │ ┌──────────────┬────────────────────────────────────────────────┐     │  │
│  │ │ Column       │ Mapped Statuses                                 │     │  │
│  │ ├──────────────┼────────────────────────────────────────────────┤     │  │
│  │ │ "Backlog"    │ [Open, To Do]                                   │     │  │
│  │ │ "Dev"        │ [In Progress, In Review]                        │     │  │
│  │ │ "Done"       │ [Done, Closed]                                  │     │  │
│  │ └──────────────┴────────────────────────────────────────────────┘     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Points

1. **Status Categories are FIXED** - Only 3: TO_DO, IN_PROGRESS, DONE

   - These determine the color (gray, blue, green)
   - Used for reporting ("How much work is in progress?")
   - Cannot be created by users

2. **Statuses are GLOBAL but Admin-Controlled**

   - Admins can create new statuses (e.g., "QA", "Blocked", "Waiting")
   - Each status belongs to exactly one category
   - Statuses are shared across all projects

3. **Board Columns are PER-BOARD**

   - When you add a column, you're configuring a view
   - Each column maps to one or more statuses
   - Moving a ticket changes its STATUS, the column follows

4. **Moving a Ticket:**
   ```
   User drags ticket from "Working" column to "Review" column
     → Ticket.status changes from "In Progress" to "In Review"
     → This is the ONLY data change
     → Column display updates automatically because "In Review" maps to "Review" column
   ```

---

## Simplified Jira-Style Implementation for Our App

Since we don't need multiple boards per project (yet), we can simplify:

### Database Schema

```python
# models.py

class StatusCategory(models.TextChoices):
    """Fixed categories - determines color and reporting group"""
    TODO = 'todo', 'To Do'
    IN_PROGRESS = 'in_progress', 'In Progress'
    DONE = 'done', 'Done'


class Status(models.Model):
    """
    Global status definitions.
    Created by admins, shared across all projects.
    """
    key = models.SlugField(max_length=50, unique=True)  # "open", "in_progress", "in_review"
    name = models.CharField(max_length=100)              # "Open", "In Progress", "In Review"
    category = models.CharField(
        max_length=20,
        choices=StatusCategory.choices,
        default=StatusCategory.TODO
    )
    color = models.CharField(max_length=7, blank=True)   # Optional override, else use category color
    icon = models.CharField(max_length=50, blank=True)   # Optional icon
    order = models.IntegerField(default=0)               # Default display order
    is_default = models.BooleanField(default=False)      # True for system statuses

    class Meta:
        ordering = ['order']
        verbose_name_plural = 'Statuses'

    def __str__(self):
        return self.name

    @property
    def category_color(self):
        """Return color based on category if no custom color set"""
        if self.color:
            return self.color
        return {
            StatusCategory.TODO: '#6B778C',        # Gray
            StatusCategory.IN_PROGRESS: '#0052CC', # Blue
            StatusCategory.DONE: '#36B37E',        # Green
        }.get(self.category, '#6B778C')


class BoardColumn(models.Model):
    """
    Per-project board column configuration.
    Maps one or more statuses to a visual column.
    """
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='board_columns')
    name = models.CharField(max_length=100)              # Display name on board
    order = models.IntegerField(default=0)               # Column position
    statuses = models.ManyToManyField(Status, related_name='board_columns')  # Mapped statuses
    min_limit = models.IntegerField(null=True, blank=True)  # WIP limit (min)
    max_limit = models.IntegerField(null=True, blank=True)  # WIP limit (max)

    class Meta:
        ordering = ['project', 'order']
        unique_together = [['project', 'name']]

    def __str__(self):
        return f"{self.project.key}: {self.name}"


class Ticket(models.Model):
    """Ticket stores STATUS, not column"""
    # ... existing fields ...

    # CHANGE: Replace column FK with status FK
    status = models.ForeignKey(
        Status,
        on_delete=models.PROTECT,  # Don't allow deleting statuses with tickets
        related_name='tickets'
    )

    # Keep rank for ordering within columns
    rank = models.CharField(max_length=50, default='n', db_index=True)

    # REMOVE: column = models.ForeignKey(Column, ...)
    # REMOVE: column_order = models.IntegerField(...)
```

### Default Data (Migration)

```python
# Create default statuses
DEFAULT_STATUSES = [
    {'key': 'open', 'name': 'Open', 'category': 'todo', 'order': 1, 'is_default': True},
    {'key': 'todo', 'name': 'To Do', 'category': 'todo', 'order': 2, 'is_default': True},
    {'key': 'in_progress', 'name': 'In Progress', 'category': 'in_progress', 'order': 3, 'is_default': True},
    {'key': 'in_review', 'name': 'In Review', 'category': 'in_progress', 'order': 4, 'is_default': True},
    {'key': 'done', 'name': 'Done', 'category': 'done', 'order': 5, 'is_default': True},
    {'key': 'closed', 'name': 'Closed', 'category': 'done', 'order': 6, 'is_default': True},
]

# When a project is created, create default board columns
DEFAULT_BOARD_COLUMNS = [
    {'name': 'To Do', 'order': 1, 'statuses': ['open', 'todo']},
    {'name': 'In Progress', 'order': 2, 'statuses': ['in_progress']},
    {'name': 'In Review', 'order': 3, 'statuses': ['in_review']},
    {'name': 'Done', 'order': 4, 'statuses': ['done', 'closed']},
]
```

### API Changes

```python
# serializers.py

class StatusSerializer(serializers.ModelSerializer):
    category_color = serializers.CharField(read_only=True)

    class Meta:
        model = Status
        fields = ['key', 'name', 'category', 'color', 'category_color', 'icon', 'order']


class BoardColumnSerializer(serializers.ModelSerializer):
    statuses = StatusSerializer(many=True, read_only=True)
    status_keys = serializers.ListField(
        child=serializers.SlugField(),
        write_only=True,
        required=False
    )
    ticket_count = serializers.SerializerMethodField()

    class Meta:
        model = BoardColumn
        fields = ['id', 'name', 'order', 'statuses', 'status_keys',
                  'min_limit', 'max_limit', 'ticket_count']

    def get_ticket_count(self, obj):
        return Ticket.objects.filter(
            project=obj.project,
            status__in=obj.statuses.all()
        ).count()


class TicketSerializer(serializers.ModelSerializer):
    # Return status key and name
    status = serializers.SlugRelatedField(
        slug_field='key',
        queryset=Status.objects.all()
    )
    status_name = serializers.CharField(source='status.name', read_only=True)
    status_category = serializers.CharField(source='status.category', read_only=True)
    status_color = serializers.CharField(source='status.category_color', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'name', 'description', 'type',
            'status', 'status_name', 'status_category', 'status_color',  # Status fields
            'rank',  # Ordering
            # ... other fields
        ]
```

### API Examples

```json
// GET /api/statuses/
{
  "results": [
    {"key": "open", "name": "Open", "category": "todo", "category_color": "#6B778C"},
    {"key": "todo", "name": "To Do", "category": "todo", "category_color": "#6B778C"},
    {"key": "in_progress", "name": "In Progress", "category": "in_progress", "category_color": "#0052CC"},
    {"key": "in_review", "name": "In Review", "category": "in_progress", "category_color": "#0052CC"},
    {"key": "done", "name": "Done", "category": "done", "category_color": "#36B37E"},
    {"key": "closed", "name": "Closed", "category": "done", "category_color": "#36B37E"}
  ]
}

// GET /api/projects/1/board/
{
  "columns": [
    {
      "id": 1,
      "name": "To Do",
      "order": 1,
      "statuses": [
        {"key": "open", "name": "Open"},
        {"key": "todo", "name": "To Do"}
      ],
      "ticket_count": 5
    },
    {
      "id": 2,
      "name": "In Progress",
      "order": 2,
      "statuses": [{"key": "in_progress", "name": "In Progress"}],
      "ticket_count": 3
    }
  ]
}

// GET /api/tickets/123/
{
  "id": 123,
  "name": "Fix login bug",
  "status": "in_progress",           // Status KEY (semantic!)
  "status_name": "In Progress",       // Display name
  "status_category": "in_progress",   // Category for reporting
  "status_color": "#0052CC",          // Color for UI
  "rank": "aab"                       // LexoRank for ordering
}

// PATCH /api/tickets/123/  (move ticket)
{
  "status": "in_review"               // Just change status!
}

// Response: ticket now in "In Review" column automatically
```

### Frontend Changes

```typescript
// types/api.ts

interface StatusCategory {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done'
}

interface Status {
  key: string;           // "in_progress"
  name: string;          // "In Progress"
  category: StatusCategory;
  color: string;
}

interface BoardColumn {
  id: number;
  name: string;          // Display name
  order: number;
  statuses: Status[];    // Mapped statuses
  ticket_count: number;
}

interface Ticket {
  id: number;
  name: string;
  status: string;        // Status KEY: "in_progress"
  status_name: string;   // "In Progress"
  status_category: string;
  status_color: string;
  rank: string;          // LexoRank
}
```

```typescript
// KanbanBoard.tsx - MUCH SIMPLER

const KanbanBoard = ({ tickets, columns }) => {
  // Group tickets by finding which column contains their status
  const ticketsByColumn = useMemo(() => {
    const grouped: Record<number, Ticket[]> = {};

    columns.forEach((col) => {
      const statusKeys = col.statuses.map((s) => s.key);
      grouped[col.id] = tickets
        .filter((t) => statusKeys.includes(t.status))
        .sort((a, b) => a.rank.localeCompare(b.rank));
    });

    return grouped;
  }, [tickets, columns]);

  const handleDrop = (
    ticketId: number,
    targetColumnId: number,
    beforeRank?: string,
    afterRank?: string
  ) => {
    const column = columns.find((c) => c.id === targetColumnId);
    if (!column || column.statuses.length === 0) return;

    // Default to first status in column (user can pick if multiple)
    const newStatus = column.statuses[0].key;
    const newRank = calculateRankBetween(beforeRank, afterRank);

    // SIMPLE: Just update status and rank
    await api.patch(`/tickets/${ticketId}/`, {
      status: newStatus,
      rank: newRank,
    });
  };

  return (
    <DndContext onDragEnd={handleDrop}>
      {columns.map((column) => (
        <Column key={column.id} column={column}>
          {ticketsByColumn[column.id].map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </Column>
      ))}
    </DndContext>
  );
};
```

---

## Handling Your Scenarios

### "User creates QA column"

```
User clicks "Add Column" in Project A
  → Names it "QA"
  → System shows available statuses to map:
    [ ] Open
    [ ] To Do
    [ ] In Progress
    [x] In Review      ← User selects this
    [ ] Done
    [ ] Closed
  → Column created: {name: "QA", statuses: ["in_review"]}
```

If "In Review" doesn't fit, user/admin can create new status:

```
Admin creates status:
  key: "qa"
  name: "QA"
  category: IN_PROGRESS (blue)

Now user can map their column to the "QA" status
```

### "Another user creates Q&A column"

```
User in Project B clicks "Add Column"
  → Names it "Q&A"
  → Maps it to same "qa" status (or "in_review")
  → Column name is different, but STATUS is same

Tickets in both projects use status="qa"
Reporting works: "How many tickets are in QA status across all projects?"
```

### "User creates Banana column"

```
User clicks "Add Column"
  → Names it "Banana"
  → No existing status matches
  → Options:
    A) Map to existing status (In Progress, etc.)
    B) Request admin to create "Banana" status
    C) (If user has permission) Create new status:
       key: "banana"
       name: "Banana"
       category: IN_PROGRESS (must pick a category)
```

---

## Benefits of This Approach

| Aspect                  | Current System                       | Jira-Style                             |
| ----------------------- | ------------------------------------ | -------------------------------------- |
| Ticket stores           | `column: 98` (FK to Column)          | `status: "in_review"` (FK to Status)   |
| Cross-project reporting | Impossible (columns are per-project) | Easy (statuses are global)             |
| AI understanding        | Poor (`column: 43` means nothing)    | Excellent (`status: "done"`)           |
| Multiple boards         | Not supported                        | Easy (each board has column config)    |
| Custom workflows        | Limited                              | Full support via status mapping        |
| Consistency             | Each project reinvents columns       | Standard statuses, custom column names |

---

## Migration Path

### Phase 1: Add Status Model

1. Create `Status` model with default statuses
2. Create `BoardColumn` model
3. Add `status` FK to Ticket (keep old `column` temporarily)
4. Migrate: Set ticket.status based on ticket.column.name

### Phase 2: Create Board Configs

1. For each project, create BoardColumns from existing Columns
2. Map each BoardColumn to appropriate Status
3. Verify all tickets appear correctly

### Phase 3: Update Frontend

1. Update types to use new structure
2. Fetch statuses and board config
3. Update KanbanBoard to use status-based grouping
4. Update move logic to change status

### Phase 4: Cleanup

1. Remove old `Column` model
2. Remove `column` FK from Ticket
3. Remove `TicketPosition` model

---

## Implementation Checklist

### Backend

- [ ] Create `Status` model with key, name, category
- [ ] Create `BoardColumn` model with status mapping
- [ ] Add migration with default statuses
- [ ] Add `status` FK to Ticket model
- [ ] Create StatusSerializer
- [ ] Create BoardColumnSerializer
- [ ] Update TicketSerializer for status fields
- [ ] Add API endpoint: GET /api/statuses/
- [ ] Add API endpoint: GET /api/projects/{id}/board/
- [ ] Add signal to create default BoardColumns on project creation
- [ ] Add LexoRank field and helpers

### Frontend

- [ ] Add Status and BoardColumn types
- [ ] Fetch statuses on app load
- [ ] Fetch board config per project
- [ ] Update KanbanBoard to group by column→statuses
- [ ] Update drag-drop to change ticket.status
- [ ] Add column configuration UI (map statuses)
- [ ] Add status selector in ticket modal

### Admin

- [ ] Add Status admin interface
- [ ] Add ability to create new statuses
- [ ] Add BoardColumn configuration UI
