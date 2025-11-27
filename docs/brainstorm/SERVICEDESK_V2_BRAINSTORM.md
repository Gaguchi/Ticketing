# Service Desk Portal v2 - Brainstorm

> **Goal**: Complete overhaul of the servicedesk frontend to create a world-class end-user ticket portal
> **Status**: Brainstorming (Revised)
> **Created**: November 27, 2025
> **Last Updated**: With user feedback

---

## ⚡ Key Design Decisions (User Feedback)

| Decision         | Choice       | Notes                                |
| ---------------- | ------------ | ------------------------------------ |
| Stats/Summaries  | ❌ Remove    | "I think they are useless"           |
| Ticket Display   | 📇 Cards     | Not tables - more visual             |
| Progress Display | ○─○─●─○─○    | Chain visualization                  |
| Remote Desktop   | ✅ Add Field | AnyDesk/TeamViewer/RustDesk dropdown |

---

## Competitor Analysis

Let's analyze the best service desk portals and steal their best ideas:

### 1. Zendesk Help Center

**What they do well:**

- [ ] Clean, branded portal per company
- [ ] Prominent search bar ("How can we help?")
- [ ] Simple ticket form
- [ ] Clear ticket status tracking
- [ ] Mobile-first responsive design

### 2. Freshdesk Customer Portal

**What they do well:**

- [ ] "Submit a ticket" button always visible
- [ ] Ticket timeline view
- [ ] File attachment previews
- [ ] Satisfaction rating on resolution

### 3. Jira Service Management Portal

**What they do well:**

- [ ] Request types with icons
- [ ] SLA visibility for customers
- [ ] Clean minimalist design

---

## Current Service Desk State

**What we have now:**

- Basic login
- Ticket list view
- Ticket creation
- Uses Tailwind + some Ant Design

**What's missing:**

- [ ] Proper branding/theming
- [ ] Great UX for ticket creation
- [ ] Clear ticket status visualization (progress chain!)
- [ ] Satisfaction rating flow
- [ ] Mobile optimization
- [ ] Empty states
- [ ] Remote desktop integration

---

## Proposed Pages & Features

### Page 1: Login

**Current**: Basic login form
**Proposed**:

- [ ] Company-branded login (logo, colors)
- [ ] "Forgot password" flow
- [ ] Clean, centered card design
- [ ] Remember me option

### Page 2: Dashboard / Home

**Current**: Ticket list
**Proposed**:

- [ ] Welcome message with user name
- [ ] "Create New Ticket" prominent CTA (BIG button)
- [ ] Recent tickets as **CARDS** (not table!)
- [ ] Each card shows progress chain
- [ ] Quick actions (v2+)

**Layout Concept**:

