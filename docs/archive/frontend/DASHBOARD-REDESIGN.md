# Dashboard Redesign - Filter Boxes System

## Overview

Complete redesign of the Dashboard page following Jira's design principles with a custom filtering system featuring collapsible filter boxes and a full ticket list.

## Design Principles

Following the same principles from the Tickets page:

1. **Jira-style colors**: #172b4d (text), #5e6c84 (secondary), #f4f5f7 (backgrounds)
2. **Clean borders**: 1px solid #dfe1e6
3. **Minimal rounded corners**: 3px border-radius
4. **Professional spacing**: Consistent padding and gaps
5. **Font Awesome icons**: Color-coded issue types

## Features

### 1. Quick Filter Boxes

#### Purpose

Custom filtering system that displays filtered ticket lists in compact,expandable boxes.

#### Default Filter Boxes

| Filter            | Description                       | Color   | Badge Color |
| ----------------- | --------------------------------- | ------- | ----------- |
| Unassigned        | Tickets with no assignees         | #ff4d4f | Red         |
| Assigned to Me    | Tickets assigned to current user  | #1890ff | Blue        |
| In Progress       | Tickets with "In Progress" status | #fa8c16 | Orange      |
| New               | Tickets with "New" status         | #52c41a | Green       |
| Critical Priority | Tickets with priority level 4     | #e5493a | Red         |

#### Box States

**Collapsed (Default)**:

- Shows badge with count
- Filter title
- First 3 tickets (minimal info: icon + ID + title)
- "+X more..." indicator if > 3 tickets
- Right arrow icon
- Hover: Border changes to filter color + subtle shadow

**Expanded (On Click)**:

- Rotated arrow (90deg)
- "View full list →" link to filtered Tickets page
- Full table with all columns
- All filtered tickets visible
- Same hover effects

#### Layout

```
┌──────────────────────────────────────┐
│ [🔴 4] Unassigned            [→]     │  ← Header
│ ────────────────────────────────────│
│ [🔲] #1 Website homepage not...      │  ← Ticket 1
│ [🐛] #3 Fix typo in user...          │  ← Ticket 2
│ [🐛] #6 Cannot login with SSO...     │  ← Ticket 3
│ +1 more...                           │  ← More indicator
└──────────────────────────────────────┘
```

#### Grid Layout

- Responsive grid: `repeat(auto-fill, minmax(240px, 1fr))`
- Gap: 12px
- Minimum box width: 240px
- Boxes grow to fill available space

### 2. All Tickets Section

#### Purpose

Full searchable list of all tickets with the same table format as Tickets page.

#### Components

- **Header**: "All Tickets" title + Search input (right-aligned)
- **Search**: 240px width, background #fff, icon prefix
- **Table**: Same columns as Tickets page (Work, Customer, Status, etc.)
- **Pagination**: 10 per page, size changer, total count display

#### Table Columns

1. **Work** (400px): Merged cell with icon + ID + title
2. **Customer** (180px)
3. **Status** (120px): Colored tags
4. **Priority** (100px): Priority icons (↑→↓)
5. **Urgency** (100px): Colored tags
6. **Importance** (120px): Colored tags
7. **Created** (120px): Date

## Implementation

### Component Structure

```tsx
Dashboard
├── Header (title "Dashboard")
├── Content Container (#f4f5f7 background)
│   ├── Quick Filters Section
│   │   ├── Section Title
│   │   └── Filter Boxes Grid
│   │       ├── FilterBox (Unassigned)
│   │       ├── FilterBox (Assigned to Me)
│   │       ├── FilterBox (In Progress)
│   │       ├── FilterBox (New)
│   │       └── FilterBox (Critical Priority)
│   └── All Tickets Section
│       ├── Section Header (title + search)
│       └── Table (with pagination)
```

### State Management

```tsx
const [searchText, setSearchText] = useState("");
const [expandedBox, setExpandedBox] = useState<string | null>(null);
```

### Filter Logic

```tsx
interface FilterBox {
  id: string;
  title: string;
  filter: (ticket: Ticket) => boolean;
  color: string;
}

// Example filter
{
  id: "unassigned",
  title: "Unassigned",
  filter: (ticket) => !ticket.assigneeIds || ticket.assigneeIds.length === 0,
  color: "#ff4d4f",
}
```

