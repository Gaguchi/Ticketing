# Column System Revamp Plan

## Jira Database Schema Analysis

Based on analysis of Jira's actual database schema, here's how Jira handles issues and workflow:

### Jira's Core Tables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JIRA DATABASE SCHEMA                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  jiraissue (main issue table)                                               │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ ID              - Primary key (decimal)                             │     │
│  │ pkey            - Issue key "PROJ-123"                              │     │
│  │ issuenum        - Issue number within project (1, 2, 3...)          │     │
│  │ PROJECT         - FK to project.id                                  │     │
│  │ issuetype       - FK to issuetype.id (Task, Bug, Story, Epic)       │     │
│  │ issuestatus     - FK to issuestatus.id (Open, In Progress, Done)    │     │
│  │ PRIORITY        - FK to priority.id                                 │     │
│  │ REPORTER        - Username string                                   │     │
│  │ ASSIGNEE        - Username string                                   │     │
│  │ WORKFLOW_ID     - FK to OS_WFENTRY.id (workflow instance)           │     │
│  │ SUMMARY         - Title (varchar 255)                               │     │
│  │ DESCRIPTION     - Full description (longtext)                       │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  issuestatus (GLOBAL, not per-project)                                      │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ id      - 1, 3, 6, etc.                                             │     │
│  │ pname   - "Open", "In Progress", "Closed"                           │     │
│  │ sequence - Display order                                            │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  OS_WFENTRY (workflow instance - links issue to workflow)                   │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ ID      - Workflow entry ID                                         │     │
│  │ NAME    - Workflow name ("jira" = default)                          │     │
│  │ STATE   - Current state                                             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  OS_CURRENTSTEP (current position in workflow)                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ ENTRY_ID - FK to OS_WFENTRY.ID                                      │     │
│  │ STEP_ID  - Current step number in workflow                          │     │
│  │ STATUS   - "Open", "Underway", "Closed" (step-specific status)      │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Jira Design Decisions

1. **Statuses are GLOBAL, not per-project**

   - `issuestatus` table is shared across all projects
   - Status has: `id`, `pname` (name), `sequence` (order)
   - Examples: id=1 "Open", id=3 "In Progress", id=6 "Closed"

2. **Workflow is SEPARATE from status**

   - `issuestatus` = What state the issue is in
   - `OS_WFENTRY` + `OS_CURRENTSTEP` = What transitions are available
   - This allows different projects to have different workflows with same statuses

3. **Issue stores status directly**

   - `jiraissue.issuestatus` directly references `issuestatus.id`
   - No intermediate "column" table for Kanban position

4. **Ordering is NOT stored in the issue table**
   - Jira's Kanban board ordering is handled separately (in Jira Agile/Software)
   - The "rank" field for ordering is stored as a custom field or agile-specific table

### What This Means for Our App

Jira separates **two concepts we've merged**:

- **Status** = Logical state of the issue (Open, In Progress, Done)
- **Board Column** = Visual grouping on a Kanban board (can map to statuses)

Our `Column` model is trying to do both, which adds complexity.

---

## Problem Analysis

### Current State: Confusing Column IDs

The current column system uses **database auto-increment IDs** which leads to:

```
Project A: column id=35 "To Do", id=43 "In Progress", id=98 "Done"
Project B: column id=102 "Backlog", id=103 "To Do", id=104 "Done"
```

**Issues:**

1. **Unintuitive IDs** - No semantic meaning, hard to understand at a glance
2. **Cross-project confusion** - Column ID 35 in Project A means nothing in Project B
3. **AI/API confusion** - AI agents can't reason about "move to column 43" without context
4. **Debugging nightmare** - Logs show `column_id=98` instead of `column=Done`
5. **Frontend complexity** - Must map IDs to names everywhere

### Data Flow Complexity

```
Ticket (column=98)
  → API fetches Column(id=98)
    → Frontend maps `column-98`
      → Kanban groups by `column-98`
        → On move, parses back to 98
          → Sends PATCH with column=98
```

