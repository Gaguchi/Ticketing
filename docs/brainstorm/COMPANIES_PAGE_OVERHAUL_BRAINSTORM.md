# Companies Page Overhaul - Brainstorm

> **Goal**: Transform Companies page into a comprehensive client management hub
> **Location**: `frontend/src/pages/Companies.tsx` > **Status**: Brainstorming
> **Created**: November 27, 2025

---

## Current Companies Page Analysis

**What we have now:**

- Company cards grid
- Click to see company detail
- Basic ticket table for company
- User management modals
- Admin management modals

**Current Features:**

- Create/Edit company
- View company tickets (table, kanban, deadline, archive views)
- Manage company users
- Manage company admins

**Problems:**

- [ ] Company cards lack visual impact (no logos)
- [ ] User management is hidden in modals
- [ ] Ticket display is basic
- [ ] No quick stats on company health
- [ ] Navigation between list and detail is jarring
- [ ] Can't quickly see which companies need attention

---

## Goals for New Companies Page

1. **Visual Identity**: Company logos, branding, professional look
2. **Health at a Glance**: See ticket status per company quickly
3. **Better User Management**: Cleaner, more visible, easier to use
4. **Ticket Insights**: Rich ticket display with filtering and search
5. **Quick Actions**: Fast access to common operations

---

## Page Structure Options

### Option A: List → Detail (Current)

- Grid of company cards
- Click to enter detail view
- Back button to return

### Option B: Master-Detail Split (Recommended)

- Left sidebar: Company list
- Right main area: Selected company details
- No page navigation needed

### Option C: Tabs per Company

- Horizontal tabs for each company
- Content area shows selected company

**Recommendation**: Option B (Master-Detail) for efficiency

---

## Proposed Layout: Master-Detail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏢 Companies                                              [+ Add Company]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────┐ ┌────────────────────────────────────────────────────┤
│ │ 🔍 Search...       │ │                                                    │
│ ├────────────────────┤ │   [LOGO]  Apple Inc                                │
│ │                    │ │                                                    │
│ │ ┌────────────────┐ │ │   📧 contact@apple.com  📞 +1-555-0123             │
│ │ │ 🍎 Apple Inc   │ │ │   Created: Jan 15, 2025                            │
│ │ │ 12 open tickets│◀│ │                                                    │
│ │ │ ⚠️ 2 high prio │ │ │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│ │ └────────────────┘ │ │   │ 🎫 12   │ │ ⏳ 8    │ │ ✅ 45   │ │ ⭐ 4.3  │  │
│ │                    │ │   │ Open    │ │ In Prog │ │ Closed  │ │ Rating  │  │
│ │ ┌────────────────┐ │ │   └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│ │ │ 📱 Nokia       │ │ │                                                    │
│ │ │ 5 open tickets │ │ │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ │ │                │ │ │                                                    │
│ │ └────────────────┘ │ │   👥 Users (8)                    [+ Add User]     │
│ │                    │ │   ┌──────────────────────────────────────────────┐ │
│ │ ┌────────────────┐ │ │   │ 👤 John Smith    john@apple.com    [Remove] │ │
│ │ │ 🚀 TechStart   │ │ │   │ 👤 Jane Doe      jane@apple.com    [Remove] │ │
│ │ │ 3 open tickets │ │ │   │ 👤 Bob Wilson    bob@apple.com     [Remove] │ │
│ │ │                │ │ │   └──────────────────────────────────────────────┘ │
│ │ └────────────────┘ │ │                                                    │
│ │                    │ │   🛠️ Assigned Agents (2)           [+ Add Agent]   │
│ │                    │ │   ┌──────────────────────────────────────────────┐ │
│ │                    │ │   │ 🔧 Sarah Tech    sarah@it.com      [Remove] │ │
│ │                    │ │   │ 🔧 Mike Support  mike@it.com       [Remove] │ │
│ │                    │ │   └──────────────────────────────────────────────┘ │
│ │                    │ │                                                    │
│ │                    │ │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ │                    │ │                                                    │
│ │                    │ │   🎫 Tickets                        [View All →]   │
│ │                    │ │   [All] [Open] [In Progress] [Resolved] [Closed]  │
│ │                    │ │   🔍 Search tickets...                             │
│ │                    │ │   ┌──────────────────────────────────────────────┐ │
│ │                    │ │   │ TICK-42  Email not working     🟡 In Prog    │ │
│ │                    │ │   │ TICK-40  VPN setup request     🔵 Open       │ │
│ │                    │ │   │ TICK-38  New laptop needed     🟢 Resolved   │ │
│ │                    │ │   └──────────────────────────────────────────────┘ │
│ └────────────────────┘ └────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Company List Sidebar

