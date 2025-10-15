# Ticketing System - Planning Session

## Tech Stack

### Backend

- **Django** - Main backend framework
- **Django REST Framework** - API development
- **Django Channels** - WebSocket support (real-time notifications, chat)
- **Celery** - Background tasks and automation rules

### Frontend

- **React** - UI library
- **Vite** - Build tool
- **Admin Panel Framework** - TBD (Options: React-Admin, Refine, AdminJS)
- **WebSocket Client** - Real-time communication

### Database

- **PostgreSQL** - Primary database (recommended for Django)

---

## Feature Analysis & Planning

### 1. Ticket Creation and Management

#### Initial Implementation (MVP)

- **Manual ticket creation** by admins/users
- **Basic status management**: Open, In Progress, Resolved, Closed

#### Future Enhancements

- **AI-assisted ticket creation** using local LLM
  - Auto-categorization
  - Auto-generated summaries

#### Custom Issue Types (Jira-inspired)

- Allow admins to create custom issue types
  - Examples: Website Bug, Clerical Error, Product Return, Feature Request, etc.
- Each issue type can have:
  - Custom fields
  - Custom workflows
  - Different SLA rules

**Technical Considerations:**

- Database schema needs flexible field system
- JSON fields or separate related tables for custom fields
- Workflow engine for status transitions

---

### 2. Email-to-Ticket System

#### Email-to-Ticket Workflow (MVP)

**Automated Ticket Creation Process:**

1. **Email Reception**

   - User sends email to dedicated support address (e.g., `support@company.com`)
   - System monitors email inbox (IMAP/POP3 or webhook-based)

2. **First Email from User → New Ticket**

   - Automatically creates a new ticket
   - Email subject → Ticket title
   - Email body → Ticket description
   - Email sender → Ticket creator (user)
   - Email attachments → Ticket attachments

3. **Subsequent Emails → Update Existing Ticket**

   - Same email address + same conversation thread → Updates existing ticket
   - Email content added as new entry in ticket timeline
   - Maintains conversation continuity
   - Does NOT create duplicate tickets