The column ID is passed around as a number everywhere, requiring constant lookups.

---

## Jira-Inspired Solution: Status + Board Separation

Based on Jira's proven architecture, we can simplify by separating concerns:

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEW SIMPLIFIED SCHEMA                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Status (GLOBAL - shared across all projects)                               │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ key         - "todo", "in_progress", "review", "done" (unique)      │     │
│  │ name        - "To Do", "In Progress", "Review", "Done"              │     │
│  │ category    - "todo" | "in_progress" | "done" (for reporting)       │     │
│  │ color       - "#0052cc"                                             │     │
│  │ order       - Default display order                                 │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  Ticket (references status by key, not ID)                                  │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ id          - Primary key                                           │     │
│  │ project     - FK to Project                                         │     │
│  │ status      - "todo", "in_progress", "done" (status key)            │     │
│  │ rank        - LexoRank string for ordering "aaa|bbb|ccc"            │     │
│  │ ...other fields                                                     │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ProjectBoardConfig (optional - per-project column customization)           │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ project     - FK to Project                                         │     │
│  │ status_key  - "todo", "in_progress", etc.                           │     │
│  │ visible     - Boolean (hide columns per project)                    │     │
│  │ order       - Override default order for this project               │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Works

1. **Status keys are semantic**: `"done"` not `98`
2. **Global statuses**: No per-project column ID confusion
3. **Simple ticket reference**: `ticket.status = "in_progress"`
4. **Optional customization**: Projects can hide/reorder columns if needed
5. **AI-friendly**: `PATCH {status: "done"}` is self-documenting

### Status Enum Approach (Simplest)

For maximum simplicity, use an enum instead of a separate table:

```python
class TicketStatus(models.TextChoices):
    TODO = 'todo', 'To Do'
    IN_PROGRESS = 'in_progress', 'In Progress'
    REVIEW = 'review', 'Review'
    DONE = 'done', 'Done'

class Ticket(models.Model):
    status = models.CharField(
        max_length=20,
        choices=TicketStatus.choices,
        default=TicketStatus.TODO
    )
    rank = models.CharField(max_length=50, default='')  # LexoRank for ordering
```

**Frontend becomes trivial:**

```typescript
// Group tickets by status - no ID mapping needed!
const ticketsByStatus = {
  todo: tickets.filter((t) => t.status === "todo"),
  in_progress: tickets.filter((t) => t.status === "in_progress"),
  review: tickets.filter((t) => t.status === "review"),
  done: tickets.filter((t) => t.status === "done"),
};
```

---

## Proposed Solution: Semantic Column Keys

### Option A: Project-Scoped Slug Keys (Recommended)

Replace numeric IDs with **semantic slug-based keys** per project:

```python
# Backend Model
class Column(models.Model):
    key = models.CharField(max_length=50)  # e.g., "todo", "in_progress", "done"
    name = models.CharField(max_length=100)  # Display name: "To Do", "In Progress", "Done"
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)

    class Meta:
        unique_together = [['project', 'key']]  # Key unique per project
```

**Column references become:**

```
ticket.column = "todo"           # Instead of 35
ticket.column_key = "done"       # Semantic and readable
```

**API examples:**

```json
// GET /api/tickets/123/
{
  "id": 123,
  "name": "Fix login bug",
  "column": "in_progress",       // Human-readable key
  "column_name": "In Progress",  // Display name (can differ)
  "column_order": 2
}

// PATCH /api/tickets/123/
{
  "column": "done"               // Move ticket to Done column
}
```

**Frontend simplification:**

```typescript
// Before: Confusing numeric IDs
ticketsByColumn["column-98"] = [...]
onTicketMove(ticketId, 98, order)  // What is 98??

// After: Semantic keys
ticketsByColumn["done"] = [...]
onTicketMove(ticketId, "done", order)  // Crystal clear
```

---

### Option B: Enum-Based Default Columns + Custom

Use predefined column types with optional custom columns:

