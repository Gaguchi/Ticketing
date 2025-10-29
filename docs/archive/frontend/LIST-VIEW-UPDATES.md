# List View Updates - Issue Type Icons

## Overview

Updated the table/list view to display Font Awesome icons for issue types, matching the kanban board implementation.

## Changes Made

### 1. Added Font Awesome Imports

```tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faBug,
  faBookmark,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
```

### 2. Added getTypeIcon Helper Function

Same implementation as in TicketCard component:

```tsx
const getTypeIcon = (type?: string) => {
  switch (type) {
    case "task":
      return { icon: faCheckSquare, color: "#4bade8" };
    case "bug":
      return { icon: faBug, color: "#e5493a" };
    case "story":
      return { icon: faBookmark, color: "#63ba3c" };
    case "epic":
      return { icon: faBolt, color: "#904ee2" };
    default:
      return { icon: faCheckSquare, color: "#4bade8" };
  }
};
```

### 3. Updated Table Columns - Jira-Style Merged Cell

#### New "Work" Column (Replaces Type, ID, and Title)

Following Jira's design pattern, the Type, ID, and Title are merged into a single "Work" column:

- **Position**: First column
- **Width**: 400px
- **Layout**: Horizontal flex with icon, ID link, and title
- **Structure**: `[Icon] [#123] [Title text...]`

```tsx
{
  title: "Work",
  key: "work",
  width: 400,
  render: (_: any, record: Ticket) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {/* Type Icon */}
      <FontAwesomeIcon
        icon={getTypeIcon(record.type).icon}
        style={{
          fontSize: "16px",
          color: getTypeIcon(record.type).color,
          flexShrink: 0,
        }}
      />
      {/* Issue ID Link */}
      <a
        href={`#/ticket/${record.id}`}
        style={{
          color: "#0052cc",
          textDecoration: "none",
          fontWeight: 500,
          fontSize: "14px",
          flexShrink: 0,
        }}
      >
        #{record.id}
      </a>
      {/* Issue Title */}
      <span style={{ color: "#172b4d", fontSize: "14px" }}>
        {record.name}
      </span>
    </div>
  ),
}
```

**Key Design Elements:**

- **Icon**: 16px, colored, non-shrinking
- **ID Link**: #0052cc (Jira blue), clickable, medium weight, non-shrinking
- **Title**: #172b4d (Jira text), normal weight, can wrap/truncate
- **Gap**: 8px spacing between elements
- **Alignment**: Vertically centered

## Table Column Order

| Column     | Width | Description                           |
| ---------- | ----- | ------------------------------------- |
| **Work**   | 400px | **Merged cell**: Icon + ID + Title    |
| Customer   | 180px | Customer name                         |
| Status     | 120px | Status tag (New, In Progress, etc.)   |
| Priority   | 100px | Priority icon (↑, →, ↓)               |
| Urgency    | 100px | Urgency tag (High, Normal, Low)       |
| Importance | 120px | Importance tag (Critical, High, etc.) |
| Created    | 120px | Creation date                         |

### Work Column Layout

```
┌─────────────────────────────────────────────┐
│ [🔲] [#123] Fix the internet duration logic │
└─────────────────────────────────────────────┘
  Icon  ID    Title (can wrap)
```

## Visual Consistency

### Icon Colors (Same as Kanban)

- **Task**: #4bade8 (blue)
- **Bug**: #e5493a (red)
- **Story**: #63ba3c (green)
- **Epic**: #904ee2 (purple)

### Icon Sizes

- **Kanban Card**: 14px (compact metadata)
- **Table Work Cell**: 16px (better visibility in merged cell)

### ID Styling

- **Color**: #0052cc (Jira link blue)
- **Font Weight**: 500 (medium)
- **Format**: # prefix
- **Interactive**: Clickable link to ticket detail

### Title Styling

- **Color**: #172b4d (Jira text color)
- **Font Size**: 14px
- **Wrapping**: Can wrap if needed (no truncation)

## Benefits

### ✅ Quick Identification

- Scan issue types at a glance in table view
- Color coding helps identify patterns
- Icons are universally recognizable

### ✅ Consistency

- Matches kanban board implementation
- Same color scheme across views
- Unified user experience

### ✅ Professional Appearance

- Clean, Jira-style design
- Proper spacing and alignment
- Enterprise-grade aesthetics

## View Comparison

### Kanban View (Card)

```
┌─────────────────────────────┐
│ Title here...               │
│ [🔲 #123] [👁] [💬]  [⬆] [👤]│
└─────────────────────────────┘
```

### List View (Merged Cell - Jira Style)

```
| [🔲] [#123] Fix the internet duration logic | Customer | Status | Priority | ... |
  ↑     ↑      ↑
  Icon  ID     Title (all in one cell)
```

## Future Enhancements

### Planned Features

1. **Sortable Type Column**: Click to sort by issue type
2. **Type Filter**: Filter table by specific issue types
3. **Type Grouping**: Group rows by issue type
4. **Type Legend**: Tooltip showing type name on hover
5. **Bulk Type Change**: Select multiple rows and change type
6. **Type Statistics**: Show count per type in table header

### UI Improvements

1. **Row Hover**: Highlight type icon on row hover
2. **Clickable Icons**: Click icon to filter by that type
3. **Custom Sorting**: Sort by type priority (bug > task > story > epic)
4. **Compact Mode**: Toggle for smaller icons (12px)

---

**Result**: Professional table view with colored Font Awesome icons for issue types, matching the kanban board design and providing quick visual identification in list format.