```
┌─────────────────────────────────────────────────────────┐
│  Logo                              User Menu ▼          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  👋 Welcome back, John!                                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🆕  Create New Ticket                    →     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📋 My Recent Tickets                                   │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │ 🎫 TICK-42          │  │ 🎫 TICK-41          │      │
│  │ Can't access email  │  │ New laptop request  │      │
│  │                     │  │                     │      │
│  │ ○───○───●───○───○   │  │ ●───●───●───●───○   │      │
│  │ Open → In Progress  │  │ Pending Rating      │      │
│  │                     │  │                     │      │
│  │ Updated: 2h ago     │  │ Updated: 1d ago     │      │
│  └─────────────────────┘  └─────────────────────┘      │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │ 🎫 TICK-40          │  │ 🎫 TICK-39          │      │
│  │ VPN not working     │  │ Printer setup       │      │
│  │                     │  │                     │      │
│  │ ●───●───●───●───●   │  │ ●───●───●───●───●   │      │
│  │ Closed ✓            │  │ Closed ✓            │      │
│  │                     │  │                     │      │
│  │ Rated: ⭐⭐⭐⭐⭐      │  │ Rated: ⭐⭐⭐⭐        │      │
│  └─────────────────────┘  └─────────────────────┘      │
│                                                         │
│  [View All Tickets]                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Page 3: All My Tickets

**Current**: Basic table
**Proposed**:

- [ ] Filter tabs: All | Open | Resolved | Closed
- [ ] Search within my tickets
- [ ] Sort by: Date, Status
- [ ] **CARD GRID LAYOUT** (not table!)
- [ ] Each card shows progress chain
- [ ] Infinite scroll or pagination

**Progress Chain Status**:

```
Open:           ●───○───○───○───○
In Progress:    ●───●───○───○───○
Waiting on You: ●───●───◐───○───○  (pulsing)
Resolved:       ●───●───●───●───○
Closed:         ●───●───●───●───●
```

**Card Layout Concept**:

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                                    │
│                                                         │
│  📋 All My Tickets                                      │
│                                                         │
│  [All] [Open] [Resolved] [Closed]     🔍 Search...     │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │ 🎫 TICK-42          │  │ 🎫 TICK-41          │      │
│  │ ─────────────────── │  │ ─────────────────── │      │
│  │ Can't access email  │  │ New laptop request  │      │
│  │                     │  │                     │      │
│  │ ●───●───○───○───○   │  │ ●───●───●───●───○   │      │
│  │ In Progress         │  │ Resolved            │      │
│  │                     │  │                     │      │
│  │ 📅 Nov 27           │  │ 📅 Nov 26           │      │
│  │ 💬 2 messages       │  │ 💬 4 messages       │      │
│  └─────────────────────┘  └─────────────────────┘      │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │ 🎫 TICK-40          │  │ 🎫 TICK-39          │      │
│  │ ─────────────────── │  │ ─────────────────── │      │
│  │ VPN not working     │  │ Printer setup       │      │
│  │                     │  │                     │      │
│  │ ●───●───●───●───●   │  │ ●───●───●───●───●   │      │
│  │ Closed              │  │ Closed              │      │
│  │                     │  │                     │      │
│  │ ⭐⭐⭐⭐⭐ Great!      │  │ ⭐⭐⭐⭐ Good         │      │
│  └─────────────────────┘  └─────────────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Progress Chain Status - PULL FROM PROJECT COLUMNS

> **IMPORTANT**: The progress chain stages should be dynamically pulled from the project's Kanban columns, NOT hardcoded.

**Current Implementation Issue**: We have hardcoded stages (Open → In Progress → Waiting → Resolved)

**Correct Approach**:

1. Fetch project columns from API
2. Display them in order as the progress chain
3. Highlight the column the ticket is currently in
4. **Special case**: Archived tickets should always show as fully complete (all dots filled)

**API Endpoint**: `GET /api/tickets/projects/{id}/columns/`

**Example Response**:

```json
[
  { "id": 1, "name": "To Do", "order": 0 },
  { "id": 2, "name": "In Progress", "order": 1 },
  { "id": 3, "name": "Review", "order": 2 },
  { "id": 4, "name": "Done", "order": 3 }
]
```

**Progress Chain renders as**: `○───○───○───○` with current column filled

---

### Page 4: Create Ticket (MODAL)

> **Implementation**: Modal overlay, not a separate page
> **Trigger**: "Submit a Request" button in hero banner

---

## 🎫 CREATE TICKET MODAL - DEEP DIVE

### Current State

We have a basic modal with:

- Title input
- Description textarea
- Priority dropdown
- Cancel/Submit buttons

### Design Philosophy

**Keep it SIMPLE for end users:**

- End users are NOT IT people
- They don't know "priority" levels
- They just want to describe their problem and get help
- Minimize cognitive load

**Best Practices from Competitors:**

| Service Desk | Approach                                  |
| ------------ | ----------------------------------------- |
| Zendesk      | Single text field + "Describe your issue" |
| Freshdesk    | Subject + Description + Attachments       |
| Intercom     | Chat-like "What can we help with?"        |
| Jira SM      | Request type → Dynamic form               |

---

### Option A: Minimal (Recommended for v2)

**Philosophy**: "Just tell us what's wrong"

```
┌─────────────────────────────────────────────────────────┐
│  ✕                                                      │
│                                                         │
│     📝 Submit a Request                                 │
│                                                         │
│     What do you need help with? *                       │
│     ┌─────────────────────────────────────────────┐    │
│     │ e.g., "I can't access my email"             │    │
│     └─────────────────────────────────────────────┘    │
│                                                         │
│     Tell us more (optional)                             │
│     ┌─────────────────────────────────────────────┐    │
│     │                                             │    │
│     │ Any details that might help us resolve     │    │
│     │ this faster...                              │    │
│     │                                             │    │
│     └─────────────────────────────────────────────┘    │
│                                                         │
│     📎 Attach screenshots or files                      │
│     ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│     │  📁 Drop files here or click to browse     │    │
│     └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                                         │
│                         [ Cancel ]  [ Submit Request ]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Fields:**
| Field | Required | Notes |
|-------|----------|-------|
| Subject/Title | ✅ Yes | Short description |
| Description | ❌ Optional | More details |
| Attachments | ❌ Optional | Screenshots, docs |