```python
class ColumnType(models.TextChoices):
    BACKLOG = 'backlog', 'Backlog'
    TODO = 'todo', 'To Do'
    IN_PROGRESS = 'in_progress', 'In Progress'
    REVIEW = 'review', 'Review'
    TESTING = 'testing', 'Testing'
    DONE = 'done', 'Done'
    CUSTOM = 'custom', 'Custom'

class Column(models.Model):
    column_type = models.CharField(max_length=20, choices=ColumnType.choices)
    custom_name = models.CharField(max_length=100, blank=True)  # For CUSTOM type
    project = models.ForeignKey(Project, on_delete=models.CASCADE)

    @property
    def key(self):
        return self.column_type  # 'todo', 'in_progress', 'done'
```

**Pros:** Standardized workflow stages, easier analytics
**Cons:** Less flexible for custom workflows

---

## Recommended Approach: Option A (Semantic Keys)

### Migration Path

#### Phase 1: Backend Changes

1. **Add `key` field to Column model:**

```python
class Column(models.Model):
    key = models.SlugField(max_length=50)  # New field
    name = models.CharField(max_length=100)
    # ... existing fields

    class Meta:
        unique_together = [['project', 'key']]
```

2. **Auto-generate keys for existing columns:**

```python
# Migration
def generate_column_keys(apps, schema_editor):
    Column = apps.get_model('tickets', 'Column')
    for column in Column.objects.all():
        # Generate slug from name: "To Do" → "to_do", "In Progress" → "in_progress"
        from django.utils.text import slugify
        base_key = slugify(column.name).replace('-', '_')

        # Ensure uniqueness within project
        key = base_key
        counter = 1
        while Column.objects.filter(project=column.project, key=key).exclude(id=column.id).exists():
            key = f"{base_key}_{counter}"
            counter += 1
        column.key = key
        column.save()
```

3. **Update Ticket model to reference by key:**

```python
class Ticket(models.Model):
    # Keep column FK for data integrity
    column = models.ForeignKey(Column, on_delete=models.CASCADE)
    column_order = models.IntegerField(default=0)
```

4. **Update serializers to expose key:**

```python
class TicketSerializer(serializers.ModelSerializer):
    column_key = serializers.CharField(source='column.key', read_only=True)
    column_name = serializers.CharField(source='column.name', read_only=True)

    # Allow setting column by key in requests
    column = serializers.SlugRelatedField(
        slug_field='key',
        queryset=Column.objects.all()
    )
```

#### Phase 2: Frontend Changes

1. **Update types:**

```typescript
interface Ticket {
  column: string; // Now a key like "todo", "in_progress"
  column_key: string; // Same as column (for explicit access)
  column_name: string; // Display name: "To Do"
  column_order: number;
}

interface Column {
  key: string; // "todo", "in_progress", "done"
  name: string; // "To Do", "In Progress", "Done"
  order: number;
  color: string;
}
```

2. **Simplify KanbanBoard:**

```typescript
// Group by semantic key instead of `column-${id}`
const ticketsByColumn = useMemo(() => {
  const grouped: Record<string, string[]> = {};

  columns.forEach((col) => {
    grouped[col.key] = []; // "todo", "in_progress", "done"
  });

  tickets.forEach((ticket) => {
    if (grouped[ticket.column]) {
      grouped[ticket.column].push(`ticket-${ticket.id}`);
    }
  });

  return grouped;
}, [tickets, columns]);
```

3. **Simplify drag-drop:**

```typescript
// Before
const newColumnId = parseInt(destContainer.replace("column-", ""));
onTicketMove(ticketId, newColumnId, dropPosition, oldColumnId);

// After
const newColumnKey = destContainer; // Just "done", no parsing
onTicketMove(ticketId, newColumnKey, dropPosition, oldColumnKey);
```

---

## Additional Simplifications

### 1. Remove `TicketPosition` Model

The `TicketPosition` model adds complexity:

- Ticket already has `column` and `column_order`
- TicketPosition duplicates this data
- Two sources of truth causes sync issues