### Interactions

#### Filter Box Click

- Toggles expanded state
- Only one box expanded at a time
- Arrow rotates 90deg
- Table appears below header

#### Search Input

- Filters "All Tickets" table
- Case-insensitive
- Searches ticket titles
- Updates table in real-time

#### "View full list →" Link

- Navigates to Tickets page with filter parameter
- URL format: `#/tickets?filter={boxId}`
- Opens full view with all filters/features

#### Hover Effects

- **Filter Box**: Border color changes + shadow
- **Table Rows**: Standard Ant Design hover
- **Links**: Blue hover state

## Styling Details

### Colors

```css
--background: #f4f5f7
--card-bg: #fff
--border: #dfe1e6
--text-primary: #172b4d
--text-secondary: #5e6c84
--link-blue: #0052cc

/* Filter Colors */
--unassigned-red: #ff4d4f
--assigned-blue: #1890ff
--inprogress-orange: #fa8c16
--new-green: #52c41a
--critical-red: #e5493a
```

### Typography

```css
/* Page Title */
font-size: 16px
font-weight: 600

/* Section Titles */
font-size: 14px
font-weight: 600
color: #172b4d

/* Filter Box Title */
font-size: 14px
font-weight: 600

/* Ticket Text (Collapsed) */
font-size: 12px
color: #172b4d

/* Badge */
font-size: 12px
font-weight: 600
```

### Spacing

```css
/* Page Padding */
padding: 20px

/* Section Margin */
margin-bottom: 24px

/* Filter Box Padding */
padding: 12px

/* Grid Gap */
gap: 12px

/* Element Gaps */
gap: 6px (collapsed tickets)
gap: 8px (badge + title)
```

### Transitions

```css
/* Border + Shadow */
transition: all 0.2s

/* Arrow Rotation */
transition: transform 0.2s
```

## Usage Scenarios

### Scenario 1: Unassigned Tickets

**User Story**: As an admin, I want to quickly see all unassigned tickets so I can assign them.

**Flow**:

1. Dashboard loads
2. "Unassigned" filter box shows red badge with count
3. First 3 unassigned tickets visible
4. Click box to expand and see full details
5. Click "View full list →" for advanced actions

### Scenario 2: My Work

**User Story**: As an agent, I want to see all tickets assigned to me.

**Flow**:

1. Dashboard loads
2. "Assigned to Me" filter box shows blue badge with count
3. Shows my tickets (icon + ID + title)
4. Expand to see priorities, due dates, etc.
5. Click ticket ID to open detail

### Scenario 3: Status Monitoring

**User Story**: As a manager, I want to monitor tickets in progress.

**Flow**:

1. Dashboard loads
2. "In Progress" filter box shows orange badge with count
3. Quick glance at current work
4. Expand for full table with team assignments
5. Search in "All Tickets" for specific items

## Benefits

### ✅ Quick Overview

- See filtered counts at a glance
- Multiple filter perspectives simultaneously
- Color-coded for instant recognition

### ✅ Drill-Down Capability

- Start with minimal info (collapsed)
- Expand for full details
- Link to complete filter view

### ✅ Personalization

- Users can focus on relevant filters
- "Assigned to Me" for personal workflow
- Status filters for team management

### ✅ Consistency

- Same table format as Tickets page
- Same icon system
- Same Jira-style design

### ✅ Performance

- Only render expanded table when needed
- Pagination for large lists
- Efficient filtering logic

## Future Enhancements

### Custom Filters

- Allow users to create custom filter boxes
- Save filter preferences
- Drag-and-drop to reorder boxes
- Show/hide specific boxes

### Advanced Features

- Real-time updates (WebSocket)
- Notification badges for new tickets
- Quick actions in collapsed view (assign, close)
- Time-based filters (today, this week, overdue)

### Analytics

- Trend indicators (↑ increase, ↓ decrease)
- Sparkline charts in boxes
- SLA compliance indicators
- Response time metrics

---

**Result**: Professional dashboard with custom filter boxes providing quick overview and drill-down capabilities, following Jira's clean design principles.