**NO Priority field** - Let IT triage. Users don't know what's "Critical" vs "High".

---

### Option B: With Remote Desktop (v2.1)

**Add remote desktop ID for faster support:**

```
┌─────────────────────────────────────────────────────────┐
│  ✕                                                      │
│                                                         │
│     📝 Submit a Request                                 │
│                                                         │
│     What do you need help with? *                       │
│     ┌─────────────────────────────────────────────┐    │
│     │ Brief description...                         │    │
│     └─────────────────────────────────────────────┘    │
│                                                         │
│     Tell us more (optional)                             │
│     ┌─────────────────────────────────────────────┐    │
│     │                                             │    │
│     └─────────────────────────────────────────────┘    │
│                                                         │
│     📎 Attach files                                     │
│     ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│     │  Drop files or click to browse              │    │
│     └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                                         │
│     ─────────────────────────────────────────────────   │
│                                                         │
│     🖥️ Need remote assistance? (optional)               │
│                                                         │
│     Remote Tool        Your ID                          │
│     ┌────────────┐    ┌────────────────────────┐       │
│     │ AnyDesk  ▼ │    │ 123 456 789            │       │
│     └────────────┘    └────────────────────────────┘   │
│                                                         │
│     ℹ️ This helps IT connect to your computer faster    │
│                                                         │
│                         [ Cancel ]  [ Submit Request ]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Option C: Request Types (v3 - Future)

**Let users categorize their request:**

```
┌─────────────────────────────────────────────────────────┐
│  ✕                                                      │
│                                                         │
│     What type of request is this?                       │
│                                                         │
│     ┌──────────────┐  ┌──────────────┐                 │
│     │  🔧          │  │  💻          │                 │
│     │  Something   │  │  New         │                 │
│     │  is broken   │  │  Request     │                 │
│     └──────────────┘  └──────────────┘                 │
│                                                         │
│     ┌──────────────┐  ┌──────────────┐                 │
│     │  🔑          │  │  ❓          │                 │
│     │  Access /    │  │  General     │                 │
│     │  Permissions │  │  Question    │                 │
│     └──────────────┘  └──────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘

         ↓ User selects "Something is broken" ↓

┌─────────────────────────────────────────────────────────┐
│  ← Back                                            ✕    │
│                                                         │
│     🔧 Report an Issue                                  │
│                                                         │
│     What's not working? *                               │
│     ┌─────────────────────────────────────────────┐    │
│     │                                             │    │
│     └─────────────────────────────────────────────┘    │
│                                                         │
│     When did this start happening?                      │
│     ┌─────────────────────────────────────────────┐    │
│     │ Today  ▼                                    │    │
│     └─────────────────────────────────────────────┘    │
│                                                         │
│     ...                                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Request Types could show different forms:**
| Type | Extra Fields |
|------|--------------|
| Something broken | When started, error message |
| New request | What do you need, justification |
| Access request | What system, why needed |
| General question | Just description |

---

### Recommended Implementation (v2)

**Start with Option A (Minimal) + Light enhancements:**

```tsx
interface CreateTicketData {
  name: string; // Required - "What do you need help with?"
  description?: string; // Optional - "Tell us more"
  attachments?: File[]; // Optional - Screenshots/files
}
```

**UI Enhancements:**

1. ✅ Better copy - "Submit a Request" not "Create Ticket"
2. ✅ Friendly placeholder text
3. ✅ Drag & drop file upload zone
4. ✅ File preview before submit
5. ✅ Success state after submission

---

### Success State (After Submit)

