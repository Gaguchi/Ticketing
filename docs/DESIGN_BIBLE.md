# Ticketing System - Design Bible

> **Design Philosophy**: Professional, utilitarian minimalism with a unique identity. Data-first, compact, and efficient without sacrificing clarity or aesthetics.

---

## Core Principles

### 1. **Minimalist Utilitarianism**

- **Data First**: Information density is key. Show what matters, hide what doesn't.
- **No Decorative Elements**: Every pixel serves a purpose.
- **Compact & Efficient**: Users should see maximum relevant data without scrolling.
- **Clean Hierarchy**: Clear visual distinction between primary, secondary, and tertiary information.

### 2. **Professional Corporate Identity**

- **Muted & Sophisticated**: Avoid bright, playful colors. Opt for refined, business-appropriate tones.
- **Predictability Avoided**: Break away from generic blue-heavy admin panels.
- **Unique but Familiar**: Professional users should feel confident, not confused.

### 3. **Human Touch**

- **Avoid LLM Trappings**: No formulaic 4-card stat rows, no generic empty states.
- **Contextual Information**: Stats appear inline where relevant, not in dedicated dashboard widgets.
- **Progressive Disclosure**: Show details on-demand via modals/popovers, not upfront.

---

## Color System

### Primary Palette

```
Brand Primary:     #2C3E50  (Slate Blue-Gray) - Headers, primary actions
Brand Secondary:   #34495E  (Dark Gray-Blue)  - Subtle backgrounds
Accent:            #E67E22  (Burnt Orange)     - Selective highlights, CTAs
```

### Neutrals (Muted Grayscale)

```
Gray 900: #1A1A1A  (Near Black)     - Primary text
Gray 700: #4A4A4A  (Dark Gray)      - Secondary text
Gray 500: #9E9E9E  (Medium Gray)    - Tertiary text, icons
Gray 300: #E0E0E0  (Light Gray)     - Borders, dividers
Gray 100: #F5F5F5  (Off-White)      - Subtle backgrounds
White:    #FFFFFF  (Pure White)     - Primary backgrounds
```

### Semantic Colors (Reserved for System States)

```
Success:  #27AE60  (Muted Green)    - Success states only
Warning:  #F39C12  (Amber)          - Warnings, attention needed
Error:    #E74C3C  (Muted Red)      - Errors, destructive actions
Info:     #3498DB  (Steel Blue)     - Informational messages (minimal use)
```

### Color Usage Rules

- **NO color-coded filters/categories** (use text labels + icons)
- **NO rainbow statistics** (use consistent gray tones)
- **Semantic colors ONLY for system feedback** (warnings, errors, success confirmations)
- **Accent color sparingly** (primary CTAs, selected states, critical highlights)

---

## Typography

### Font Family

```css
font-family: "Inter", "BPG Arial", -apple-system, BlinkMacSystemFont, "Segoe UI",
  sans-serif;
```

**Rationale**:

- **Inter**: Modern, professional, excellent readability at all sizes
- **BPG Arial**: Georgian script support (fallback for ქართული)
- System fonts as final fallback

### Type Scale (Pronounced Hierarchy)

```
Display:    32px / 40px line-height  - Page titles (rare use)
H1:         24px / 32px              - Section headers
H2:         18px / 28px              - Card titles, modal headers
H3:         16px / 24px              - Subsection headers
Body:       14px / 22px              - Default text
Small:      12px / 18px              - Meta info, timestamps
Tiny:       11px / 16px              - Table captions, footnotes
```

### Font Weights

```
Regular: 400  - Body text
Medium:  500  - Emphasis, labels
Semibold: 600 - Headers, important data
Bold:    700  - Reserved for critical emphasis only
```

### Typography Rules

- **Headers use Semibold (600)**, not Bold
- **Data values use Medium (500)** for emphasis
- **No italic** unless for timestamps/metadata
- **Monospace for codes**: Ticket IDs, project keys (e.g., `TICK-123`)

---

## Spacing & Layout

### Compact Density Philosophy

```
Base Unit: 4px (all spacing in 4px increments)

Micro:   4px   - Inline elements
Small:   8px   - Related groups
Medium:  12px  - Component internal padding
Large:   16px  - Section padding
XLarge:  24px  - Page padding
XXLarge: 32px  - Major section breaks (rare)
```

### Layout Principles

- **24px page padding** (not 32px+ - too spacious)
- **12px card padding** (compact, not cramped)
- **8px gaps** between related items
- **16px between sections**

### Grid System

- **Fluid layouts** preferred over fixed widths
- **Max-width: 1400px** for content (prevents ultra-wide screens from looking sparse)
- **Responsive breakpoints**:
  - Mobile: < 768px
  - Tablet: 768-1024px
  - Desktop: > 1024px

---

## Components & Patterns

### Cards

**Style**: Subtle elevation (2-4px shadow)

```css
background: #ffffff;
border: 1px solid #e0e0e0;
border-radius: 6px;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
```

**Usage**:

