# TicketModal Implementation TODO List

> **Context**: Comprehensive refactor of TicketModal.tsx to align with Design Bible v1.0  
> **File**: `frontend/src/components/TicketModal.tsx` (1144 lines)  
> **Current State**: Jira-inspired design with mock functionality, many violations of Design Bible  
> **Target**: Minimalist, professional, Design Bible-compliant modal

---

## 🔴 CRITICAL BUGS (Fix Immediately)

### 1. Urgency/Importance Field Value Bug

- **Issue**: Using `"medium"` as default value, but backend expects `"normal"`
- **Location**: Lines 91-95, 937-943, 962-968
- **Fix Required**:

  ```typescript
  // Line 91: Change default state
  const [urgency, setUrgency] = useState<TicketUrgency>(
    (ticket?.urgency as TicketUrgency) || "normal"  // WAS: "medium"
  );

  // Line 94: Change default state
  const [importance, setImportance] = useState<TicketImportance>(
    (ticket?.importance as TicketImportance) || "normal"  // WAS: "medium"
  );

  // Lines 937-943: Update Urgency dropdown options
  <Select value={urgency} onChange={setUrgency}>
    <Option value="low">Low</Option>
    <Option value="normal">Normal</Option>  // WAS: "medium"
    <Option value="high">High</Option>
    // REMOVE: <Option value="critical">Critical</Option>
  </Select>

  // Lines 962-968: Update Importance dropdown options
  <Select value={importance} onChange={setImportance}>
    <Option value="low">Low</Option>
    <Option value="normal">Normal</Option>  // WAS: "medium"
    <Option value="high">High</Option>
    <Option value="critical">Critical</Option>  // KEEP this one
  </Select>
  ```

- **Backend Validation**: Matches CreateTicketModal fix from previous session
- **Priority**: 🔴 CRITICAL - Prevents ticket updates from failing with 400 error

---

## 🎨 DESIGN BIBLE COMPLIANCE (Visual Updates)

### 2. Replace Jira Color Scheme with Design Bible Colors

- **Current**: Jira blues (`#0052cc`, `#4bade8`, `#5e6c84`)
- **Target**: Design Bible palette (`#2C3E50`, `#E67E22`, `#9E9E9E`)

#### 2.1 Primary Blue → Slate Blue-Gray

```typescript
// Line 467: Ticket ID color
style={{ color: "#2C3E50", fontWeight: 500 }}  // WAS: #0052cc

// Line 623: Avatar background
style={{ backgroundColor: "#2C3E50" }}  // WAS: #0052cc

// Line 815: Another avatar
style={{ backgroundColor: "#2C3E50" }}  // WAS: #0052cc

// Line 1060: Reporter avatar
style={{ backgroundColor: "#2C3E50" }}  // WAS: #0052cc
```

#### 2.2 Secondary Gray → Gray 500

```typescript
// All instances of color: "#5e6c84" → "#9E9E9E"
// Locations: Lines 450, 477, 484, 489, 494, 550, 569, 583, 607, 657, 675,
//            717, 856, 882, 1085, 1101, 1104
```

#### 2.3 Type Icon Colors (Keep for Visual Distinction)

```typescript
// Lines 48-59: getTypeIcon function
// KEEP these colors - they're semantic indicators, not decorative
case "task": return { icon: faCheckSquare, color: "#4bade8" };
case "bug": return { icon: faBug, color: "#e5493a" };
case "story": return { icon: faBookmark, color: "#63ba3c" };
case "epic": return { icon: faBolt, color: "#904ee2" };
```

#### 2.4 Background Colors

```typescript
// Line 710: Right panel background
backgroundColor: "#FAFBFC"; // CHANGE TO: "#F5F5F5" (Design Bible Gray 100)
```

---

### 3. Update Typography to Design Bible Standards

#### 3.1 Section Headers (Uppercase Labels)

```typescript
// All section headers currently use:
fontSize: "12px", fontWeight: 600, color: "#5e6c84", textTransform: "uppercase"

// CHANGE TO (Design Bible Small + Gray 500):
fontSize: "12px", fontWeight: 600, color: "#9E9E9E", textTransform: "uppercase"

// Locations: Lines 547, 567, 581, 604, 719, 743, 773, 799, 867, 887, 922, 947, 972, 997, 1028, 1050
```

#### 3.2 Body Text

```typescript
// All instances of color: "#172b4d" → "#1A1A1A" (Design Bible Gray 900)
// Locations: Lines 530, 561, 624, 633, 827, 1061
```

#### 3.3 Title Input

```typescript
// Line 525-533: Title input
fontSize: "24px"; // ✅ CORRECT (Design Bible H1)
fontWeight: 500; // ✅ CORRECT
color: "#1A1A1A"; // CHANGE FROM: "#172b4d"
```

---

### 4. Spacing Adjustments (Compact Density)

#### 4.1 Modal Padding

```typescript
// Line 416: Header padding - REDUCE
padding: "12px 24px"; // WAS: "16px 24px" (Design Bible: 12px internal)

// Line 519: Left panel padding - REDUCE
padding: "16px 24px"; // WAS: "24px" (Design Bible: 16px section padding)

// Line 709: Right panel padding - REDUCE
padding: "16px 24px"; // WAS: "24px"
```

#### 4.2 Component Spacing

```typescript
// Reduce all marginBottom: "24px" → "16px" (Design Bible: section spacing)
// Exceptions: Major section breaks can stay at 24px
// Locations: Lines 540, 563, 577, 595, 747, 771, 796, 863, 885, 920, 945, 970, 995, 1026, 1048
```