Don't just close the modal - show confirmation:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                         ✅                              │
│                                                         │
│           Request Submitted Successfully!               │
│                                                         │
│           Your ticket number is #ITT-47                 │
│                                                         │
│     We'll get back to you as soon as possible.          │
│     You can track the status in "My Tickets".           │
│                                                         │
│              [ View Ticket ]  [ Close ]                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### File Upload UX

**Drag & Drop Zone:**

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│                                                      │
│         📁 Drag files here or click to browse        │
│              PNG, JPG, PDF up to 10MB                │
│                                                      │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

         ↓ After file selected ↓

┌─────────────────────────────────────────────────────┐
│  📄 screenshot.png                    12KB    ✕     │
│  📄 error-log.txt                      3KB    ✕     │
└─────────────────────────────────────────────────────┘
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│         + Add more files                             │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

### Validation & Error States

**Inline validation:**

- Empty subject → "Please describe your issue"
- File too large → "File exceeds 10MB limit"
- Wrong file type → "Only images and PDFs allowed"

**Network error:**

```
┌─────────────────────────────────────────────────────┐
│  ⚠️ Failed to submit request. Please try again.     │
│                                          [ Retry ]  │
└─────────────────────────────────────────────────────┘
```

---

### Mobile Considerations

On mobile, modal should be:

- Full screen (not floating)
- Easy to scroll
- Large touch targets
- Native file picker for attachments

```
┌─────────────────────┐
│ ← Submit a Request  │
├─────────────────────┤
│                     │
│ What do you need    │
│ help with? *        │
│ ┌─────────────────┐ │
│ │                 │ │
│ └─────────────────┘ │
│                     │
│ Tell us more        │
│ ┌─────────────────┐ │
│ │                 │ │
│ │                 │ │
│ └─────────────────┘ │
│                     │
│ 📎 Add attachments  │
│ ┌─────────────────┐ │
│ │ 📷 Take Photo   │ │
│ │ 📁 Browse Files │ │
│ └─────────────────┘ │
│                     │
├─────────────────────┤
│ [ Submit Request ]  │
└─────────────────────┘
```

---

### Implementation Checklist

**Phase 1 (Now):**

- [ ] Rename to "Submit a Request"
- [ ] Remove priority field (IT will triage)
- [ ] Better placeholder text
- [ ] Add success confirmation screen

**Phase 2 (v2.1):**

- [ ] Drag & drop file upload
- [ ] File preview & remove
- [ ] Remote desktop ID field (collapsible)

**Phase 3 (v3):**

- [ ] Request type selection
- [ ] Dynamic forms per type
- [ ] Rich text editor option

---

### Page 5: Ticket Detail

**Current**: Basic view
**Proposed**:

- [ ] Clear header with ticket ID, status, subject
- [ ] **Progress chain** at top
- [ ] Timeline/conversation view (like email thread)
- [ ] Remote Desktop ID display (if provided)
- [ ] Status change history (subtle)
- [ ] Add reply/comment form at bottom
- [ ] Attachment display with previews
- [ ] Assigned agent info
- [ ] **Satisfaction rating** when status = Resolved

**Layout Concept**:

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Tickets                                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ TICK-42                                         │   │
│  │ Can't access my email since this morning       │   │
│  │                                                  │   │
│  │        ●───●───○───○───○                        │   │
│  │      Open → In Progress                         │   │
│  │                                                  │   │
│  │ Created: Nov 27, 2025 at 9:00 AM               │   │
│  │ Assigned to: John from IT                       │   │
│  │ 🖥️ AnyDesk ID: 123 456 789                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  💬 Conversation                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 👤 You · Nov 27, 9:00 AM                        │   │
│  │ I can't access my Outlook email. It says       │   │
│  │ "password incorrect" but I haven't changed it. │   │
│  │ 📎 screenshot.png                               │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🛠️ John (IT) · Nov 27, 9:30 AM                  │   │
│  │ Hi! I see your account was locked due to       │   │
│  │ multiple failed attempts. I've unlocked it.    │   │
│  │ Please try again with your current password.   │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 👤 You · Nov 27, 9:45 AM                        │   │
│  │ It works now! Thank you so much!               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Write a reply...                                │   │
│  │                                              📎 │   │
│  │                              [ Send Reply ]     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Page 6: Satisfaction Rating (Modal or Section)