- **List items** that open modals on click
- **Grouped content** (forms, settings sections)
- **NO decorative cards** for stats/metrics

**Uniformity**: All cards same style - no special treatments for "importance"

---

### Buttons

**Primary** (Filled - Accent Color)

```css
background: #e67e22;
color: #ffffff;
border: none;
```

_Use for_: Main CTA per screen (Create, Save, Submit)

**Secondary** (Outlined - Gray)

```css
background: transparent;
border: 1px solid #9e9e9e;
color: #4a4a4a;
```

_Use for_: Alternative actions (Cancel, Back, Export)

**Ghost** (Text-like - Minimal)

```css
background: transparent;
border: none;
color: #4a4a4a;
```

_Use for_: Tertiary actions, icon buttons

**Button Sizes**:

- Default: `height: 36px, padding: 0 16px`
- Large: `height: 44px, padding: 0 24px` (forms, primary CTAs)
- Small: `height: 28px, padding: 0 12px` (table actions)

---

### Icons

**Library**: Font Awesome (Solid set primarily)

- **Size**: 14px default (matches body text)
- **Color**: Inherit from parent (Gray 700 by default)
- **Usage**: Liberal but purposeful
  - Navigation items
  - Action buttons (alongside text, not alone)
  - List item prefixes
  - Status indicators (priority flags, etc.)

**Icon Rules**:

- **Always pair with text** for primary actions
- **Icon-only buttons** acceptable for: close (×), more (⋮), expand (↓)
- **NO emoji** - professional icons only
- **NO decorative icons** - functional use only

---

### Tables

**Style**: Borderless, row hover

```css
background: #FFFFFF;
border: 1px solid #E0E0E0;
thead: background #F5F5F5, font-weight 600
tbody: border-bottom 1px solid #E0E0E0 (last row: none)
row-hover: background #FAFAFA
```

**Density**: Compact

- Row height: `40px` (not 48px+)
- Cell padding: `8px 12px`
- Font size: `14px`

**Features**:

- Sortable columns (caret icons)
- Inline actions (icon buttons, right-aligned)
- Expandable rows for details (rare, prefer modal)

---

### Modals

**Size**: Contextual

- Small: 480px (confirmations)
- Medium: 600px (forms - default)
- Large: 800px (complex details)
- Full: 90vw (ticket details, rich content)

**Header**:

```css
background: #F5F5F5;
padding: 16px 24px;
border-bottom: 1px solid #E0E0E0;
font-size: 18px, font-weight: 600
```

**Body**: `padding: 24px`
**Footer**: `padding: 16px 24px, background: #FAFAFA`

---

### Empty States

**Simplified Approach** (like Users page):

```tsx
<Empty
  description="No companies yet"
  image={<BuildOutlined style={{ fontSize: 64, color: "#9E9E9E" }} />}
>
  <Button type="primary" icon={<PlusOutlined />}>
    Create Company
  </Button>
</Empty>
```

**Rules**:

- **NO multi-step guides** unless onboarding flow
- **NO decorative cards** around empty state
- **Simple icon + message + CTA**
- Icon size: 64px, color: Gray 500

---

### Loading States

**Skeleton Screens** (preferred)

- Table rows: 5-10 skeleton rows matching actual row height
- Cards: Skeleton matching card layout
- Text: Gray bars with subtle shimmer animation

**Spinners** (fallback only)

- Full-page loads: Large spinner, centered
- Inline: Small spinner (16px), inline with content

---

### Statistics / Metrics Display

**AVOID**: 4-card stat rows, dedicated KPI widgets

**PREFERRED PATTERNS**:

**1. Inline Badges** (in page headers)

```tsx
<Title>
  Companies <Badge count={companies.length} />
</Title>
```

**2. Table Column Summaries** (footer row)

```tsx
<Table.Summary>
  <Table.Summary.Row>
    <Table.Summary.Cell>Total: 45 companies</Table.Summary.Cell>
  </Table.Summary.Row>
</Table.Summary>
```

**3. Contextual Tooltips** (on hover)

```tsx
<Tooltip title="12 active, 3 overdue">
  <Text>15 tickets</Text>
</Tooltip>
```

**4. On-Demand Details Modal**
Click "View Stats" → Modal with detailed breakdown

**Rule**: Stats must be contextually relevant. If showing "Total Admins" on Companies page, ask: "Why would the user need this here?"

---

### Priority/Urgency Indicators

**Icon-Based System** (NO color coding)

```tsx
// High Priority
<Tag icon={<FlagFilled />}>High</Tag>

// Medium Priority
<Tag icon={<FlagOutlined />}>Medium</Tag>

// Low Priority
<Tag icon={<FlagOutlined style={{ opacity: 0.5 }} />}>Low</Tag>
```

**Color Use**: Only for critical states

- **High priority + overdue** → Red text
- **Everything else** → Gray tones with icon differentiation

---

## Animation & Interaction

### Motion Principles

