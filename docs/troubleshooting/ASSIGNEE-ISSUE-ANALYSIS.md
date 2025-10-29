# Assignee Issue Analysis & Fixes

## Summary

Date: 2025-10-27
Issue: Ticket assignees not displaying correctly and hardcoded user in CreateTicketModal

## Problem Analysis

### 1. Ticket 6 Analysis

**Console Log:**

```json
{
  "assignee": 1,
  "assignee_ids": [1]
}
```

**API Response:**

```json
{
  "assignees": [{ "id": 1, "username": "admin", "email": "admin@example.com" }]
}
```

**Finding:** The ticket was assigned to admin (ID: 1) because the CreateTicketModal has a hardcoded user with ID 1 ("Boris Karaya").

### 2. TicketModal Display Issue

**Problem:** The modal was showing:

- "TASK-6" instead of "TICK-6" (using type instead of project key)
- "Unassigned" even when assignees existed

**Root Cause:**

```tsx
// BEFORE - Incorrect
`${ticketType.toUpperCase()}-${ticket?.id}`  // Shows "TASK-6"

// Hardcoded "Unassigned" button
<Button><UserOutlined /><span>Unassigned</span></Button>
```

## Fixes Applied

### Fix 1: Ticket Key Format in TicketModal

**File:** `frontend/src/components/TicketModal.tsx`
**Change:**

```tsx
// AFTER - Correct
`${ticket?.project_key || "TICK"}-${ticket?.id}`; // Shows "TICK-6"
```

### Fix 2: Display Actual Assignees in TicketModal

**File:** `frontend/src/components/TicketModal.tsx`
**Change:**

```tsx
{
  /* BEFORE - Hardcoded */
}
<Button>
  <UserOutlined />
  <span>Unassigned</span>
</Button>;

{
  /* AFTER - Dynamic */
}
{
  ticket?.assignees && ticket.assignees.length > 0 ? (
    <div style={{ marginBottom: "8px" }}>
      {ticket.assignees.map((assignee: any) => (
        <div
          key={assignee.id}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Avatar size={24} style={{ backgroundColor: "#0052cc" }}>
            {assignee.first_name?.[0] || assignee.username?.[0]?.toUpperCase()}
            {assignee.last_name?.[0] || assignee.username?.[1]?.toUpperCase()}
          </Avatar>
          <span style={{ fontSize: "14px", color: "#172b4d" }}>
            {assignee.first_name && assignee.last_name
              ? `${assignee.first_name} ${assignee.last_name}`
              : assignee.username}
          </span>
        </div>
      ))}
    </div>
  ) : (
    <Button>
      <UserOutlined />
      <span>Unassigned</span>
    </Button>
  );
}
```

## API Verification Tests

### Test 1: Create Ticket with Assignee

```powershell
# Login as gaga (ID: 2)
POST /api/tickets/auth/login/
{"username":"gaga","password":"nji9nji9"}

# Create ticket
POST /api/tickets/tickets/
{
  "assignee_ids": [2],
  "name": "Test Assignee",
  ...
}

# Response
{
  "id": 7,
  "assignees": [
    {"id": 2, "username": "gaga", "first_name": "Boris", "last_name": "Karaia"}
  ]
}
```

**Result:** ✅ API correctly saves assignees

### Test 2: Retrieve Ticket

```powershell
GET /api/tickets/tickets/7/

# Response
{
  "id": 7,
  "assignees": [
    {"id": 2, "username": "gaga", "email": "gaga9393@gmail.com"}
  ]
}
```

**Result:** ✅ API correctly retrieves assignees

## Remaining Issues

### Issue: Hardcoded Assignee in CreateTicketModal

**File:** `frontend/src/components/CreateTicketModal.tsx`
**Current Code:**

```tsx
<Select placeholder="Automatic" allowClear showSearch>
  <Option value={1}>
    {" "}
    {/* ← HARDCODED */}
    <div>
      <div>BK</div> {/* ← HARDCODED */}
      <span>Boris Karaya</span> {/* ← HARDCODED */}
    </div>
  </Option>
</Select>
```

**Recommended Fix:**

1. Fetch project members from API
2. Or fetch all users if no project members API exists
3. Use authService.getCurrentUser() to get current user for "Assign to me" functionality

**Suggested Implementation:**

```tsx
const [users, setUsers] = useState<User[]>([]);
const [currentUser, setCurrentUser] = useState<User | null>(null);

useEffect(() => {
  // Fetch users (project members or all users)
  userService.getUsers().then(setUsers);

  // Get current user
  authService.getCurrentUser().then(setCurrentUser);
}, []);

// In JSX
<Select placeholder="Automatic" allowClear showSearch>
  {users.map((user) => (
    <Option key={user.id} value={user.id}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Avatar size={24}>
          {user.first_name?.[0]}
          {user.last_name?.[0]}
        </Avatar>
        <span>
          {user.first_name} {user.last_name}
        </span>
      </div>
    </Option>
  ))}
</Select>;
```

## Summary of Changes

### ✅ Fixed

1. **TicketModal Ticket Key Display**: Now shows `TICK-6` instead of `TASK-6`
2. **TicketModal Assignee Display**: Now shows actual assignees with avatar and name
3. **API Verification**: Confirmed backend correctly handles assignee_ids

### ⚠️ Needs Fix

1. **CreateTicketModal Hardcoded User**: Replace hardcoded user ID 1 with dynamic user list
2. **"Assign to me" Button**: Implement functionality in TicketModal
3. **User Fetch API**: May need to create endpoint to list users or project members

## Backend Notes

### Serializer (Correct Implementation)

```python
class TicketSerializer(serializers.ModelSerializer):
    assignees = UserSerializer(many=True, read_only=True)
    assignee_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        source='assignees',
        write_only=True,
        required=False
    )
```

This correctly:

- Reads assignees as full User objects
- Writes assignee_ids as array of user IDs
- Maps both to the same `assignees` M2M field

## Next Steps

1. **Create User List API or Service**

   - Option A: Add ViewSet for User model
   - Option B: Use Project.members field
   - Option C: Fetch from /api/tickets/auth/me/

2. **Update CreateTicketModal**

   - Fetch users dynamically
   - Populate assignee dropdown
   - Set default to current user if needed

3. **Implement "Assign to me"**

   - Get current user ID
   - Add to assignees list
   - Update ticket via API

4. **Test End-to-End**
   - Create ticket with different users
   - Verify TicketModal displays correctly
   - Test "Assign to me" button