**When**: Ticket status changes to "Resolved"
**Proposed**:

- [ ] Star rating (1-5)
- [ ] Optional comment
- [ ] Quick and unobtrusive
- [ ] Shows on ticket detail when resolved
- [ ] "Was this resolved to your satisfaction?"

**Concept**:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ✅ This ticket has been resolved                      │
│                                                         │
│   How would you rate your experience?                   │
│                                                         │
│           ☆  ☆  ☆  ☆  ☆                                │
│         (click to rate 1-5 stars)                       │
│                                                         │
│   Any additional feedback? (optional)                   │
│   ┌─────────────────────────────────────────────────┐  │
│   │                                                  │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│            [ Skip ]  [ Submit Feedback ]                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Design Guidelines

### Visual Style

- [ ] Clean, minimal, modern
- [ ] Lots of white space
- [ ] Clear visual hierarchy
- [ ] Consistent color palette
- [ ] Mobile-first responsive

### Colors

- Primary: Blue (trust, professional)
- Success: Green
- Warning: Orange/Yellow
- Error: Red
- Neutral: Grays

### Typography

- Clear, readable fonts
- Good contrast
- Proper sizing hierarchy

### Components (Tailwind-based)

- Consistent button styles
- Clear form inputs
- Status badges
- Card components
- Empty states

---

## User Flows

### Flow 1: Create and Track Ticket

```
Login → Dashboard → Click "Create Ticket" → Fill Form → Submit
→ See Confirmation → View in My Tickets → Get notification when updated
→ View ticket detail → See agent response → Reply if needed
→ Ticket resolved → Rate satisfaction → Done
```

### Flow 2: Check Ticket Status

```
Login → Dashboard → See recent tickets → Click one → View status & conversation
```

### Flow 3: Respond to Agent

```
Get email notification → Click link → Login → Ticket detail → Write reply → Send
```

---

## Technical Approach

### Keep

- React + TypeScript
- Tailwind CSS (primary styling)
- Existing API service patterns
- Current auth flow

### Consider Adding

- [ ] Framer Motion for subtle animations
- [ ] React Hook Form for better form handling
- [ ] Better loading states (skeletons)

### Remove/Replace

- [ ] Excess Ant Design components (keep it clean/custom)
- [ ] Complex navigation

---

## MVP Features (v2.0)

### Must Have

- [ ] Clean dashboard (NO stats, just welcome + big CTA)
- [ ] Ticket list as **card grid** with progress chains
- [ ] Simple ticket creation with remote desktop ID field
- [ ] Ticket detail with conversation + progress chain
- [ ] Satisfaction rating

### Nice to Have (v2.1)