- **Subtle & Purposeful**: Animations enhance understanding, not decoration
- **Fast Duration**: 150-250ms for most transitions
- **Easing**: `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material ease-out)

### Specific Animations

```css
/* Hover transitions */
button:hover {
  transition: all 150ms ease-out;
}

/* Modal entry */
.modal-enter {
  opacity: 0;
  transform: scale(0.95);
  animation: modal-enter 200ms ease-out;
}

/* Skeleton shimmer */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

**No Animations**:

- Page transitions (instant)
- Data updates (instant, no fade)
- Tab switches (instant)

---

## Information Architecture

### Visual Hierarchy (Priority Order)

1. **Data** - The actual information (ticket title, company name)
2. **Actions** - What user can do (Create, Edit, Delete)
3. **Navigation** - Where user can go (sidebar, breadcrumbs)

### Content Density Strategy

- **Hide zero-value metrics** (if count = 0, don't show)
- **Collapse empty sections** (no "No data" messages unless genuinely helpful)
- **Defer non-critical info** (show in modal, not upfront)

### Role/Permission Visibility

- **User roles visible**: Profile page, Users management page
- **NOT visible**: Main navigation, every page header, tooltips everywhere
- **Contextual only**: "You don't have permission" messages when relevant

---

## Georgian Language Support

### Font Stack

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

/* BPG Arial for Georgian - self-hosted or CDN */
@font-face {
  font-family: "BPG Arial";
  src: url("/fonts/bpg-arial.woff2") format("woff2");
  unicode-range: U+10A0-10FF; /* Georgian Unicode range */
}

body {
  font-family: "Inter", "BPG Arial", -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### Typography Adjustments

- Georgian script may need **+1-2px line-height** for proper rendering
- Test all headings with Georgian text samples: `სამუშაო ბარათი`, `პროექტი`, `კომპანია`

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Update Ant Design theme config (colors, typography, spacing)
- [ ] Import Inter font + BPG Arial
- [ ] Create global CSS variables
- [ ] Update button styles (primary/secondary/ghost)
- [ ] Standardize card styles (subtle elevation)

### Phase 2: Component Cleanup

- [ ] Remove 4-card stat rows from all pages
- [ ] Simplify empty states (remove multi-step guides)
- [ ] Update icon library to Font Awesome
- [ ] Implement skeleton screens for loading states
- [ ] Hide zero-value metrics across all pages

### Phase 3: Typography & Spacing

- [ ] Apply compact spacing (24px page padding, 12px cards)
- [ ] Update heading hierarchy (pronounced sizes)
- [ ] Ensure Georgian font fallback works
- [ ] Test all layouts at 1400px max-width

### Phase 4: Refinement

- [ ] Remove color-coded filters/categories
- [ ] Implement icon-based priority system
- [ ] Add subtle hover/transition animations
- [ ] Optimize for compact density
- [ ] User testing with Georgian language content

---

## Anti-Patterns to Avoid

### ❌ Generic Admin Panel Trappings

- Dashboard with KPI widgets
- Rainbow-colored statistics
- Decorative illustrations in empty states
- Over-engineered "quick start" guides

### ❌ Excessive Decoration

- Drop shadows > 4px
- Border radius > 8px
- Gradients (unless extremely subtle)
- Animated backgrounds

### ❌ Information Bloat

- Showing every possible metric upfront
- "Total X" counts when count is 0
- Tooltips explaining obvious actions
- Role badges on every user mention

### ❌ Inconsistent Patterns

- Different card styles for "importance"
- Mixed button styles (sometimes filled, sometimes outlined for same action)
- Inconsistent icon sizes/styles
- Variable spacing (8px here, 12px there, 16px elsewhere)

---

## Design Debt Notes

### Current Issues to Address

1. **Companies page**: Remove 4-card stats row (Total Companies, Total Admins, Total Users, Active Tickets)
2. **Empty states**: Simplify "Quick Setup Guide" with numbered cards
3. **Color usage**: Default blue (#1890ff) everywhere - replace with slate (#2C3E50)
4. **Stat cards**: Small cards with large icons + colored numbers - too playful
5. **Icons**: Currently using Ant Design icons - migrate to Font Awesome
6. **Loading**: Using spinners - implement skeleton screens

### Quick Wins

- Update primary color to #2C3E50
- Remove stats row HTML
- Simplify EmptyState component
- Add Font Awesome package
- Set max-width: 1400px on main content

---

## File Structure for Design System

```
frontend/src/
├── styles/
│   ├── design-tokens.css      # CSS variables
│   ├── typography.css         # Font imports, text styles
│   ├── components.css         # Reusable component styles
│   └── utilities.css          # Helper classes
├── theme/
│   └── antd-theme.ts          # Ant Design theme config
└── components/
    └── common/
        ├── PageHeader.tsx     # Standardized page header
        ├── EmptyState.tsx     # Simplified empty state
        └── SkeletonTable.tsx  # Skeleton loading for tables
```

---

**Last Updated**: November 2, 2025  
**Version**: 1.0  
**Status**: Draft → Implementation Pending