4. **Admin Reply → Email to User**
   - Admin adds external/public comment on ticket
   - System automatically sends email to user
   - Email includes ticket reference (e.g., [Ticket #123])
   - Reply-to header points to support email

**Email-Ticket Linking Logic:**

**How to match incoming emails to existing tickets:**

1. **Subject Line Parsing** (Primary method)

   - Include ticket ID in subject: `[Ticket #123]` or `Re: Your issue [#123]`
   - When user replies, ticket ID is preserved in subject

2. **Email Thread Headers** (Secondary method)

   - Check `In-Reply-To` and `References` headers
   - Track email `Message-ID` in database
   - Link based on email thread continuity

3. **Sender + Time-based Matching** (Fallback)

   - Same sender email address
   - Within reasonable time window (e.g., 7 days)
   - No other open tickets from this user
   - Create new ticket if ambiguous

4. **Manual Intervention**
   - Admin can manually link emails to tickets
   - Option to split conversation into new ticket if topic changes

**Handling Edge Cases:**

- **User has multiple unrelated issues:**

  - Different subject lines → Different tickets
  - Time gap > threshold → New ticket
  - Closed ticket → Option to reopen or create new

- **New topic in email thread:**

  - Admin can manually split into new ticket
  - System can detect topic change (future AI enhancement)

- **Company users:**
  - Email domain matching to link to company
  - Auto-assign to company's designated agents

#### User Story/Timeline View

**Key Feature:** Chronological interaction timeline

- Display format: Chat-like interface showing:
  - **Email exchanges** (incoming from user, outgoing from agent)
  - **Agent replies** (external comments sent as emails)
  - **Internal notes** (private, not sent to user)
  - **File attachments** (from emails or uploaded)
  - **Status changes** (system events)
  - **Assignment changes**
  - **Priority updates**
- All interactions in one unified, chronological view
- Each entry timestamped
- Visual distinction between email, comment, and system event
- Filterable by type (emails only, comments only, system events, etc.)
- Expandable/collapsible entries for long content

**Timeline Entry Types & Visual Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────────────────────────┐                           │
│  │ [📧] Email from user@example.com │         10:30 AM         │
│  │ "The website is down..."         │                           │
│  │ [📎 Attachment: screenshot.png]  │                          │
│  └──────────────────────────────────┘                           │
│  (USER - LEFT ALIGNED)                                          │
│                                                                 │
│                          ┌────────────────────────────────────┐ │
│         10:35 AM         │ [💬] Internal Note by Admin John  │ │
│                          │ "Checking server logs now..."      │ │
│                          │ (Private - not sent to user)       │ │
│                          └────────────────────────────────────┘ │
│                          (ADMIN INTERNAL - RIGHT ALIGNED)       │
│                                                                 │
│                    ┌─────────────────────────────────────────┐  │
│          10:36 AM  │ [⚙️] Status changed: Open → In Progress │ │
│                    └─────────────────────────────────────────┘  │
│                    (SYSTEM EVENT - CENTER)                      │
│                                                                 │
│                          ┌────────────────────────────────────┐ │
│         10:45 AM         │ [✉️] Reply by Admin John          │ │
│                          │ (sent via email to user)           │ │
│                          │ "Hi, we've identified the issue    │ │
│                          │ and are working on it..."          │ │
│                          └────────────────────────────────────┘ │
│                          (ADMIN PUBLIC - RIGHT ALIGNED)         │
│                                                                 │
│  ┌──────────────────────────────────┐                           │
│  │ [📧] Email from user@example.com │         11:00 AM         │
│  │ "Thank you! It's working now."   │                           │
│  └──────────────────────────────────┘                           │
│  (USER - LEFT ALIGNED)                                          │
│                                                                 │
│                    ┌─────────────────────────────────────────┐  │
│          11:05 AM  │ [⚙️] Status: In Progress → Resolved    │  │
│                    └─────────────────────────────────────────┘  │
│                    (SYSTEM EVENT - CENTER)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Visual Design Guidelines:**

**User Messages (Left-Aligned):**

- Position: Left side of timeline
- Background: Light blue/gray bubble
- Icon: 📧 (email) or 💬 (portal message)
- Time: Right side of bubble
- Contains: Message text, attachments

**Admin Public Responses (Right-Aligned):**

- Position: Right side of timeline
- Background: Light green/teal bubble
- Icon: ✉️ (sent email) or 💬 (public comment)
- Label: "Sent via email" indicator
- Time: Left side of bubble
- Contains: Message text, attachments

**Admin Internal Notes (Right-Aligned):**

- Position: Right side of timeline
- Background: Yellow/amber bubble
- Icon: 💬 or 🔒 (private)
- Label: "Internal - Private" badge
- Time: Left side of bubble
- Visual indicator: Dashed border or lock icon
- Contains: Internal discussion, notes

**System Events (Center-Aligned):**

- Position: Center of timeline
- Background: Light gray pill/badge
- Icon: ⚙️ (settings), 👤 (assignment), ⚡ (urgency), 🎯 (importance), ⏰ (SLA)
- Compact format
- Contains: Status changes, assignments, urgency/importance updates, etc.

**Chat-Like Interface Features:**

- Smooth scrolling to latest message
- Auto-scroll on new message (WebSocket)
- "Jump to latest" button when scrolled up
- Date separators (e.g., "Today", "Yesterday", "Oct 10")
- Timestamps (relative for recent, absolute for old)
- Message grouping (consecutive messages from same sender)
- Loading spinner for older messages (pagination)
- Visual read/delivered indicators (optional)

#### Future Enhancement (Phase 2+)

- **AI-Assisted Features:**

  - Auto-suggest ticket severity/priority based on email content
  - Auto-categorize ticket type (bug, feature request, support, etc.)
  - Suggest similar existing tickets or KB articles
  - Auto-generate concise ticket summaries from long emails
  - Sentiment analysis (detect frustrated customers)

- **Spam Prevention:**
  - Email verification for new users
  - Rate limiting (max tickets per hour)
  - Spam filtering integration (SpamAssassin, Akismet)
  - Blacklist/whitelist management
  - CAPTCHA for portal submissions

#### Technical Implementation

**Email Processing (Django):**

- **Email Retrieval:**

  - Celery periodic task to check email inbox
  - IMAP library (`imaplib` or `django-mailbox`)
  - Parse email using `email` library
  - Extract sender, subject, body, attachments

- **Email Parsing:**

  - HTML to text conversion (preserve formatting)
  - Handle multipart emails (plain text + HTML)
  - Extract and store attachments
  - Parse headers for threading

- **Ticket Creation/Update:**

  - Transaction-based to ensure data consistency
  - Signal handlers for post-creation actions
  - Async processing for large emails

- **Email Sending:**
  - Django email backend (SMTP)
  - Email templating system
  - Include ticket ID in subject and headers
  - Track sent emails (delivery status)

**Database Schema:**

```

EmailMessage
├── ticket (FK to Ticket)
├── message_id (unique email Message-ID)
├── in_reply_to (for threading)
├── references (for threading)
├── from_email
├── to_email
├── subject
├── body_text
├── body_html
├── received_at
├── direction (inbound/outbound)

Ticket
├── ... (other fields)
├── email_thread_id (optional, for grouping)
├── original_email (FK to EmailMessage, nullable)

```

---

### 3. User & Company Relationship Schema

#### User Types Hierarchy

```
SuperAdmin (System Owner)
    ├── Admin/Agent (Support Staff)
    ├── Manager (Analytics & Reporting Access)
    ├── Company (Client Organization)
    │   └── Company Users (End Users - part of organization)
    └── Individual Customers (End Users - not part of any company)
```

#### Relationships & Permissions

**SuperAdmin:**

- Full system control
- Create/manage admins, managers, companies, users
- Configure system settings
- Access all tickets and data
- Manage ticket types, statuses, workflows
- View all analytics

**Admin/Agent:**

- Create and manage tickets
- Assign tickets (to self or others)
- View assigned tickets and unassigned tickets
- Internal communication
- Cannot create other admins
- Limited settings access

**Manager:**

- All Agent permissions
- Access to analytics dashboard
- Team performance metrics
- SLA reports
- Cannot modify system settings

**Company (Client Organization):**

- Represents a business entity
- Has multiple users
- Can be assigned multiple admins/agents
- Has dedicated portal access
- Company-wide settings (branding, SLA tiers, etc.)

**Company User:**

- Belongs to one company
- Can create tickets
- View own tickets (and optionally company tickets)
- Self-service portal access
- Knowledge base access

**Individual Customer:**

- Not affiliated with any company
- Independent user account
- Can create tickets
- View only their own tickets
- Self-service portal access
- Knowledge base access
- May be converted to company user later if they join an organization

#### Database Schema Outline

```
User (Django built-in User)
├── UserProfile
    ├── user_type (SuperAdmin, Admin, Manager, CompanyUser, IndividualCustomer)
    ├── company (FK to Company, nullable)
    │   └── NULL for IndividualCustomers
    ├── permissions (JSON or related table)

Company
├── name
├── domain
├── settings (JSON: branding, SLA tier, etc.)
├── created_by (FK to SuperAdmin)
├── assigned_agents (M2M to User where user_type=Admin)

Ticket
├── company (FK to Company, nullable)
│   └── NULL for IndividualCustomer tickets
├── created_by (FK to User)
├── assigned_to (FK to User, nullable)
├── assigned_team (FK to Team, nullable)
├── status
├── urgency (Critical, High, Medium, Low)
├── importance (Critical, High, Medium, Low)
├── issue_type (FK to IssueType)
```

**Key Differences Between Customer Types:**

| Feature             | Company User                     | Individual Customer             |
| ------------------- | -------------------------------- | ------------------------------- |
| Company Association | Required                         | None                            |
| Ticket Visibility   | Own + optionally company tickets | Only own tickets                |
| Branding            | Company-specific                 | Default system branding         |
| SLA Tier            | Based on company contract        | Default/individual tier         |
| Bulk Management     | Can be managed by company admin  | Self-managed only               |
| Email Domain        | Often matches company domain     | Any email domain                |
| Migration           | Can leave company → Individual   | Can join company → Company User |

**Use Cases:**

**Individual Customers:**

- B2C support scenarios
- One-time customers
- Personal accounts
- Small-scale support requests
- Users who don't represent an organization

**Company Users:**

- B2B support scenarios
- Enterprise clients
- Organizations with multiple employees
- Corporate accounts
- Team-based support needs

---

### 4. Chat Integration Clarification

#### Two Types of Chat Needed

**A. Customer-Facing Live Chat Widget**

- Embedded widget on client's website
- Allows website visitors to chat with support agents
- Real-time WebSocket connection
- Can escalate to ticket if unresolved
- Agent dashboard shows active chats

**B. Internal Team Communication**

- Chat between admins/agents
- Discussed in point #16

**Decision Needed:**

- Do we build both?
- Should live chat widget be in MVP or Phase 2?

---

### 5. Ticket Distribution and Routing

#### Assignment Methods

**Manual Assignment:**

- SuperAdmin assigns to specific agent/team
- Agents can assign tickets to themselves (self-assignment)
- Reassignment capability

**Auto-Assignment Rules (Future):**

- Round-robin distribution
- Based on agent workload
- Based on ticket category/type
- Based on agent expertise/skills
- Geographic/timezone-based

#### Filtering System (YouTrack-inspired)

**Advanced Filtering:**

- Filter by: Status, Urgency, Importance, Assignee, Company, Date Range, Issue Type, Tags
- Combined priority filter (e.g., show all Critical Urgency tickets)
- Save custom filters
- Share filters with team
- Quick filters (My Tickets, Unassigned, Overdue, Critical Issues, etc.)

#### Board View (Jira-inspired)

**Kanban Board:**

- Columns represent statuses
- Drag-and-drop to change status
- Swimlanes by urgency, importance, assignee, or company
- Color coding by combined priority (red for critical/critical, orange for high urgency, etc.)
- WIP (Work In Progress) limits per column

**List View:**

- Traditional table view
- Sortable columns
- Bulk actions

**Timeline/Calendar View:**

- Due dates visualization
- SLA deadline tracking

---

### 6. SLA Management & KPIs

#### Dual Priority System

**Tickets have TWO separate priority dimensions:**

**1. Urgency (How quickly it needs resolution):**

- **Critical** - Needs immediate attention (drop everything)
- **High** - Should be addressed soon
- **Medium** - Normal timeline
- **Low** - Can wait, no rush

**2. Importance/Impact (How critical the issue is):**

- **Critical** - System down, major business impact, data loss
- **High** - Important feature broken, affects many users
- **Medium** - Minor feature issue, workaround available
- **Low** - Cosmetic issue, nice-to-have

**Priority Matrix Examples:**

| Urgency      | Importance   | Example Scenario                      | Response Strategy                           |
| ------------ | ------------ | ------------------------------------- | ------------------------------------------- |
| **Critical** | **Critical** | Production server down                | 🚨 ALL agents notified immediately          |
| **Critical** | **High**     | Payment gateway failing               | Notify available agents ASAP                |
| **Critical** | **Medium**   | UI bug affecting user experience      | Assign to next available agent              |
| **Critical** | **Low**      | Minor typo on homepage                | Quick fix when agent available              |
| **High**     | **Critical** | Security vulnerability found          | Must fix today, assign to specialist        |
| **Medium**   | **Critical** | Database backup failed                | Important but scheduled maintenance window  |
| **Low**      | **Critical** | Planned infrastructure upgrade        | Critical work but not time-sensitive        |
| **Low**      | **Low**      | Feature request for minor enhancement | Backlog, prioritize when capacity available |

**Visual Indicators:**

- **Critical Urgency + Critical Importance** = 🔴 Red badge, ALL agents notified
- **Critical Urgency** = ⚡ Lightning icon
- **Critical Importance** = 🎯 Target icon
- Combined view shows both indicators

#### SLA Metrics

**Response Time SLAs:**

- First response time (time until first agent reply)
- Next response time (ongoing conversation)

**Resolution Time SLAs:**

- Time to close/resolve ticket

**SLA Tiers by Combined Priority:**

```
Critical Urgency + Critical Importance:
  First Response: 15 minutes, Resolution: 2 hours

Critical Urgency + High Importance:
  First Response: 30 minutes, Resolution: 4 hours

Critical Urgency + Medium/Low Importance:
  First Response: 1 hour, Resolution: 8 hours

High Urgency + Critical Importance:
  First Response: 1 hour, Resolution: 4 hours

High Urgency + High Importance:
  First Response: 2 hours, Resolution: 1 day

Medium Urgency + Any Importance:
  First Response: 8 hours, Resolution: 3 days

Low Urgency + Any Importance:
  First Response: 24 hours, Resolution: 7 days
```

**Custom SLA by Company:**

- Companies can have custom SLA tiers
- Override default based on contract level

#### KPI Metrics to Track

**Ticket Metrics:**

- Total tickets (by period)
- Open vs Closed ratio
- Average resolution time
- Average first response time
- SLA compliance rate (% of tickets meeting SLA)
- Ticket volume by category/type
- Reopened tickets rate

**Agent Performance:**

- Tickets assigned vs resolved
- Average resolution time per agent
- First response time per agent
- Customer satisfaction score (CSAT) per agent
- Tickets handled per day/week/month
- SLA breach count

**Company/Customer Metrics:**

- Tickets per company
- Response satisfaction by company
- Most active companies

#### Agent Performance Dashboard

- Personal metrics overview
- Comparison to team average
- Performance trends over time
- Leaderboard (optional, gamification)

---

### 7. Comments and Communication

#### Jira-Inspired Comment System

**Two Separate Comment Sections:**

**1. Internal Comments (Private)**

- Visible only to admins/agents/managers
- For team collaboration
- Discuss solutions, escalations, internal notes
- Can @mention team members
- Notifications to mentioned users

**2. External Comments (Public)**

- Visible to client/company users
- Official responses to customer
- Auto-sent via email to customer
- Professional, customer-facing

**Comment Features:**

- Rich text editor
- File attachments
- Edit history (show edited badge)
- @ mentions with notifications
- Reactions/emojis (optional)
- Threaded replies (optional)

**Activity Log:**

- System-generated entries:
  - Status changes
  - Assignment changes
  - Urgency updates
  - Importance updates
  - SLA warnings
- Timestamped
- Non-editable

---

### 8. File Upload and Attachments

#### Implementation Approach

**Backend Handling (Django):**

- File storage: Local filesystem or cloud (S3, Azure Blob, etc.)
- File validation: Type, size limits
- Virus scanning (optional, recommended)
- Generate thumbnails for images
- Secure download URLs (temporary tokens)

**Attachment Context:**

- Attach to tickets
- Attach to comments (both internal and external)
- Attach via email (email-to-ticket)
- Attach via chat widget

**Frontend Display:**

- Preview for images
- Download links for documents
- Gallery view for multiple attachments
- Drag-and-drop upload

**Security:**

- Access control (only authorized users can download)
- Encrypted storage (optional)
- Audit log of downloads

---

### 9. Automation Rules

#### Rule Engine (If-Then Logic)

**Trigger Events:**

- Ticket created
- Status changed
- Urgency changed
- Importance changed
- Assignment changed
- SLA deadline approaching
- No response for X hours
- Specific keyword in title/description

**Conditions:**

- If urgency = Critical AND importance = Critical
- If urgency = Critical AND no assignee
- If ticket open > 24 hours AND unassigned
- If status = Resolved for > 48 hours
- If company = [specific company]
- If issue type = [specific type]
- If importance = Critical (regardless of urgency)

**Actions:**

- Send notification (email, in-app, SMS)
- Auto-assign to agent/team
- Change urgency
- Change importance
- Change status
- Add tag
- Add internal comment
- Escalate to manager
- Send to specific queue
- Notify all agents (for critical situations)

**Example Automation Rules:**

1. **🚨 Critical Escalation:** If urgency = Critical AND importance = Critical → Immediately notify ALL agents + SuperAdmin
2. **Unassigned Alert:** If ticket open > 2 hours without assignee → Notify SuperAdmin
3. **Auto-Close:** If status = Resolved for > 72 hours → Change status to Closed
4. **High Priority Alert:** If urgency = Critical OR importance = Critical → Notify available agents immediately
5. **SLA Warning:** If SLA deadline approaching in 1 hour → Notify assigned agent
6. **Inactivity Reminder:** If no update in 48 hours → Notify assigned agent
7. **Critical Importance Flag:** If importance = Critical AND unassigned → Auto-assign to senior agent/manager

**Implementation:**

- Celery periodic tasks
- Rule builder UI (drag-drop or form-based)
- Enable/disable rules
- Rule execution history/logs

---

### 10. Notification System

#### WebSocket-Based Real-Time Notifications

**Django Channels Implementation:**

- WebSocket connections for real-time updates
- Fallback to polling for older browsers

**Notification Types:**

- New ticket created
- 🚨 Critical ticket created (urgency + importance = critical)
- Ticket assigned to you
- New comment on your ticket
- Status changed
- Urgency changed
- Importance changed
- SLA deadline approaching
- @mentions in comments
- Automation rule triggered

**Notification Channels:**

- **In-app notifications** (real-time, WebSocket)
- **Email notifications** (configurable per user)
- **Browser push notifications** (PWA)
- **SMS** (optional, for urgent tickets)

**User Preferences:**

- Configure which events trigger notifications
- Choose notification channels per event type
- Quiet hours
- Digest mode (batch notifications)

**Notification Center:**

- Bell icon with unread count
- Dropdown with recent notifications
- Mark as read/unread
- Link to related ticket
- Archive old notifications

---

### 11. User Management & Permissions

#### Hierarchy & Roles

**SuperAdmin:**

- Create/edit/delete all user types
- Manage companies
- System configuration
- Full access to all tickets
- Create custom roles (future)

**Admin/Agent:**

- Create tickets
- Manage assigned tickets
- Self-assign tickets
- Internal communication
- Limited to assigned companies (optional)

**Manager:**

- All Agent permissions
- Analytics dashboard access
- Team oversight
- Cannot modify system settings

**Company User:**

- Create tickets for own company
- View own tickets (or all company tickets)
- Portal access
- Knowledge base access

#### Permission System

**Granular Permissions:**

- View tickets (all, assigned, own company)
- Create tickets
- Edit tickets
- Delete tickets
- Assign tickets
- Change ticket status
- Manage users
- Manage companies
- View analytics
- Manage settings
- Create ticket types

**Implementation Options:**

1. **Django built-in permissions system** (recommended for MVP)
   - Groups and permissions
   - Object-level permissions with django-guardian
2. **Custom RBAC (Role-Based Access Control)**
   - More flexible
   - Custom permission model
   - May be overkill for MVP

**Recommendation:** Start with Django's built-in system, extend with django-guardian for object-level permissions.

---

### 12. Analytics & Reporting

#### Manager-Only Access (Special User Type)

**Manager Dashboard:**

- Team performance overview
- SLA compliance metrics
- Ticket volume trends
- Agent productivity
- Company satisfaction scores
- Custom date range selection

**Report Types:**

- Daily/Weekly/Monthly summaries
- Agent performance reports
- Company-specific reports
- SLA compliance reports
- Export to PDF/Excel

**Visualizations:**

- Charts: Line, bar, pie, donut
- Heatmaps (busy hours/days)
- Trend analysis
- Comparison metrics

**Technical Implementation:**

- Django queries with aggregation
- Caching for performance
- Background report generation (Celery)
- Chart libraries: Chart.js, Recharts, or D3.js

---

### 13. Knowledge Base / FAQ

#### Documentation System

**Structure:**

- Categories and subcategories
- Articles with rich text content
- Tags for cross-referencing
- Version history
- Article ratings (helpful/not helpful)

**Search Functionality:**

- Full-text search
- Filter by category
- Sort by relevance, popularity, date
- Search suggestions/autocomplete

**AI Integration (Future):**

- AI-powered search (semantic search)
- Suggested articles when creating tickets
- Auto-link related articles in ticket responses
- Chatbot using KB as knowledge source

**Access Control:**

- Public articles (all users)
- Company-specific articles
- Internal-only articles (agents/admins)

**Content Management:**

- WYSIWYG editor
- Draft/Published status
- Scheduled publishing
- Article analytics (views, helpfulness)

---

### 14. External Integrations

#### Messaging Platforms

**Email:**

- Office 365 / Outlook (Microsoft Graph API)
- Gmail (Google Workspace API)
- Generic IMAP/SMTP support

**Chat Services:**

- **WhatsApp Business API**
  - Receive messages as tickets
  - Send ticket updates via WhatsApp
- **Telegram Bot**
  - Ticket creation via bot
  - Notifications via Telegram
- **Microsoft Teams**
  - Teams bot for ticket creation
  - Notifications in Teams channels
- **Slack**
  - Slash commands for tickets
  - Notifications in Slack channels
- **Facebook Messenger**
  - Facebook Page integration
  - Messages as tickets

**Other Integrations:**

- **Calendar Integration** (Google Calendar, Outlook) for SLA deadlines
- **CRM Integration** (Salesforce, HubSpot) for customer data
- **Payment Gateways** (if handling billing-related tickets)
- **Monitoring Tools** (auto-create tickets from alerts)

**Integration Architecture:**

- Webhook receivers
- OAuth 2.0 authentication
- API clients for each service
- Queue-based processing (Celery)
- Retry mechanisms for failed deliveries

---

### 15. Customer Self-Service Portal

#### Portal Features

**Ticket Management:**

- View own tickets
- Create new tickets
- Update existing tickets
- Add comments
- Upload attachments
- Close tickets

**Authentication:**

- Email/Password registration
- **Social Login:**
  - Google OAuth
  - Facebook Login
  - Microsoft Account (optional)
  - LinkedIn (optional)

**Implementation (Django):**

- `django-allauth` package
  - Handles social auth
  - Email verification
  - Password reset
  - Multiple auth providers

**Portal Sections:**

- Dashboard (ticket overview)
- My Tickets (list/grid view)
- Create Ticket
- Knowledge Base access
- Profile settings
- Notification preferences

**Branding:**

- Company-specific branding (logo, colors)
- Custom domain (support.companyname.com)
- White-label option

---

### 16. Internal Team Communication

#### Two Communication Systems

**A. Ticket-Based Communication (Already addressed in #7)**

- Internal comments within ticket
- External comments for customers

**B. Standalone Team Chat**

**Use Cases:**

- Quick questions between team members
- General team discussions
- Not related to specific ticket
- Water cooler chat, team coordination

**Features:**

- Direct messages (1-on-1)
- Group channels
- @mentions
- File sharing
- Search chat history
- Online/offline status
- Typing indicators

**Technical Implementation:**

- Django Channels (WebSocket)
- Separate chat message model
- Rooms/channels concept
- Message history stored in DB
- Real-time delivery

**UI Placement:**

- Sidebar chat panel (collapsible)
- Separate chat page
- Pop-up chat windows

**Integration with Tickets:**

- Share ticket link in chat
- Convert chat message to ticket note
- Quick ticket lookup in chat

---

### 17. Mobile Responsiveness & PWA

#### Responsive Design Approach

**CSS Framework Options:**

- Tailwind CSS (utility-first, highly customizable)
- Material-UI / MUI (React components)
- Bootstrap (classic, well-documented)
- Chakra UI (modern, accessible)

**Responsive Breakpoints:**

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Mobile-First Design:**

- Design for mobile first
- Progressive enhancement for larger screens
- Touch-friendly UI elements
- Simplified navigation for mobile

#### Progressive Web App (PWA)

**PWA Features:**

- **Installable** - Add to home screen
- **Offline Support** - Service workers, cached data
- **Push Notifications** - Browser notifications
- **Fast Loading** - App shell architecture
- **Responsive** - Works on any device

**Implementation:**

- Service Worker registration
- Web App Manifest (manifest.json)
- HTTPS required
- Workbox (for service worker management)

**Offline Capabilities:**

- View cached tickets
- Draft tickets offline (sync when online)
- Cached knowledge base articles
- Offline notification queue

**Push Notifications:**

- Web Push API
- Notification permission prompt
- Background sync for notifications

**Tools:**

- Vite PWA Plugin
- Workbox for caching strategies

---

### 18. Security & Access Control

#### Authentication System

**Django Built-in Auth (Recommended for MVP):**

- Proven and secure
- Password hashing (PBKDF2 by default)
- Session management
- CSRF protection
- Extensive documentation
- Easy to extend

**Enhanced Security Features:**

**1. Single Sign-On (SSO):**

- SAML 2.0 support (django-saml2-auth)
- OAuth 2.0 / OpenID Connect
- Enterprise directory integration (Active Directory, LDAP)

**2. Multi-Factor Authentication (MFA):**

- TOTP (Time-based One-Time Password) - Google Authenticator, Authy
- SMS-based OTP
- Email-based OTP
- Backup codes
- Package: `django-otp` or `django-mfa2`

**3. Password Policies:**

- Minimum length
- Complexity requirements
- Password history (prevent reuse)
- Expiration (optional, for enterprise)
- Account lockout after failed attempts

**4. Role-Based Access Control (RBAC):**

- Use Django groups and permissions
- Custom permissions per model
- Object-level permissions (django-guardian)

**5. Audit Logging:**

- Log all authentication attempts
- Track permission changes
- Log sensitive actions (user creation, deletion, etc.)
- IP address tracking
- User agent logging

**6. API Security:**

- Token-based auth (JWT or DRF tokens)
- API rate limiting (django-ratelimit)
- CORS configuration
- API key management for integrations

**7. Data Protection:**

- HTTPS enforcement
- Encrypted sensitive data at rest
- Secure cookie settings
- SQL injection protection (Django ORM)
- XSS protection (Django templates)
- CSRF tokens

**Recommendation:**

- **MVP:** Django built-in auth + django-allauth (social) + django-otp (MFA)
- **Future:** Add SSO for enterprise clients

---

### 19. API & Webhook Support

#### RESTful API (Django REST Framework)

**API Endpoints:**

**Tickets:**

- `GET /api/tickets/` - List tickets
- `POST /api/tickets/` - Create ticket
- `GET /api/tickets/{id}/` - Get ticket details
- `PATCH /api/tickets/{id}/` - Update ticket
- `DELETE /api/tickets/{id}/` - Delete ticket
- `POST /api/tickets/{id}/comments/` - Add comment
- `POST /api/tickets/{id}/attachments/` - Add attachment

**Users & Companies:**

- `GET /api/users/`
- `GET /api/companies/`
- `POST /api/companies/`

**Analytics:**

- `GET /api/analytics/tickets/`
- `GET /api/analytics/agents/`

**Authentication:**

- Token-based (JWT recommended)
- API keys for third-party integrations
- OAuth 2.0 for partner integrations

**API Documentation:**

- **Swagger / OpenAPI** (drf-spectacular)
- Interactive documentation
- Code examples in multiple languages
- Try-it-out functionality
- Separate public docs site

**Versioning:**

- URL versioning: `/api/v1/tickets/`
- Version deprecation policy
- Backward compatibility

#### Webhooks (Outgoing)

**Webhook Events:**

- `ticket.created`
- `ticket.updated`
- `ticket.status_changed`
- `ticket.assigned`
- `ticket.closed`
- `comment.added`
- `attachment.added`

**Webhook Configuration:**

- UI for registering webhook URLs
- Select events to subscribe to
- Secret key for verification
- Retry mechanism on failure
- Delivery logs

**Payload Format:**

```json
{
  "event": "ticket.created",
  "timestamp": "2025-10-12T10:30:00Z",
  "data": {
    "ticket_id": 123,
    "title": "Issue title",
    "status": "open",
    "priority": "high",
    "company": {...},
    "created_by": {...}
  }
}
```

**Security:**

- HMAC signature verification
- HTTPS only
- IP whitelist (optional)

#### Third-Party Integration SDK

**Official SDKs (Future):**

- Python SDK
- JavaScript/Node.js SDK
- C# SDK

**Integration Examples:**

- Create ticket from external system
- Sync customer data
- Custom reporting tools
- Mobile app integration

---

### 20. Search System & Filters

#### Global Search

**Search Scope:**

- Tickets (title, description, comments)
- Users (name, email)
- Companies (name)
- Knowledge base articles

**Search Implementation:**

**Option 1: PostgreSQL Full-Text Search**

- Built-in Django support
- Good for MVP
- No additional infrastructure

**Option 2: Elasticsearch**

- Better performance for large datasets
- Advanced features (fuzzy matching, relevance scoring)
- Requires separate service

**Recommendation:** Start with PostgreSQL, migrate to Elasticsearch if needed.

#### Search UX - Avoiding Confusion

**Scoped Search:**

- Search within context
- "Search in Tickets" vs "Search in Users" tabs
- Clear visual separation

**Smart Search Bar:**

- Global search with categorized results:

  ```
  Tickets (3 results)
    - Ticket #123: Website not loading
    - Ticket #456: Payment issue

  Users (2 results)
    - John Smith (john@example.com)

  Companies (1 result)
    - Acme Corp
  ```

**Search Filters:**

- Pre-filter before search (search only in tickets)
- Refinement filters after search (filter by date, status, etc.)

#### YouTrack-Style Advanced Filtering

**Query Language:**

- Natural language filters
- Examples:
  - `status: open priority: high`
  - `assignee: me created: today`
  - `company: "Acme Corp" status: {open, in progress}`

**Filter Builder UI:**

- Dropdown-based filter builder
- Add multiple conditions
- AND/OR logic
- Save custom filters
- Share filters with team

**Quick Filters:**

- Predefined filters:
  - My Open Tickets
  - Unassigned Tickets
  - Overdue Tickets
  - High Priority
  - Today's Tickets

**Saved Searches:**

- Save complex filter combinations
- Name and organize saved searches
- Set as default view
- Share with team

**Advanced Features:**

- Autocomplete for field values
- Recent searches
- Search history
- Keyboard shortcuts (/ to focus search)

---

## Development Phases Recommendation

### Phase 1: MVP (Minimum Viable Product)

**Priority Features:**

1. User authentication (Django auth + social login)
2. Manual ticket creation and management
3. Basic status workflow
4. Company and user management
5. Ticket assignment (manual + self-assign)
6. Internal and external comments
7. File attachments
8. Basic email notifications
9. Simple dashboard
10. Basic search and filters
11. Responsive design

**Timeline:** 8-12 weeks

### Phase 2: Enhanced Features

1. Email-to-ticket integration
2. Real-time notifications (WebSocket)
3. Team chat
4. SLA management
5. Automation rules
6. Advanced analytics
7. Knowledge base
8. Customer portal
9. YouTrack-style filtering
10. Jira-style board view

**Timeline:** 8-10 weeks

### Phase 3: Integrations & Advanced Features

1. WhatsApp, Telegram, Slack integrations
2. Live chat widget
3. AI assistance (ticket categorization, suggestions)
4. SSO and MFA
5. Advanced reporting
6. API documentation and SDKs
7. PWA features
8. Mobile optimization

**Timeline:** 10-12 weeks

### Phase 4: Enterprise & Scale

1. Multi-tenancy improvements
2. Advanced automation
3. Workflow customization
4. Elasticsearch integration
5. Performance optimization
6. Load balancing
7. High availability setup

**Timeline:** Ongoing

---

## Technical Architecture Outline

### Backend Structure (Django)

```
ticketing_system/
├── config/                 # Project settings
├── apps/
│   ├── core/              # Base models, utilities
│   ├── users/             # User, Company models
│   ├── tickets/           # Ticket, Comment, Attachment
│   ├── notifications/     # Notification system
│   ├── analytics/         # Reporting and analytics
│   ├── knowledge_base/    # KB articles
│   ├── automation/        # Automation rules
│   ├── integrations/      # External integrations
│   └── api/               # DRF API endpoints
├── websockets/            # Django Channels consumers
├── celery_app/            # Celery tasks
└── static/
```

### Frontend Structure (React + Vite)

```
frontend/
├── src/
│   ├── components/        # Reusable components
│   ├── pages/             # Page components
│   ├── features/          # Feature-specific modules
│   │   ├── tickets/
│   │   ├── users/
│   │   ├── dashboard/
│   │   └── chat/
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   ├── context/           # React Context
│   ├── utils/             # Utilities
│   ├── assets/            # Images, fonts
│   └── styles/            # Global styles
├── public/
└── vite.config.js
```

---

## Questions for Further Discussion

1. **Admin Panel Framework:** Which React admin framework? (React-Admin, Refine, AdminJS, or custom?)
2. **Live Chat Widget:** Should this be in MVP or Phase 2?
3. **Multi-tenancy:** Should each company have completely isolated data, or shared with access control?
4. **Deployment:** Self-hosted vs Cloud? (AWS, Azure, GCP, or DigitalOcean?)
5. **Email Service:** Which email provider? (SendGrid, AWS SES, Mailgun, Postmark?)
6. **File Storage:** Local vs Cloud storage? (AWS S3, Azure Blob, Cloudinary?)
7. **Database:** PostgreSQL confirmed? Any specific hosting preference?
8. **CI/CD:** What's the deployment pipeline? (GitHub Actions, GitLab CI, Jenkins?)
9. **Testing Strategy:** Unit tests, integration tests, E2E tests - what's the priority?
10. **White-labeling:** How deep should the customization go for different companies?

---

## Next Steps

1. **Refine this document** based on feedback
2. **Create database schema diagram**
3. **Design wireframes/mockups** for key screens
4. **Set up development environment**
5. **Initialize project structure**
6. **Start with Phase 1 MVP development**