- [ ] Company branding (logo, colors)
- [ ] File attachment previews
- [ ] "Connect" button for remote sessions (opens user's preferred tool)

### Future (v3+)

- [ ] **RustDesk self-hosted** - Replace AnyDesk/TeamViewer entirely (free, open-source, AGPL-3.0)
- [ ] Live chat widget
- [ ] Multiple request types
- [ ] Mobile app

---

## Questions to Resolve

1. [ ] Show assigned agent name to user? (builds trust)
2. [ ] Show SLA/expected response time to user?
3. [ ] Email notifications scope?
4. [ ] Company branding in v2 or later?
5. [ ] Rich text editor for descriptions?

---

## 🖥️ Remote Desktop Integration Research

> **Status**: Future consideration (v3+)
> **Deployment Guide**: `docs/deployment/RUSTDESK_DOKPLOY_SETUP.md`

### Option 1: ID Field Only (v2.0 - Recommended Start)

Just store the remote desktop ID and tool type. Admin copies ID and connects manually.

**Backend Changes Needed:**

```python
# Add to Ticket model
remote_desktop_tool = models.CharField(
    max_length=50,
    choices=[
        ('anydesk', 'AnyDesk'),
        ('teamviewer', 'TeamViewer'),
        ('rustdesk', 'RustDesk'),
        ('chrome_rd', 'Chrome Remote Desktop'),
        ('other', 'Other'),
    ],
    null=True, blank=True
)
remote_desktop_id = models.CharField(max_length=100, null=True, blank=True)
```

**Pros:**

- ✅ Simple to implement
- ✅ No infrastructure needed
- ✅ Works with any tool user already has

**Cons:**

- ❌ Manual copy-paste workflow
- ❌ User must install separate software

---

### Option 2: RustDesk Self-Hosted (Future - v3+)

**What is RustDesk?**

- Open-source remote desktop (full AnyDesk/TeamViewer replacement)
- **Self-hosted** - you own the server and data
- **96k+ GitHub stars**, 20M+ downloads
- **100% FREE** under AGPL-3.0 license

**Can we replace AnyDesk with it?**
✅ **YES!** RustDesk is a complete replacement:

- Same features (remote control, file transfer, unattended access)
- Cross-platform (Windows, Mac, Linux, iOS, Android)
- Custom branding allowed
- No per-seat licensing fees
- Your data never leaves your servers

**AGPL-3.0 License Notes:**

- ✅ Free for commercial use
- ✅ Can modify the code
- ✅ Can rebrand it
- ⚠️ If you modify & distribute, must open-source changes
- ✅ For internal company use = no restrictions

**Custom Branding Options:**

| Approach           | Effort | Cost | Full Rebrand?                    |
| ------------------ | ------ | ---- | -------------------------------- |
| Server config only | Easy   | Free | ❌ Partial (server name only)    |
| Build from source  | Hard   | Free | ✅ Complete white-label          |
| RustDesk Pro       | Easy   | $$   | ✅ Complete (web-based branding) |

**White-Label Build (Free, Full Control):**

1. Fork https://github.com/rustdesk/rustdesk
2. Edit branding files:
   - `res/` - Icons, images, splash screen
   - `src/lang/` - Text strings (app name, etc.)
   - `flutter/` - UI colors/theme
   - `libs/hbb_common/` - Default server config
3. Build for Windows/Mac/Linux
4. Distribute your branded installer to users

**Result:** Users see "YourCompany IT Support" instead of "RustDesk"

**Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│                    Your Infrastructure                   │
│                                                          │
│  ┌──────────────┐     ┌──────────────┐                 │
│  │ RustDesk     │     │ RustDesk     │                 │
│  │ hbbs Server  │     │ hbbr Server  │                 │
│  │ (ID/Signal)  │     │ (Relay)      │                 │
│  │ Port 21116   │     │ Port 21117   │                 │
│  └──────────────┘     └──────────────┘                 │
│          ↑                   ↑                          │
│          │                   │                          │
│  ┌───────┴───────────────────┴────────┐                │
│  │         WebSocket Ports            │                │
│  │    21118 (hbbs) / 21119 (hbbr)    │                │
│  └────────────────────────────────────┘                │
│                      ↑                                  │
│                      │                                  │
│  ┌───────────────────┴───────────────────┐             │
│  │          RustDesk Web Client          │             │
│  │    (Can be hosted on your domain!)    │             │
│  │    https://support.yourcompany.com    │             │
│  └───────────────────────────────────────┘             │
│                                                          │
└─────────────────────────────────────────────────────────┘
         ↑                              ↑
         │                              │
   ┌─────┴─────┐                 ┌──────┴──────┐
   │ End User  │                 │ IT Admin    │
   │ (Client)  │                 │ (Web/App)   │
   └───────────┘                 └─────────────┘
```

**How it could work in our system:**

1. User reports issue, includes RustDesk ID (or we auto-generate one)
2. IT Admin clicks "Connect" button in ticket detail
3. RustDesk web client opens in new tab/iframe
4. Direct remote session to user's computer

**Docker Compose Addition:**

```yaml
# Add to existing docker-compose.yml
rustdesk-server:
  image: rustdesk/rustdesk-server-s6:latest
  container_name: rustdesk
  ports:
    - "21115:21115"
    - "21116:21116"
    - "21116:21116/udp"
    - "21117:21117"
    - "21118:21118"
    - "21119:21119"
  environment:
    - RELAY=your-domain.com
    - ENCRYPTED_ONLY=1
  volumes:
    - ./rustdesk-data:/root
  restart: unless-stopped
```

**Pros:**

- ✅ **Fully integrated** into your platform
- ✅ **Self-hosted** - data stays with you
- ✅ **Free and open-source** (AGPL-3.0)
- ✅ **Web client** - admins connect via browser
- ✅ Cross-platform (Win/Mac/Linux/iOS/Android)
- ✅ Custom branding available
- ✅ No license fees per seat

**Cons:**

- ❌ Users must install RustDesk client (but it's lightweight ~15MB)
- ❌ Additional infrastructure to maintain
- ❌ Learning curve for setup

**Pro Version Available:**

- Web console for management
- OIDC/LDAP integration
- Access control
- Pricing: https://rustdesk.com/pricing.html

---

### Option 3: Chrome Remote Desktop (Deeplink Only)

Chrome Remote Desktop is free but has limitations:

- Users need Chrome browser
- Must install Chrome extension
- No programmatic API for integration
- Can only deeplink to remotedesktop.google.com

**Implementation:**

```tsx
<a href={`https://remotedesktop.google.com/support`} target="_blank">
  Open Chrome Remote Desktop
</a>
```

**Verdict:** Not great for integration, just a link.

---

### 📋 Recommendation

| Approach             | Effort      | When              |
| -------------------- | ----------- | ----------------- |
| ID Field Only        | Low         | **v2.0**          |
| RustDesk Self-Hosted | Medium-High | **v3.0** (future) |

**Implementation Path:**

1. **v2.0**: Add remote desktop ID field (dropdown + text input) - **do this now**
2. **v3.0**: Consider RustDesk deployment when you want to:
   - Eliminate AnyDesk/TeamViewer dependency
   - Keep all remote session data in-house
   - Avoid licensing costs at scale

---

## References & Inspiration

- Zendesk: https://www.zendesk.com/
- Freshdesk: https://freshdesk.com/
- Intercom: https://www.intercom.com/
- Linear: https://linear.app/ (great minimal design)
- Notion: Clean UI patterns

---

## Notes

### Progress Chain Component (React)

```tsx
// ProgressChain.tsx
type TicketStage = "open" | "in_progress" | "pending" | "resolved" | "closed";

const STAGES: TicketStage[] = [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
];

interface ProgressChainProps {
  currentStage: TicketStage;
  size?: "sm" | "md" | "lg";
}

export function ProgressChain({
  currentStage,
  size = "md",
}: ProgressChainProps) {
  const currentIndex = STAGES.indexOf(currentStage);

  const dotSize = { sm: "w-2 h-2", md: "w-3 h-3", lg: "w-4 h-4" };
  const lineWidth = { sm: "w-4", md: "w-6", lg: "w-8" };

  return (
    <div className="flex items-center">
      {STAGES.map((stage, index) => (
        <React.Fragment key={stage}>
          {/* Dot */}
          <div
            className={cn(
              dotSize[size],
              "rounded-full transition-all",
              index <= currentIndex
                ? "bg-blue-500" // filled
                : "border-2 border-gray-300 bg-white", // empty
              stage === "pending" &&
                currentStage === "pending" &&
                "animate-pulse"
            )}
          />
          {/* Line (except after last) */}
          {index < STAGES.length - 1 && (
            <div
              className={cn(
                lineWidth[size],
                "h-0.5",
                index < currentIndex ? "bg-blue-500" : "bg-gray-300"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Usage:
// <ProgressChain currentStage="in_progress" />
// Renders: ●───●───○───○───○
```

### Ticket Card Component

```tsx
// TicketCard.tsx
interface TicketCardProps {
  ticket: {
    id: string;
    title: string;
    status: TicketStage;
    createdAt: string;
    messageCount: number;
    rating?: number;
  };
  onClick: () => void;
}

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 
                 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-gray-500">🎫 {ticket.id}</span>
      </div>

      <h3 className="font-medium text-gray-900 mb-3 line-clamp-2">
        {ticket.title}
      </h3>

      <div className="mb-3">
        <ProgressChain currentStage={ticket.status} size="sm" />
        <span className="text-xs text-gray-500 mt-1 block capitalize">
          {ticket.status.replace("_", " ")}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>📅 {formatDate(ticket.createdAt)}</span>
        <span>💬 {ticket.messageCount}</span>
      </div>

      {ticket.rating && (
        <div className="mt-2 text-sm">{"⭐".repeat(ticket.rating)}</div>
      )}
    </div>
  );
}
```
