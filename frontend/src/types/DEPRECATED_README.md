# Deprecated Types

## types/ticket.ts

**Status**: DEPRECATED - Do not use

**Reason**: This file contained old type definitions with camelCase aliases for backward compatibility. All types have been migrated to `types/api.ts` which uses the actual snake_case field names from the API.

**Migration**: All usages have been updated to import from `types/api.ts` instead.

### What was moved:

- `Ticket` → Use `Ticket` from `types/api.ts` (matches actual API structure)
- `TicketColumn` → Moved to `types/api.ts`
- `KanbanItems` → Moved to `types/api.ts`
- `Project`, `Tag`, `Contact` → Use versions from `types/api.ts`

### Key differences:

- **Old**: Used both camelCase and snake_case with aliases (e.g., `priorityId` and `priority_id`)
- **New**: Uses only snake_case matching the actual API responses (e.g., `priority_id`)
- **Old**: `assignees: number[]` (just IDs)
- **New**: `assignees: User[]` (full user objects)

**File kept for reference only. Can be safely deleted.**