**Features:**

- Search/filter companies
- Company mini-cards showing:
  - Company logo (or initial avatar)
  - Company name
  - Open ticket count
  - Alert indicator (high priority tickets)
- Selected state highlight
- Sorted by: Name, Ticket Count, or custom

**Mini-Card Design:**

```
┌────────────────────┐
│ 🍎  Apple Inc      │
│     12 open tickets│
│     ⚠️ 2 high prio │
└────────────────────┘
```

### 2. Company Header

**Features:**

- Large company logo (uploadable)
- Company name (editable inline?)
- Contact info (email, phone)
- Quick stats row
- Edit/Delete actions

**Stats to show:**
| Stat | Description |
|------|-------------|
| Open Tickets | Currently open |
| In Progress | Being worked on |
| Closed (all time or this month) | Completed |
| Avg Rating | Customer satisfaction |

### 3. Users Section

**Current**: Hidden in modal, one at a time creation

**Proposed**:

- Inline list always visible
- Quick add form (expandable)
- User cards with:
  - Avatar (initials-based)
  - Name
  - Email
  - Quick actions (remove, reset password?)
- Bulk operations (optional v2)

**User Card:**

```
┌────────────────────────────────────────────────────────┐
│ 👤 JS  John Smith                                      │
│        john@apple.com                                  │
│        Last login: 2 hours ago         [···] ← Actions │
└────────────────────────────────────────────────────────┘
```

**Actions Menu:**

- View tickets by this user
- Reset password
- Remove from company

### 4. Agents Section

**Current**: Separate modal for managing admins

**Proposed**:

- Similar to users section
- Shows IT staff assigned to this company
- Add from existing users (dropdown/search)

### 5. Tickets Section

**Current**: Table with view mode toggles (table, kanban, deadline, archive)

**Proposed Enhancement**:

- Tab filters: All | Open | In Progress | Resolved | Closed
- Search within company tickets
- Cleaner table design
- Quick actions on each ticket
- Click to open ticket detail (modal or navigate)

**Ticket Row:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TICK-42  │ Email not working since morning  │ 🔴 High │ 🟡 In Prog │ @Sarah │
│          │ Reported by: John Smith          │         │ 2 hrs ago  │        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Company Logo Feature

### Upload Flow

1. Click on logo area or "Upload Logo" button
2. File picker opens
3. Select image (jpg, png, svg)
4. Crop/resize (optional)
5. Save

### Display

- Large version in header (80-120px)
- Small version in sidebar card (32-40px)
- Fallback: Colored circle with company initial

### Technical

- Store in `company.logo` field (already exists in model)
- Use `apiService.postFormData()` for upload
- Generate thumbnail for list view (or CSS resize)

---

## User Management Improvements

### Current Flow

1. Click "Manage Users" in dropdown
2. Modal opens
3. Fill form to create one user
4. Submit
5. User appears in list

### Proposed Flow

**Option A: Inline Creation**

```
┌─────────────────────────────────────────────────────────┐
│ 👥 Users (8)                           [+ Add User]     │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📧 Email          Name              Password        │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │ │
│ │ │              │ │              │ │ [Generate]   │  │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘  │ │
│ │                                    [Cancel] [Add]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 👤 John Smith    john@apple.com           [···]         │
│ 👤 Jane Doe      jane@apple.com           [···]         │
└─────────────────────────────────────────────────────────┘
```

**Option B: Slide-out Panel**

- Click "Add User"
- Panel slides in from right
- Form in panel
- Submit and panel closes

### User Credentials Display

When user is created, show:

- Generated username
- Generated/entered password
- "Copy credentials" button
- "Send email" option (future)

---

## Ticket Display Improvements

### Quick Stats Bar