**Recommendation:** Remove TicketPosition, use Ticket.column_order directly.

### 2. Simplify Column Order Logic with LexoRank

Current approach: Integer shifts with complex lock ordering

**Why Integers Are Problematic:**

```python
# Current: Moving ticket from pos 5 to pos 2 requires:
# 1. Lock all tickets in column
# 2. Shift tickets at pos 2,3,4 up by 1
# 3. Update moved ticket to pos 2
# Result: 4 database writes, potential deadlocks

column_order = 1, 2, 3, 4, 5  # Dense integers
# Move 5 → 2: Update 4 records
```

**LexoRank Solution (Jira's Approach):**

```python
# LexoRank: Insert between any two without shifting others
rank = "aaa", "aac", "aae", "aag"  # Sparse strings

# Insert between "aac" and "aae" → "aad"
# Result: 1 database write, no locks needed

class Ticket(models.Model):
    rank = models.CharField(max_length=50, db_index=True)

    @staticmethod
    def calculate_rank_between(before: str, after: str) -> str:
        """Calculate a rank string that sorts between before and after"""
        # Simple implementation: find midpoint
        if not before:
            return 'a' + after[:1] if after else 'n'  # Start of list
        if not after:
            return before + 'n'  # End of list

        # Find first differing character and insert between
        # Full LexoRank algorithm handles edge cases
        ...
```

**Benefits:**

- No shifting other tickets on move
- No locks needed (only update 1 record)
- O(1) instead of O(n) database operations
- Eliminates deadlock risk entirely

### 3. Default Statuses (Global, Not Per-Project)

Unlike current per-project columns, use global statuses:

```python
# models.py
class TicketStatus(models.TextChoices):
    TODO = 'todo', 'To Do'
    IN_PROGRESS = 'in_progress', 'In Progress'
    REVIEW = 'review', 'Review'
    DONE = 'done', 'Done'

class Ticket(models.Model):
    # Replace column FK with simple status choice
    status = models.CharField(
        max_length=20,
        choices=TicketStatus.choices,
        default=TicketStatus.TODO,
        db_index=True
    )
    rank = models.CharField(max_length=50, default='n', db_index=True)
```

**No signals needed** - statuses are built into the code, not database records.

---

## Final Recommendation: Hybrid Approach

Combine Jira's patterns with your flexibility needs:

### Phase 1: Add Status Enum + LexoRank (Quick Win)

```python
class Ticket(models.Model):
    # Keep column FK for now (backward compat)
    column = models.ForeignKey(Column, on_delete=models.CASCADE)

    # Add new fields
    status = models.CharField(max_length=20, choices=TicketStatus.choices)
    rank = models.CharField(max_length=50, default='n')

    def save(self, *args, **kwargs):
        # Sync status from column.key for transition period
        if self.column:
            self.status = self.column.key
        super().save(*args, **kwargs)
```

### Phase 2: Remove Column FK (After Migration)

Once all code uses `status` and `rank`:

1. Remove `Column` model entirely (or keep for custom workflows)
2. Remove `column` FK from Ticket
3. Ticket only has `status` (string) and `rank` (string)

### Phase 3: Optional Custom Columns

If projects need custom columns beyond defaults:

```python
class BoardColumn(models.Model):
    """Optional per-project column customization"""
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=TicketStatus.choices)
    display_name = models.CharField(max_length=100)  # Override display
    order = models.IntegerField()
    visible = models.BooleanField(default=True)
```

---

## Comparison Summary

| Aspect              | Current        | Option A (Keys)       | Jira-Style (Status Enum) |
| ------------------- | -------------- | --------------------- | ------------------------ |
| Ticket.column       | `98` (FK)      | `"done"` (key lookup) | `"done"` (enum)          |
| Database            | Column table   | Column table + key    | No table needed          |
| Per-project columns | ✅ Yes         | ✅ Yes                | ❌ No (global)           |
| Ordering            | Integer shifts | Integer shifts        | LexoRank (no shifts)     |
| AI/Debug clarity    | Poor           | Good                  | Excellent                |
| Complexity          | High           | Medium                | Low                      |
| Migration effort    | N/A            | Medium                | Higher                   |

**Recommendation:** Start with **Status Enum + LexoRank** for immediate wins, add custom columns later if needed.

---

## Implementation Checklist

### Phase 1: Backend (Status + LexoRank)

- [ ] Add `TicketStatus` enum to models
- [ ] Add `status` field to Ticket model
- [ ] Add `rank` field to Ticket model
- [ ] Create migration to populate status from column.name
- [ ] Update TicketSerializer to expose `status`
- [ ] Implement LexoRank calculation helper
- [ ] Update move logic to use LexoRank (no integer shifts)

### Phase 2: Frontend

- [ ] Update `Ticket` type: add `status: string`, add `rank: string`
- [ ] Update KanbanBoard to group by `ticket.status`
- [ ] Remove `column-${id}` string manipulation
- [ ] Update drag-drop to send `{status: "done", rank: "aab"}`
- [ ] Remove TicketPosition model references

### Phase 3: Cleanup

- [ ] Deprecate `column` field in API responses
- [ ] Remove Column model (or repurpose for workflows)
- [ ] Remove TicketPosition model
- [ ] Update all filters to use status

---

## LexoRank Implementation Guide

```python
# utils/lexorank.py
import string

ALPHABET = string.ascii_lowercase  # 'a' to 'z'
MID = 'n'  # Middle of alphabet

def rank_between(before: str | None, after: str | None) -> str:
    """
    Calculate a rank string that sorts between `before` and `after`.

    Examples:
        rank_between(None, 'n') → 'g'      # Before first item
        rank_between('n', None) → 'u'      # After last item
        rank_between('g', 'n') → 'j'       # Between two items
        rank_between('g', 'h') → 'gn'      # Need more precision
    """
    if not before and not after:
        return MID

    if not before:
        # Insert at start
        first_char = after[0]
        if first_char > 'a':
            return chr(ord(first_char) - 1)
        return 'a' + rank_between(None, after[1:] if len(after) > 1 else None)

    if not after:
        # Insert at end
        last_char = before[-1]
        if last_char < 'z':
            return before[:-1] + chr(ord(last_char) + 1)
        return before + MID

    # Insert between
    if before >= after:
        raise ValueError(f"before ({before}) must be < after ({after})")

    # Find midpoint character by character
    for i in range(max(len(before), len(after))):
        b = before[i] if i < len(before) else 'a'
        a = after[i] if i < len(after) else 'z'

        if ord(a) - ord(b) > 1:
            # Room to insert between
            mid_char = chr((ord(a) + ord(b)) // 2)
            return (before[:i] if i < len(before) else '') + mid_char

    # No room - extend with midpoint
    return before + MID


# Usage in view
def move_ticket(ticket, target_status, before_ticket=None, after_ticket=None):
    """Move ticket to new status at specific position"""
    before_rank = before_ticket.rank if before_ticket else None
    after_rank = after_ticket.rank if after_ticket else None

    ticket.status = target_status
    ticket.rank = rank_between(before_rank, after_rank)
    ticket.save(update_fields=['status', 'rank'])
    # Done! No shifting, no locks, no deadlocks
```

---

## Rollback Strategy

1. Keep `column` FK during transition (data integrity)
2. New `status` and `rank` fields are additive
3. Frontend can use either field during migration
4. If issues: revert frontend, new fields unused but harmless

---

## Expected Outcomes

1. **Readable everywhere:** `status: "done"` instead of `column: 98`
2. **Self-documenting API:** `{"status": "in_progress"}` needs no lookup
3. **AI-friendly:** Agents understand `move to done` immediately
4. **No deadlocks:** LexoRank eliminates shifting and locking
5. **Faster moves:** O(1) database operations instead of O(n)
6. **Simpler code:** ~60% reduction in KanbanBoard complexity
