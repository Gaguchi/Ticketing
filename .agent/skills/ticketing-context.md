---
description: Consolidated context and hallucination avoidance guide for the Ticketing System project
---

# Ticketing System - AI Context & Hallucination Avoidance

> Use this skill whenever working on this project to avoid common errors from incorrect field names, API patterns, and context misunderstandings.

---

## Quick Reference: Critical Field Names

### ⚠️ Comment Model (`backend/tickets/models.py`)
```python
comment.user        # ✅ CORRECT - Always use this
comment.author      # ❌ WRONG - Will cause AttributeError
```
**Why**: WebSocket events serialize as `author`, but the DB field is `user`.

---

### ⚠️ Company Names are NOT Unique
```python
Company.objects.get(name="Acme Corp")  # ❌ WRONG - MultipleObjectsReturned!
Company.objects.get(id=company_id)     # ✅ CORRECT - Use ID
Company.objects.filter(name="X", projects__id=project_id)  # ✅ CORRECT - With project context
```
**Why**: Same company name can exist in different projects.

---

### ⚠️ ForeignKey Access Pattern
```python
# Accessing related objects
comment.ticket          # ✅ Returns Ticket object
comment.ticket_id       # Returns integer ID only

# When saving - pass OBJECT not ID
serializer.save(ticket=ticket)     # ✅ CORRECT
serializer.save(ticket_id=123)     # ❌ WRONG
```

---

## Model Field Cheatsheet

| Model | Field Name | NOT This |
|-------|------------|----------|
| Comment | `user` | ~~author~~ |
| Ticket | `reporter` | ~~creator, author~~ |
| Ticket | `assignees` | ~~assigned_to~~ |
| Ticket | `type` | ~~ticket_type~~ |
| Ticket | `priority_id` | ~~priority~~ (just the id) |
| User | `username` | ~~name, user_name~~ |

---

## Context Architecture

### App Provider Hierarchy
```
AppProvider (AppContext.tsx)
├── Exports: useAuth(), useProject(), useApp()
└── DO NOT USE: ProjectContext.tsx (redundant, causes errors)

CompanyProvider (CompanyContext.tsx)
└── Exports: useCompany()

WebSocketProvider (WebSocketContext.tsx)
└── Exports: useWebSocketContext()
```

**Correct Import**:
```typescript
import { useAuth, useProject } from "../contexts/AppContext";
```

---

## useEffect Dependencies

### ❌ Causes Constant Re-renders
```typescript
useEffect(() => {
  connectWebSocket(activeRoom);
}, [activeRoom]); // Object reference changes on every state update
```

### ✅ Use Primitive Values
```typescript
useEffect(() => {
  connectWebSocket(activeRoom);
}, [activeRoom?.id]); // Stable - only changes when ID changes
```

---

## API Patterns

### Nested Routes
```
GET    /api/tickets/tickets/{ticket_id}/comments/
POST   /api/tickets/tickets/{ticket_id}/comments/
```

### WebSocket Events
- **Notification channel**: `ws/notifications/`
- **Project tickets**: `ws/projects/{project_id}/tickets/`
- Access data via `data.data`, NOT `data.notification`

### Company Filtering
```
GET /api/tickets/companies/?project={project_id}
```
Always include project context when fetching companies.

---

## Before You Code - Verification Checklist

1. **Imports**: Does the file/component actually exist?
2. **Field names**: Cross-reference with `models.py` definitions
3. **API endpoints**: Match against `backend/tickets/urls.py`
4. **TypeScript types**: Are they defined in `types/` or inline?
5. **Context usage**: Using `AppContext` (not `ProjectContext`)?
6. **Object references**: Using `?.id` not full objects in useEffect?

---

## Key Files to Reference

| Purpose | File Path |
|---------|-----------|
| All Django models | `backend/tickets/models.py` |
| API routes | `backend/tickets/urls.py` |
| TypeScript types | `frontend/src/types/` |
| API service | `frontend/src/services/api.service.ts` |
| App context | `frontend/src/contexts/AppContext.tsx` |
| Full reference | `PROJECT_REFERENCE.md` |
| Architecture | `docs/SYSTEM_ARCHITECTURE.md` |

---

## Common Hallucinations to Avoid

1. **Inventing field names** - Always verify against `models.py`
2. **Assuming unique constraints** - Company names aren't unique
3. **Wrong context import** - Use `AppContext`, skip `ProjectContext`
4. **Object in useEffect deps** - Use primitive values (`?.id`)
5. **Incorrect API nesting** - Comments are nested under tickets
6. **WebSocket data access** - It's `data.data`, not `data.notification`

---

## Project-Specific User Roles

Roles are **per-project** via `UserRole` model:
- **superadmin**: Full project control (auto-assigned on project creation)
- **admin**: Manage tickets, assign work
- **user**: Create/edit own tickets
- **manager**: Read-only KPI access

```python
# Always query role for specific project
UserRole.objects.get(user=user, project=project).role
```

---

## When in Doubt

1. Run `/review` workflow after changes
2. Check `PROJECT_REFERENCE.md` for detailed patterns
3. Verify models in `backend/tickets/models.py`
4. Ask for clarification rather than assume
