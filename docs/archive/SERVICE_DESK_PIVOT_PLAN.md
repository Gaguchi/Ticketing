# Service Desk Pivot Plan

> **Status**: Planning  
> **Created**: November 27, 2025  
> **Goal**: Shift focus from project management to IT Service Desk workflow  
> **Approach**: UX overhaul, NOT backend rewrite. Hide complexity, don't remove it.

---

## Key Decisions Made ✅

| Decision        | Choice                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| Backend changes | **Minimal** - Keep all existing models, add new fields later if needed                                               |
| Terminology     | **Keep current** - No renaming                                                                                       |
| Permissions     | **Keep current** - System works fine                                                                                 |
| Ticket model    | **Keep as-is** - Hide advanced fields in UI under "Advanced Options"                                                 |
| Status workflow | **Keep current columns** - Improve status management later                                                           |
| Tags            | **Keep** - Hide under "Advanced" in UI                                                                               |
| Company-Project | **Keep current relationship** - One project can have multiple companies, each company instance is unique per project |
| Migration       | **Not needed** - No schema changes for v1                                                                            |

---

## The Focus: UX Overhaul

### Three Major UI Initiatives

| Component                          | Priority | Brainstorm Doc                                                                            |
| ---------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| **Service Desk Portal**            | 🔴 High  | [SERVICEDESK_V2_BRAINSTORM.md](brainstorm/SERVICEDESK_V2_BRAINSTORM.md)                   |
| **Dashboard (Main Frontend)**      | 🔴 High  | [DASHBOARD_OVERHAUL_BRAINSTORM.md](brainstorm/DASHBOARD_OVERHAUL_BRAINSTORM.md)           |
| **Companies Page (Main Frontend)** | 🔴 High  | [COMPANIES_PAGE_OVERHAUL_BRAINSTORM.md](brainstorm/COMPANIES_PAGE_OVERHAUL_BRAINSTORM.md) |

---

## 1. Core Workflow ✅

The entire system is built around this workflow:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  SUPERADMIN  │     │   COMPANY    │     │    USER      │     │    AGENT     │     │   RATING     │
│  creates     │ →   │   + users    │ →   │   creates    │ →   │   resolves   │ →   │   & close    │
│  project +   │     │   setup      │     │   ticket     │     │   ticket     │     │              │
│  company     │     │              │     │   (portal)   │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

**Status**: ✅ Workflow confirmed

---

## 2. Terminology ✅

**Decision**: Keep all current terminology. No changes needed.

| Current Term | Status  |
| ------------ | ------- |
| Project      | ✅ Keep |
| Admin        | ✅ Keep |
| User         | ✅ Keep |
| Superadmin   | ✅ Keep |
| Column       | ✅ Keep |
| Company      | ✅ Keep |

---

## 3. Roles & Permissions ✅

**Decision**: Current system is sufficient. No changes for v1.

---

## 4. Ticket Model ✅

**Decision**: Keep ALL existing fields. Hide complexity in UI.

### UI Approach

- Simple mode (default): Subject, Description, Priority (simple dropdown)
- Advanced mode (expandable): All other fields (urgency, importance, tags, etc.)

### Future Backend Additions (v2+)

- `satisfaction_rating` - 1-5 stars
- `satisfaction_comment` - Feedback text
- `resolution_notes` - Agent's fix summary
- `first_response_at` - SLA tracking

---

## 5. Status Workflow ✅

**Decision**: Keep current column-based system. Enhance later with proper status management.

---

## 6. Tags ✅

**Decision**: Keep tags. Hide under "Advanced Options" in create/edit forms.

---

## 7. Company-Project Relationship ✅

**Decision**: Keep current relationship.

### How It Works

- Project A can have a company called "Apple" (ID: 1)
- Project B can also have a company called "Apple" (ID: 2)
- These are separate entities with separate tickets
- Each company instance is scoped to its project

---

## 8. Frontend Changes 🔴 FOCUS AREA

### Service Desk Portal (Complete Overhaul)

**Goal**: World-class end-user ticket portal
**See**: [SERVICEDESK_V2_BRAINSTORM.md](brainstorm/SERVICEDESK_V2_BRAINSTORM.md)

Key Features:

- [ ] Clean, modern dashboard
- [ ] Simple ticket creation (hide advanced options)
- [ ] Conversation-style ticket view
- [ ] Satisfaction rating on resolution
- [ ] Mobile-first design

### Dashboard (Main Frontend)

**Goal**: At-a-glance overview of ticket health
**See**: [DASHBOARD_OVERHAUL_BRAINSTORM.md](brainstorm/DASHBOARD_OVERHAUL_BRAINSTORM.md)

Key Features:

- [ ] Quick stat cards (open, unassigned, high priority)
- [ ] Needs attention list
- [ ] Ticket trends
- [ ] Activity feed

### Companies Page (Main Frontend)

**Goal**: Comprehensive client management hub
**See**: [COMPANIES_PAGE_OVERHAUL_BRAINSTORM.md](brainstorm/COMPANIES_PAGE_OVERHAUL_BRAINSTORM.md)

Key Features:

- [ ] Company logos
- [ ] Master-detail layout
- [ ] Better user management
- [ ] Improved ticket display
- [ ] Quick stats per company

---

## 9. Backend Changes ✅

**Decision**: No backend changes for v1. Focus purely on UX.

The existing functionality is sufficient. We may add:

- Satisfaction rating fields (v2)
- Dashboard stats endpoint (if needed for performance)

---

## 10. Implementation Order

### Phase 1: Planning & Design (Current)

1. ✅ Finalize this pivot plan
2. ✅ Create brainstorm documents
3. [ ] Review and discuss each brainstorm doc
4. [ ] Create mockups/wireframes
5. [ ] Prioritize features for MVP

### Phase 2: Service Desk Portal v2

1. [ ] New page structure
2. [ ] Dashboard
3. [ ] Ticket creation
4. [ ] Ticket detail with conversation view
5. [ ] Satisfaction rating

### Phase 3: Main Frontend - Dashboard

1. [ ] New dashboard layout
2. [ ] Stat cards
3. [ ] Needs attention list
4. [ ] Charts (if time permits)

### Phase 4: Main Frontend - Companies

1. [ ] Master-detail layout
2. [ ] Logo upload
3. [ ] Inline user management
4. [ ] Better ticket display

---

## Next Steps

1. **Review brainstorm docs together**

   - Service Desk Portal
   - Dashboard
   - Companies Page

2. **Decide on MVP scope for each**

3. **Start implementation**

---

## Brainstorm Documents

| Document                                                           | Status              |
| ------------------------------------------------------------------ | ------------------- |
| [Service Desk v2](brainstorm/SERVICEDESK_V2_BRAINSTORM.md)         | 📝 Ready for review |
| [Dashboard Overhaul](brainstorm/DASHBOARD_OVERHAUL_BRAINSTORM.md)  | 📝 Ready for review |
| [Companies Page](brainstorm/COMPANIES_PAGE_OVERHAUL_BRAINSTORM.md) | 📝 Ready for review |

---

## Notes

<!-- Add your thoughts here -->