```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  12     │ │   8     │ │   3     │ │   45    │
│  Open   │ │ In Prog │ │ Pending │ │ Closed  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Filter Tabs

```
[All (68)] [Open (12)] [In Progress (8)] [Resolved (3)] [Closed (45)]
```

### Search

```
🔍 Search tickets in Apple Inc...
```

### Ticket List Design Options

**Option A: Compact List**

```
│ TICK-42  Email not working          🔴 High    🟡 In Prog   @Sarah   2h ago │
│ TICK-40  VPN access request         🟢 Low     🔵 Open      -        1d ago │
```

**Option B: Card View**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TICK-42                                                      🟡 In Progress │
│ Email not working since this morning                                        │
│ ─────────────────────────────────────────────────────────────────────────── │
│ 🔴 High Priority   👤 John Smith   🛠️ Sarah   💬 3 comments   📎 1 file    │
│ Created: 2 hours ago                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quick Actions on Tickets

- Assign to me
- Change status
- Open in detail view
- Quick comment

---

## Mobile Considerations

For small screens:

- Company list becomes top selector (dropdown or horizontal scroll)
- Content stacks vertically
- Collapsible sections (Users, Agents, Tickets)
- Bottom sheet for actions

---

## Empty States

### No Companies Yet

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                          🏢                                                 │
│                                                                             │
│                    No companies yet                                         │
│                                                                             │
│         Add your first client company to start managing tickets             │
│                                                                             │
│                      [+ Add Company]                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Company Selected - No Users

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👥 Users (0)                                               [+ Add User]     │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│                 No users in this company yet                                │
│         Add users so they can submit tickets through the portal             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Company Selected - No Tickets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎫 Tickets                                                                  │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│                     🎉 All clear!                                           │
│                 No open tickets for Apple Inc                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Requirements

### Existing API Endpoints (should work)

- `GET /api/tickets/companies/` - List companies
- `GET /api/tickets/companies/{id}/` - Company detail
- `POST /api/tickets/companies/` - Create company
- `PATCH /api/tickets/companies/{id}/` - Update company
- `POST /api/tickets/companies/{id}/create_user/` - Add user
- `POST /api/tickets/companies/{id}/remove_user/` - Remove user
- `POST /api/tickets/companies/{id}/assign_admin/` - Add agent
- `POST /api/tickets/companies/{id}/remove_admin/` - Remove agent
- `GET /api/tickets/tickets/?company={id}` - Company tickets

### May Need to Add

- Company ticket stats aggregation (or compute client-side)
- User last login info
- Company activity feed (optional)

---

## Technical Approach

### Component Structure

```
CompaniesPage
├── CompanySidebar
│   ├── SearchInput
│   └── CompanyMiniCard (map)
├── CompanyDetail
│   ├── CompanyHeader
│   │   ├── CompanyLogo
│   │   ├── CompanyInfo
│   │   └── CompanyStats
│   ├── UsersSection
│   │   ├── UserList
│   │   │   └── UserCard
│   │   └── AddUserForm
│   ├── AgentsSection
│   │   ├── AgentList
│   │   └── AddAgentDropdown
│   └── TicketsSection
│       ├── TicketFilters
│       ├── TicketSearch
│       └── TicketList
│           └── TicketRow
└── CreateCompanyModal
```

### State Management

- Selected company ID in URL params (`/companies/:id`)
- Or in component state with context
- Optimistic updates for user/agent changes

---

## MVP Features

### Must Have (v1)

- [ ] Master-detail layout
- [ ] Company logo upload
- [ ] Inline user list (visible, not modal)
- [ ] Better ticket filtering
- [ ] Quick stats per company

### Nice to Have (v1.1)

- [ ] Inline user creation (not modal)
- [ ] User password copy/reveal
- [ ] Ticket search within company
- [ ] Activity feed per company

### Future (v2)

- [ ] Bulk user import (CSV)
- [ ] Company branding settings (for their portal)
- [ ] SLA settings per company
- [ ] Company notes/documents

---

## Questions to Resolve

1. [ ] Master-detail layout or keep current card grid?
2. [ ] Show user last login?
3. [ ] Allow password view/copy when creating user?
4. [ ] How many tickets to show in preview? (10? Show all with pagination?)
5. [ ] Keep kanban view for company tickets or just list?
6. [ ] Allow editing company inline or keep modal?

---

## References

- Zendesk Organizations: https://www.zendesk.com/
- HubSpot Companies: https://www.hubspot.com/
- Intercom Companies: https://www.intercom.com/

---

## Notes

<!-- Add your thoughts here -->