---

## 🧹 FEATURE REMOVAL (Minimize Complexity)

### 5. Remove "Add Epic" Button

- **Location**: Lines 445-453
- **Rationale**: Epic management is complex feature, not needed for v1
- **Action**: DELETE entire button element

```typescript
// REMOVE:
<Button
  type="text"
  size="small"
  icon={<PlusOutlined />}
  style={{ color: "#5e6c84" }}
>
  Add epic
</Button>
```

---

### 6. Remove Subtasks Section

- **Location**: Lines 561-575
- **Rationale**: Subtasks = mini-tickets, adds significant complexity
- **Action**: DELETE entire section

```typescript
// REMOVE:
<div style={{ marginBottom: "24px" }}>
  <h3 style={{...}}>Subtasks</h3>
  <Button type="text" size="small" style={{...}}>
    Add subtask
  </Button>
</div>
```

---

### 7. Remove "Linked Work Items" Section

- **Location**: Lines 578-592
- **Rationale**: Complex relationship types (blocks/duplicates), defer to v2
- **Action**: DELETE entire section

```typescript
// REMOVE:
<div style={{ marginBottom: "24px" }}>
  <h3 style={{...}}>Linked work items</h3>
  <Button type="text" size="small" style={{...}}>
    Add linked work item
  </Button>
</div>
```

---

### 8. Simplify Activity Tabs (Remove "All" and "Work log")

- **Location**: Lines 612-621
- **Current**: 4 tabs (All, Comments, History, Work log)
- **New**: 2 tabs (Comments, History)
- **Rationale**:
  - "All" = redundant mixed view
  - "Work log" = time tracking, complex feature for v1

```typescript
// CHANGE FROM:
items={[
  { key: "all", label: "All" },
  { key: "comments", label: "Comments" },
  { key: "history", label: "History" },
  { key: "worklog", label: "Work log" },
]}

// CHANGE TO:
items={[
  { key: "comments", label: "Comments" },
  { key: "history", label: "History" },
]}
```

---

### 9. Remove Quick Comment Emoji Buttons

- **Location**: Lines 62-68 (mock data), Lines 643-665 (rendering)
- **Rationale**: Too playful/casual for professional Design Bible aesthetic
- **Action**:
  1. DELETE `quickComments` array (lines 62-68)
  2. DELETE emoji button rendering (lines 643-665)

```typescript
// REMOVE mock data:
const quickComments = [
  { emoji: "👍", text: "Looks good!" },
  // ... etc
];

// REMOVE rendering:
<div
  style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}
>
  {quickComments.map((qc, idx) => (
    <Button
      key={idx}
      size="small"
      type="text"
      onClick={() => setComment(qc.text)}
    >
      {qc.emoji} {qc.text}
    </Button>
  ))}
</div>;
```

---

### 10. Remove Keyboard Shortcut Tip

- **Location**: Lines 666-677
- **Rationale**: "Press M to comment" - not implemented, unnecessary v1 feature
- **Action**: DELETE entire "Pro tip" section

```typescript
// REMOVE:
<div style={{ fontSize: "12px", color: "#5e6c84" }}>
  <strong>Pro tip:</strong> press <kbd>M</kbd> to comment
</div>
```

---

### 11. Simplify Header Action Buttons

- **Location**: Lines 473-502
- **Current**: Watch (eye icon + count), Share, More (ellipsis), Fullscreen buttons
- **Keep**: Only Fullscreen (useful for modal expansion)
- **Remove**: Watch, Share, More options

```typescript
// CHANGE FROM:
{
  !isCreateMode && (
    <>
      <Button type="text" size="small" icon={<EyeOutlined />}>
        1
      </Button>
      <Button type="text" size="small" icon={<ShareAltOutlined />} />
      <Button type="text" size="small" icon={<EllipsisOutlined />} />
      <Button type="text" size="small" icon={<FullscreenOutlined />} />
    </>
  );
}

// CHANGE TO:
{
  !isCreateMode && (
    <Button
      type="text"
      size="small"
      icon={<FullscreenOutlined />}
      style={{ color: "#9E9E9E" }}
    />
  );
}
```

---

### 12. Remove "Add Parent" Placeholder

- **Location**: Lines 865-883
- **Current**: "Add parent" button (non-functional)
- **Action**: DELETE for now, implement properly later if needed

```typescript
// REMOVE entire "Parent" section:
<div style={{ marginBottom: "16px" }}>
  <div style={{...}}>Parent</div>
  <Button type="text" size="small" style={{...}}>
    Add parent
  </Button>
</div>
```

---

### 13. Remove Automation Section

- **Location**: Lines 1073-1096
- **Rationale**: Automation rules = complex enterprise feature, not v1
- **Action**: DELETE entire section

```typescript
// REMOVE:
<div style={{ borderTop: "1px solid #dfe1e6", paddingTop: "16px", marginTop: "24px" }}>
  <Button type="text" size="small" style={{...}}>
    <ThunderboltOutlined />
    <span>Automation</span>
    <span>Rule executions</span>
  </Button>
</div>
```

---

### 14. Remove "Configure" Button

- **Location**: Lines 1126-1140
- **Rationale**: Non-functional placeholder, unclear purpose
- **Action**: DELETE

```typescript
// REMOVE:
<Button type="link" size="small" style={{...}}>
  Configure
</Button>
```

---

### 15. Remove Details "+" Button

- **Location**: Lines 730-737
- **Rationale**: "Add custom fields" - complex feature, not v1
- **Action**: DELETE button from header

```typescript
// CHANGE FROM:
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
  <h3 style={{...}}>Details</h3>
  <Button type="text" size="small" icon={<PlusOutlined />} />
</div>

// CHANGE TO:
<h3 style={{...}}>Details</h3>
```

---

## 🔧 FUNCTIONAL IMPROVEMENTS

### 16. Simplify Priority System (Merge Urgency + Importance)

- **Current**: 3 separate fields (Priority, Urgency, Importance)
- **Issue**: Eisenhower Matrix concept, but over-complicated for users
- **Recommendation**: Keep only Priority (1-4), remove Urgency + Importance
- **Decision Point**: ⚠️ **REQUIRES BACKEND CHANGE** - mark as PHASE 2

#### If Keeping All Three (Phase 1):

- Just fix the "medium" → "normal" bug (Task #1)
- Keep all three fields as-is

#### If Simplifying (Phase 2):

```typescript
// REMOVE state:
const [urgency, setUrgency] = useState<TicketUrgency>(...);
const [importance, setImportance] = useState<TicketImportance>(...);

// REMOVE from UI:
// Lines 920-943 (Urgency section)
// Lines 945-968 (Importance section)

// ENHANCE Priority section with better labels:
<Select value={priority} onChange={setPriority}>
  <Option value={1}>
    {getPriorityIcon(1)} Low - Can wait
  </Option>
  <Option value={2}>
    {getPriorityIcon(2)} Medium - Normal timeline
  </Option>
  <Option value={3}>
    {getPriorityIcon(3)} High - Soon
  </Option>
  <Option value={4}>
    {getPriorityIcon(4)} Critical - Urgent
  </Option>
</Select>
```

---

### 17. Implement Assignee Selection UI (Currently Read-Only)

- **Location**: Lines 797-863
- **Current**: Shows assigned users, "Assign to me" button (non-functional)
- **Required**:
  1. User selection dropdown
  2. Multi-select support
  3. Search functionality
  4. Avatar display in dropdown

```typescript
// ADD import:
import { UserService } from "../services";

// ADD state for user list:
const [availableUsers, setAvailableUsers] = useState<any[]>([]);

// LOAD users on modal open:
useEffect(() => {
  if (open && currentProject) {
    UserService.getUsers()
      .then(users => setAvailableUsers(users))
      .catch(error => console.error("Failed to load users:", error));
  }
}, [open, currentProject]);

// REPLACE assignee section with Select:
<Select
  mode="multiple"
  value={assignees}
  onChange={setAssignees}
  placeholder="Assign to..."
  style={{ width: "100%" }}
  size="small"
  optionLabelProp="label"
>
  {availableUsers.map(user => (
    <Option
      key={user.id}
      value={user.id}
      label={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Avatar size={20} style={{ backgroundColor: "#2C3E50" }}>
            {user.first_name?.[0]}{user.last_name?.[0]}
          </Avatar>
          {user.first_name} {user.last_name}
        </div>
      }
    >
      {/* Full display in dropdown */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Avatar size={24} style={{ backgroundColor: "#2C3E50" }}>
          {user.first_name?.[0]}{user.last_name?.[0]}
        </Avatar>
        <div>
          <div>{user.first_name} {user.last_name}</div>
          <div style={{ fontSize: "12px", color: "#9E9E9E" }}>{user.email}</div>
        </div>
      </div>
    </Option>
  ))}
</Select>

// KEEP "Assign to me" button:
<Button
  type="link"
  size="small"
  onClick={() => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (currentUser.id && !assignees.includes(currentUser.id)) {
      setAssignees([...assignees, currentUser.id]);
    }
  }}
>
  Assign to me
</Button>
```

---

### 18. Fix Reporter Field (Currently Hardcoded Mock Data)

- **Location**: Lines 1048-1068
- **Current**: Shows "Boris Karaya" (hardcoded)
- **Fix**: Show actual ticket creator from API

```typescript
// REMOVE hardcoded data:
<Avatar size={24} style={{ backgroundColor: "#0052cc" }}>BK</Avatar>
<span>Boris Karaya</span>

// REPLACE WITH:
{ticket?.created_by ? (
  <>
    <Avatar size={24} style={{ backgroundColor: "#2C3E50" }}>
      {ticket.created_by.first_name?.[0]}{ticket.created_by.last_name?.[0]}
    </Avatar>
    <span style={{ fontSize: "14px", color: "#1A1A1A" }}>
      {ticket.created_by.first_name} {ticket.created_by.last_name}
    </span>
  </>
) : (
  <span style={{ fontSize: "14px", color: "#9E9E9E" }}>Unknown</span>
)}
```

**NOTE**: Requires backend to include `created_by` user object in ticket API response

---

### 19. Implement Comment System (Currently Mock UI Only)

- **Location**: Lines 625-642
- **Status**: UI exists, no backend integration
- **Required**:
  1. Backend model: `TicketComment` (ticket, user, content, created_at)
  2. API endpoints: GET/POST/PATCH/DELETE `/api/tickets/{id}/comments/`
  3. Frontend service: `commentService.ts`
  4. State management for comment list

#### Phase 1 (Simple Comments - No Threading):

```typescript
// ADD state:
const [comments, setComments] = useState<any[]>([]);
const [loadingComments, setLoadingComments] = useState(false);

// LOAD comments:
useEffect(() => {
  if (open && !isCreateMode && ticket) {
    setLoadingComments(true);
    commentService
      .getComments(ticket.id)
      .then((comments) => setComments(comments))
      .catch((error) => console.error("Failed to load comments:", error))
      .finally(() => setLoadingComments(false));
  }
}, [open, ticket, isCreateMode]);

// HANDLE comment submission:
const handleCommentSubmit = async () => {
  if (!comment.trim() || !ticket) return;

  try {
    const newComment = await commentService.createComment(ticket.id, {
      content: comment,
    });
    setComments([...comments, newComment]);
    setComment("");
    message.success("Comment added");
  } catch (error) {
    message.error("Failed to add comment");
  }
};

// RENDER comments list:
{
  activeTab === "comments" && (
    <div style={{ marginTop: "16px" }}>
      {loadingComments ? (
        <Spin />
      ) : (
        comments.map((comment) => (
          <div
            key={comment.id}
            style={{ display: "flex", gap: "12px", marginBottom: "16px" }}
          >
            <Avatar size={32} style={{ backgroundColor: "#2C3E50" }}>
              {comment.user.first_name?.[0]}
              {comment.user.last_name?.[0]}
            </Avatar>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: "4px" }}>
                <span style={{ fontWeight: 500, marginRight: "8px" }}>
                  {comment.user.first_name} {comment.user.last_name}
                </span>
                <span style={{ fontSize: "12px", color: "#9E9E9E" }}>
                  {dayjs(comment.created_at).fromNow()}
                </span>
              </div>
              <div style={{ fontSize: "14px", color: "#1A1A1A" }}>
                {comment.content}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// UPDATE textarea with submit button:
<div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
  <TextArea
    value={comment}
    onChange={(e) => setComment(e.target.value)}
    placeholder="Add a comment..."
    autoSize={{ minRows: 1, maxRows: 10 }}
    onPressEnter={(e) => {
      if (e.ctrlKey || e.metaKey) {
        handleCommentSubmit();
      }
    }}
  />
  <Button
    type="primary"
    onClick={handleCommentSubmit}
    disabled={!comment.trim()}
  >
    Comment
  </Button>
</div>;
```

#### Backend Models Needed:

```python
# tickets/models.py
class TicketComment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
```

---

### 20. Implement History Tracking (Currently Empty Tab)

- **Location**: Activity tabs - "History" tab has no content
- **Required**:
  1. Backend: `TicketHistory` model (track field changes)
  2. Django signals to auto-create history on ticket update
  3. API endpoint: GET `/api/tickets/{id}/history/`
  4. Frontend rendering of changes

#### Phase 1 (Basic History):

Track only: Status, Assignee, Priority, Due Date changes

```typescript
// ADD state:
const [history, setHistory] = useState<any[]>([]);
const [loadingHistory, setLoadingHistory] = useState(false);

// LOAD history:
useEffect(() => {
  if (open && !isCreateMode && ticket && activeTab === "history") {
    setLoadingHistory(true);
    ticketService
      .getHistory(ticket.id)
      .then((history) => setHistory(history))
      .catch((error) => console.error("Failed to load history:", error))
      .finally(() => setLoadingHistory(false));
  }
}, [open, ticket, isCreateMode, activeTab]);

// RENDER history:
{
  activeTab === "history" && (
    <div style={{ marginTop: "16px" }}>
      {loadingHistory ? (
        <Spin />
      ) : history.length === 0 ? (
        <Empty description="No changes yet" />
      ) : (
        history.map((entry) => (
          <div
            key={entry.id}
            style={{
              marginBottom: "12px",
              paddingBottom: "12px",
              borderBottom: "1px solid #E0E0E0",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#9E9E9E",
                marginBottom: "4px",
              }}
            >
              {dayjs(entry.created_at).format("MMM D, YYYY [at] h:mm A")}
            </div>
            <div style={{ fontSize: "14px" }}>
              <span style={{ fontWeight: 500 }}>
                {entry.user.first_name} {entry.user.last_name}
              </span>
              {" changed "}
              <span style={{ fontWeight: 500 }}>{entry.field_name}</span>
              {" from "}
              <span
                style={{ textDecoration: "line-through", color: "#9E9E9E" }}
              >
                {entry.old_value || "(none)"}
              </span>
              {" to "}
              <span style={{ fontWeight: 500 }}>{entry.new_value}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
```

#### Backend Models Needed:

```python
# tickets/models.py
class TicketHistory(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='history')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

# tickets/signals.py (auto-track changes)
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

TRACKED_FIELDS = ['column', 'priority_id', 'urgency', 'importance', 'due_date', 'start_date']

@receiver(pre_save, sender=Ticket)
def track_ticket_changes(sender, instance, **kwargs):
    if instance.pk:  # Only for updates
        try:
            old_ticket = Ticket.objects.get(pk=instance.pk)
            for field in TRACKED_FIELDS:
                old_value = getattr(old_ticket, field)
                new_value = getattr(instance, field)
                if old_value != new_value:
                    # Store in thread-local for post_save
                    if not hasattr(instance, '_field_changes'):
                        instance._field_changes = []
                    instance._field_changes.append({
                        'field_name': field,
                        'old_value': str(old_value),
                        'new_value': str(new_value)
                    })
        except Ticket.DoesNotExist:
            pass

@receiver(post_save, sender=Ticket)
def create_history_entries(sender, instance, created, **kwargs):
    if hasattr(instance, '_field_changes'):
        for change in instance._field_changes:
            TicketHistory.objects.create(
                ticket=instance,
                user=instance.updated_by,  # Need to add this field to Ticket model
                **change
            )
```

---

### 21. Fix Tags Field (Currently Not Saving Properly)

- **Location**: Lines 995-1024
- **Issue**: Using `mode="tags"` with free text, but backend expects tag IDs
- **Current Flow**:
  - User types tag names
  - Frontend sends tag names as array
  - Backend expects tag IDs (integers)

```typescript
// CHANGE FROM (current):
<Select
  mode="tags"
  value={tags}  // Array of tag IDs
  onChange={(value) => setTags(value)}
  options={projectTags.map(tag => ({ value: tag.name, label: tag.name }))}
/>

// CHANGE TO (corrected):
<Select
  mode="multiple"  // Use multiple, not tags
  value={tags}  // Array of tag IDs
  onChange={(value) => setTags(value)}
  placeholder="Select tags"
  style={{ width: "100%" }}
  size="small"
  filterOption={(input, option) =>
    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
  }
  options={
    Array.isArray(projectTags)
      ? projectTags.map((tag) => ({
          value: tag.id,  // Use ID, not name
          label: tag.name,
        }))
      : []
  }
/>

// ADD "Create new tag" button below:
<Button
  type="link"
  size="small"
  icon={<PlusOutlined />}
  style={{ padding: "4px 0", fontSize: "12px" }}
  onClick={() => {
    // Open CreateTagModal or inline input
    // After creation, reload tags and auto-select new tag
  }}
>
  Create new tag
</Button>
```

---

### 22. Add Date Validation (Start Date < Due Date)

- **Location**: Lines 970-1046
- **Current**: No validation, can set start date after due date
- **Fix**: Add validation on date change

```typescript
// UPDATE setDueDate handler:
const handleDueDateChange = (date: dayjs.Dayjs | null) => {
  if (date && startDate && date.isBefore(startDate)) {
    message.warning("Due date cannot be before start date");
    return;
  }
  setDueDate(date);
};

// UPDATE setStartDate handler:
const handleStartDateChange = (date: dayjs.Dayjs | null) => {
  if (date && dueDate && date.isAfter(dueDate)) {
    message.warning("Start date cannot be after due date");
    return;
  }
  setStartDate(date);
};

// UPDATE DatePicker components:
<DatePicker
  value={dueDate}
  onChange={handleDueDateChange}  // Use handler instead of setDueDate
  disabledDate={(current) => {
    // Disable dates before start date
    if (startDate) {
      return current && current.isBefore(startDate, 'day');
    }
    return false;
  }}
/>

<DatePicker
  value={startDate}
  onChange={handleStartDateChange}  // Use handler instead of setStartDate
  disabledDate={(current) => {
    // Disable dates after due date
    if (dueDate) {
      return current && current.isAfter(dueDate, 'day');
    }
    return false;
  }}
/>
```

---

### 23. Implement Fullscreen Mode

- **Location**: Line 494 (Fullscreen button)
- **Current**: Button exists but non-functional
- **Implementation**:

```typescript
// ADD state:
const [isFullscreen, setIsFullscreen] = useState(false);

// UPDATE Modal width:
width={isFullscreen ? "95vw" : 1100}

// UPDATE button:
<Button
  type="text"
  size="small"
  icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
  onClick={() => setIsFullscreen(!isFullscreen)}
  style={{ color: "#9E9E9E" }}
/>

// ADD import:
import { FullscreenOutlined, FullscreenExitOutlined } from "@ant-design/icons";
```

---

### 24. Add Loading States for Save Button

- **Location**: Lines 503-508
- **Current**: Has `loading={saving}` prop ✅
- **Enhancement**: Add success feedback

```typescript
// ENHANCE handleSave with better feedback:
const handleSave = async () => {
  // ... existing validation ...

  setSaving(true);
  try {
    // ... existing save logic ...

    message.success(
      isCreateMode ? "Ticket created successfully!" : "Changes saved!",
      2 // Duration in seconds
    );

    // Small delay before closing to show success message
    setTimeout(() => {
      onSuccess?.(savedTicket);
      onClose();
    }, 500);
  } catch (error) {
    // ... existing error handling ...
    setSaving(false); // Keep modal open on error
  }
};
```

---

## 📱 RESPONSIVE DESIGN

### 25. Add Mobile/Tablet Layout

- **Current**: Two-column layout (fixed 320px right panel)
- **Issue**: Breaks on small screens
- **Fix**: Stack columns on mobile

```typescript
// ADD media query detection:
import { Grid } from "antd";
const { useBreakpoint } = Grid;

// Inside component:
const screens = useBreakpoint();
const isMobile = !screens.md;  // < 768px

// UPDATE layout:
<div style={{
  display: "flex",
  flexDirection: isMobile ? "column" : "row"  // Stack on mobile
}}>
  {/* Left Panel */}
  <div style={{
    flex: 1,
    padding: isMobile ? "12px 16px" : "16px 24px",
    minWidth: 0
  }}>
    {/* ... content ... */}
  </div>

  {/* Right Panel */}
  <div style={{
    width: isMobile ? "100%" : "320px",
    borderLeft: isMobile ? "none" : "1px solid #E0E0E0",
    borderTop: isMobile ? "1px solid #E0E0E0" : "none",
    padding: isMobile ? "12px 16px" : "16px 24px",
    backgroundColor: "#F5F5F5"
  }}>
    {/* ... details ... */}
  </div>
</div>

// UPDATE modal width:
width={isFullscreen ? "95vw" : (isMobile ? "100%" : 1100)}
style={{ top: isMobile ? 0 : 20 }}
```

---

## 🎯 EMPTY STATES & ERROR HANDLING

### 26. Add Empty States for Activity Tabs

- **Location**: Activity section (lines 595-700)
- **Current**: Just textarea for comments, no empty state
- **Add**: Empty state when no comments/history

```typescript
{
  activeTab === "comments" && (
    <>
      {/* Comment input */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        {/* ... existing textarea ... */}
      </div>

      {/* Comments list */}
      {loadingComments ? (
        <Spin />
      ) : comments.length === 0 ? (
        <Empty
          description="No comments yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: "32px 0" }}
        />
      ) : (
        comments.map((comment) => ({
          /* ... comment rendering ... */
        }))
      )}
    </>
  );
}
```

---

### 27. Add Error Boundary for Modal

- **Purpose**: Gracefully handle errors instead of white screen
- **Implementation**: Wrap modal content in error boundary

```typescript
// CREATE new file: ErrorBoundary.tsx
import React from "react";
import { Result, Button } from "antd";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Modal error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle="Please try closing and reopening the modal"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}

// USE in TicketModal:
return (
  <Modal {...modalProps}>
    <ErrorBoundary>{/* All modal content */}</ErrorBoundary>
  </Modal>
);
```

---

## ♿ ACCESSIBILITY IMPROVEMENTS

### 28. Add Keyboard Navigation

- **Current**: Limited keyboard support
- **Add**:
  - Ctrl/Cmd + Enter to save
  - Escape to close (already works via Modal)
  - Tab navigation improvements

```typescript
// ADD keyboard handler:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }

    // Ctrl/Cmd + K to focus search (if implementing)
    // Ctrl/Cmd + M to focus comment textarea
    if ((e.ctrlKey || e.metaKey) && e.key === "m") {
      e.preventDefault();
      // Focus comment textarea
      document.querySelector('textarea[placeholder*="comment"]')?.focus();
    }
  };

  if (open) {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }
}, [open, handleSave]);

// ADD aria labels:
<Input
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  aria-label="Ticket title"
  placeholder="Add a title..."
/>

<TextArea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  aria-label="Ticket description"
  placeholder="Add a description..."
/>

<TextArea
  value={comment}
  onChange={(e) => setComment(e.target.value)}
  aria-label="Add comment"
  placeholder="Add a comment..."
/>
```

---

### 29. Improve Focus Management

- **Issue**: When modal opens, focus not automatically set
- **Fix**: Auto-focus title field

```typescript
// ADD ref for title input:
const titleInputRef = useRef<any>(null);

// AUTO-FOCUS on modal open:
useEffect(() => {
  if (open && titleInputRef.current) {
    setTimeout(() => {
      titleInputRef.current.focus();
    }, 100); // Small delay for modal animation
  }
}, [open]);

// UPDATE Input component:
<Input
  ref={titleInputRef}
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  placeholder="Add a title..."
/>;
```

---

## 🧪 TESTING & VALIDATION

### 30. Add Form Validation Messages

- **Current**: Only checks if title exists
- **Add**: Validate all required fields before save

```typescript
const validateForm = (): boolean => {
  // Title required
  if (!title.trim()) {
    message.error("Please enter a ticket title");
    titleInputRef.current?.focus();
    return false;
  }

  // Column required for create mode
  if (isCreateMode && !selectedColumn) {
    message.error("Please select a status column");
    return false;
  }

  // Project required for create mode
  if (isCreateMode && !selectedProjectId) {
    message.error("Please select a project");
    return false;
  }

  // Date validation
  if (startDate && dueDate && startDate.isAfter(dueDate)) {
    message.error("Start date cannot be after due date");
    return false;
  }

  return true;
};

// USE in handleSave:
const handleSave = async () => {
  if (!validateForm()) {
    return;
  }

  // ... rest of save logic ...
};
```

---

### 31. Add Unsaved Changes Warning

- **Issue**: User can close modal without saving, losing changes
- **Fix**: Detect changes and show confirmation

```typescript
// ADD state to track if form is dirty:
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// TRACK changes:
useEffect(() => {
  if (!ticket) return;  // Skip for create mode

  const hasChanges =
    title !== (ticket.name || "") ||
    description !== (ticket.description || "") ||
    priority !== (ticket.priority_id || 3) ||
    urgency !== (ticket.urgency || "normal") ||
    importance !== (ticket.importance || "normal") ||
    // ... check other fields ...
    false;

  setHasUnsavedChanges(hasChanges);
}, [title, description, priority, urgency, importance, ticket]);

// WARN on close:
const handleClose = () => {
  if (hasUnsavedChanges) {
    Modal.confirm({
      title: "Unsaved changes",
      content: "You have unsaved changes. Are you sure you want to close?",
      okText: "Discard",
      cancelText: "Keep editing",
      okButtonProps: { danger: true },
      onOk: () => {
        setHasUnsavedChanges(false);
        onClose();
      },
    });
  } else {
    onClose();
  }
};

// UPDATE close button:
<Button
  type="text"
  size="small"
  icon={<CloseOutlined />}
  onClick={handleClose}  // Use handler instead of onClose
/>

// UPDATE Modal onCancel:
<Modal
  onCancel={handleClose}  // Use handler instead of onClose
  // ... other props ...
>
```

---

## 📊 PERFORMANCE OPTIMIZATION

### 32. Add Debouncing for Auto-Save (Future Feature)

- **Purpose**: If implementing auto-save, prevent excessive API calls
- **Implementation**:

```typescript
import { useCallback } from "react";
import debounce from "lodash/debounce";

// CREATE debounced save function:
const debouncedAutoSave = useCallback(
  debounce(async (data: Partial<CreateTicketData>) => {
    if (!ticket) return; // Only for edit mode

    try {
      await ticketService.updateTicket(ticket.id, data);
      console.log("Auto-saved");
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, 2000), // Wait 2 seconds after typing stops
  [ticket]
);

// TRIGGER on field changes:
useEffect(() => {
  if (!isCreateMode && title) {
    debouncedAutoSave({ name: title });
  }
}, [title, isCreateMode, debouncedAutoSave]);

// CLEANUP on unmount:
useEffect(() => {
  return () => {
    debouncedAutoSave.cancel();
  };
}, [debouncedAutoSave]);
```

**NOTE**: Only implement if user requests auto-save feature

---

### 33. Optimize Re-renders with useMemo/useCallback

- **Purpose**: Prevent unnecessary re-renders
- **Locations**: Event handlers, computed values

```typescript
// MEMOIZE event handlers:
const handleTitleChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  },
  []
);

const handleDescriptionChange = useCallback(
  (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  },
  []
);

// MEMOIZE computed values:
const typeInfo = useMemo(() => getTypeIcon(ticketType), [ticketType]);

const formattedDueDate = useMemo(() => {
  return dueDate ? dueDate.format("YYYY-MM-DD") : undefined;
}, [dueDate]);
```

---

## 🗂️ CODE ORGANIZATION

### 34. Extract Sections into Separate Components

- **Purpose**: Make TicketModal more maintainable
- **Create new components**:

```typescript
// NEW FILE: TicketModalHeader.tsx
export const TicketModalHeader: React.FC<{
  isCreateMode: boolean;
  ticket?: Ticket;
  ticketType: string;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}> = ({ ... }) => {
  // Header rendering logic
};

// NEW FILE: TicketModalDetails.tsx
export const TicketModalDetails: React.FC<{
  isCreateMode: boolean;
  ticket?: Ticket;
  selectedProjectId: number | null;
  selectedColumn: number;
  priority: number;
  urgency: TicketUrgency;
  importance: TicketImportance;
  dueDate: dayjs.Dayjs | null;
  startDate: dayjs.Dayjs | null;
  tags: number[];
  assignees: number[];
  // ... all setters
  availableProjects: Project[];
  projectColumns: any[];
  projectTags: any[];
  onProjectChange: (id: number) => void;
}> = ({ ... }) => {
  // Right panel rendering logic
};

// NEW FILE: TicketModalActivity.tsx
export const TicketModalActivity: React.FC<{
  ticket?: Ticket;
  activeTab: string;
  onTabChange: (key: string) => void;
  comments: any[];
  history: any[];
  loadingComments: boolean;
  loadingHistory: boolean;
}> = ({ ... }) => {
  // Activity section rendering logic
};

// SIMPLIFIED TicketModal.tsx:
export const TicketModal: React.FC<TicketModalProps> = ({ ... }) => {
  // State management only

  return (
    <Modal {...modalProps}>
      <TicketModalHeader {...headerProps} />
      <div style={{ display: "flex" }}>
        <div style={{ flex: 1 }}>
          {/* Title */}
          {/* Description */}
          <TicketModalActivity {...activityProps} />
        </div>
        <TicketModalDetails {...detailsProps} />
      </div>
    </Modal>
  );
};
```

---

### 35. Create Reusable Field Components

- **Purpose**: DRY principle for repeated field patterns

```typescript
// NEW FILE: TicketField.tsx
export const TicketField: React.FC<{
  label: string;
  children: React.ReactNode;
  required?: boolean;
}> = ({ label, children, required }) => (
  <div style={{ marginBottom: "16px" }}>
    <div
      style={{
        fontSize: "12px",
        fontWeight: 600,
        color: "#9E9E9E",
        marginBottom: "4px",
      }}
    >
      {label}
      {required && <span style={{ color: "#E74C3C" }}> *</span>}
    </div>
    {children}
  </div>
);

// USE in TicketModal:
<TicketField label="Status" required>
  <Select value={selectedColumn} onChange={setSelectedColumn}>
    {/* options */}
  </Select>
</TicketField>

<TicketField label="Due date">
  <DatePicker value={dueDate} onChange={setDueDate} />
</TicketField>
```

---

## 📝 DOCUMENTATION

### 36. Add JSDoc Comments

- **Purpose**: Better IntelliSense and maintainability

````typescript
/**
 * Full-screen modal for viewing and editing ticket details
 *
 * @component
 * @example
 * ```tsx
 * <TicketModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   ticket={selectedTicket}
 *   mode="edit"
 *   onSuccess={(updatedTicket) => {
 *     // Refresh ticket list
 *   }}
 * />
 * ```
 */
export const TicketModal: React.FC<TicketModalProps> = ({ ... }) => {
  // ...
};

/**
 * Validates ticket form data before submission
 *
 * @returns {boolean} True if form is valid, false otherwise
 * @fires message.error - Shows error message for invalid fields
 */
const validateForm = (): boolean => {
  // ...
};

/**
 * Saves ticket data (create or update based on mode)
 *
 * @async
 * @fires message.success - On successful save
 * @fires message.error - On save failure
 * @fires onSuccess - Callback with saved ticket data
 * @fires onClose - Closes modal after successful save
 */
const handleSave = async () => {
  // ...
};
````

---

## 🔄 IMPLEMENTATION PHASES

### **PHASE 1: Critical Fixes & Design Updates** (Est: 4-6 hours)

**Priority**: 🔴 CRITICAL - Do first

- [ ] Task #1: Fix urgency/importance bug (medium → normal)
- [ ] Task #2: Replace Jira colors with Design Bible palette
- [ ] Task #3: Update typography (colors, sizes)
- [ ] Task #4: Reduce spacing for compact density
- [ ] Task #5-15: Remove unnecessary features (epics, subtasks, etc.)
- [ ] Task #24: Enhance save button feedback

**Outcome**: Modal works correctly, looks professional, minimalist

---

### **PHASE 2: Core Functionality** (Est: 8-12 hours)

**Priority**: 🟡 HIGH - Essential features

- [ ] Task #17: Implement assignee selection UI
- [ ] Task #18: Fix reporter field (remove hardcoded data)
- [ ] Task #21: Fix tags field (use IDs, not names)
- [ ] Task #22: Add date validation
- [ ] Task #23: Implement fullscreen mode
- [ ] Task #30: Add form validation messages
- [ ] Task #31: Add unsaved changes warning

**Outcome**: All metadata fields work correctly

---

### **PHASE 3: Collaboration Features** (Est: 12-16 hours)

**Priority**: 🟢 MEDIUM - Add after core works

**Backend Work Required**:

- [ ] Create `TicketComment` model
- [ ] Create `TicketHistory` model
- [ ] Create API endpoints (comments, history)
- [ ] Implement Django signals for auto-history

**Frontend Work**:

- [ ] Task #19: Implement comment system
- [ ] Task #20: Implement history tracking
- [ ] Task #26: Add empty states for activity tabs

**Outcome**: Users can comment and see change history

---

### **PHASE 4: Polish & UX** (Est: 6-8 hours)

**Priority**: 🟢 LOW - Nice to have

- [ ] Task #25: Add responsive design (mobile/tablet)
- [ ] Task #28: Add keyboard navigation
- [ ] Task #29: Improve focus management
- [ ] Task #27: Add error boundary
- [ ] Task #33: Optimize re-renders
- [ ] Task #36: Add JSDoc comments

**Outcome**: Polished, accessible, performant modal

---

### **PHASE 5: Code Organization** (Est: 4-6 hours)

**Priority**: 🔵 OPTIONAL - If time permits

- [ ] Task #34: Extract sections into components
- [ ] Task #35: Create reusable field components
- [ ] Refactor for better testability
- [ ] Add unit tests

**Outcome**: Maintainable, scalable codebase

---

## 📋 BACKEND REQUIREMENTS SUMMARY

### Models to Create:

1. **TicketComment** (Task #19)

   - Fields: `ticket`, `user`, `content`, `created_at`, `updated_at`
   - Related name: `comments`

2. **TicketHistory** (Task #20)

   - Fields: `ticket`, `user`, `field_name`, `old_value`, `new_value`, `created_at`
   - Related name: `history`

3. **Ticket Model Updates**:
   - Add `created_by` field (ForeignKey to User)
   - Add `updated_by` field (ForeignKey to User)
   - Ensure `assignees` ManyToMany works correctly

### API Endpoints to Create:

- `GET /api/tickets/{id}/comments/` - List comments
- `POST /api/tickets/{id}/comments/` - Create comment
- `PATCH /api/tickets/comments/{id}/` - Edit comment (future)
- `DELETE /api/tickets/comments/{id}/` - Delete comment (future)
- `GET /api/tickets/{id}/history/` - List change history

### Django Signals:

- Pre-save signal to detect field changes
- Post-save signal to create history entries

---

## ✅ TESTING CHECKLIST

After implementation, test:

### Functionality:

- [ ] Create new ticket (all fields save correctly)
- [ ] Edit existing ticket (changes save)
- [ ] Close without saving (warning appears if changes made)
- [ ] Urgency/Importance dropdowns (no "medium" option, "normal" works)
- [ ] Date validation (start < due)
- [ ] Assignee selection (multi-select works)
- [ ] Tags selection (IDs sent, not names)
- [ ] Comment creation (appears in list)
- [ ] History tracking (changes logged)
- [ ] Fullscreen toggle (works)

### Design:

- [ ] Colors match Design Bible (Slate #2C3E50, Orange #E67E22, Gray #9E9E9E)
- [ ] Typography correct (Inter font, correct sizes)
- [ ] Spacing compact (12px padding, 16px between sections)
- [ ] No removed features visible (epics, subtasks, automation, etc.)
- [ ] Empty states simple (no decorative elements)

### Responsive:

- [ ] Desktop (1920px) - looks good
- [ ] Laptop (1366px) - looks good
- [ ] Tablet (768px) - columns stack
- [ ] Mobile (375px) - fully usable

### Accessibility:

- [ ] Keyboard navigation works
- [ ] Ctrl+Enter saves
- [ ] Tab order logical
- [ ] Screen reader labels present
- [ ] Focus indicators visible

---

## 📊 PROGRESS TRACKING

**Total Tasks**: 36  
**Completed**: 0  
**In Progress**: 0

**Estimated Total Time**: 34-48 hours

### By Phase:

- Phase 1 (Critical): 0/10 tasks - 4-6 hours
- Phase 2 (Core): 0/7 tasks - 8-12 hours
- Phase 3 (Collaboration): 0/4 tasks - 12-16 hours
- Phase 4 (Polish): 0/6 tasks - 6-8 hours
- Phase 5 (Organization): 0/4 tasks - 4-6 hours
- Testing: 0/31 items

---

**Last Updated**: November 2, 2025  
**Status**: Ready to begin Phase 1  
**Next Action**: Fix urgency/importance bug (Task #1)
