# Manual Redis & WebSocket Testing Guide

This guide outlines manual tests to verify that Redis is correctly handling real-time WebSocket events in the Ticketing System.

## 🛠️ Prerequisites

1.  **Redis** must be running (Docker or Local).
2.  **Backend** must be running on port 8000.
3.  **Frontend** must be running.

### Start the Environment

Open 3 terminals:

**Terminal 1 (Backend):**
```powershell
cd backend
python manage.py runserver 8000
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```

**Terminal 3 (Redis - if not running):**
Ensure your Redis instance is up. If using Docker:
```powershell
docker ps
# If not running:
docker-compose up -d redis
```

---

## 🧪 Test Scenarios

To perform these tests, you need **two different browsers** (or one normal window and one Incognito window) logged in as **two different users**.

> **Tip:** If you only have one user, go to `http://localhost:8000/admin/`, login as your superuser, and create a second test user (e.g., `testuser` / `password123`).

### Test 1: Real-time Chat 💬

**Goal:** Verify `ChatConsumer` routing via Redis.

1.  **User A:** Navigate to a Project -> **Chat** tab.
2.  **User B:** Navigate to the **same** Project -> **Chat** tab.
3.  **User A:** Type "Hello from Redis!" and hit Send.
4.  **Observation:**
    *   User A sees the message appear immediately.
    *   **User B sees the message appear instantly without refreshing.**
5.  **User B:** React to the message (add an emoji).
6.  **Observation:** User A sees the reaction appear instantly.

### Test 2: Kanban Board Sync 📋

**Goal:** Verify `TicketConsumer` project updates.

1.  **User A:** Open the **Board** view of a Project.
2.  **User B:** Open the **same** Board view.
3.  **User A:** Drag a ticket from "To Do" to "In Progress".
4.  **Observation:**
    *   **User B's board updates automatically.** The ticket moves to "In Progress" without a page reload.
5.  **User A:** Click "New Ticket" and create a ticket named "Redis Test Ticket".
6.  **Observation:** The new ticket appears on User B's board immediately.

### Test 3: Presence & Typing Indicators 👁️

**Goal:** Verify `PresenceConsumer` ephemeral events.

1.  **User A:** Open a specific Ticket (click to view details).
2.  **User B:** Open the **same** Ticket.
3.  **Observation:**
    *   Both users should see an indicator (e.g., avatar or text) showing the other user is viewing the ticket.
4.  **User A:** Start typing a comment in the "Add Comment" box.
5.  **Observation:**
    *   User B should see "User A is typing..." (or similar indicator) near the comment section.

### Test 4: Notifications 🔔

**Goal:** Verify `NotificationConsumer` user-specific routing.

1.  **User A:** Open the Ticket created in Test 2.
2.  **User A:** In the "Assignee" dropdown, select **User B**.
3.  **Observation (User B):**
    *   User B should receive a notification bell alert (top right) immediately.
    *   "User A assigned you to ticket 'Redis Test Ticket'".

---

## 🔍 Troubleshooting

If these tests fail:

1.  **Check Browser Console:** Look for WebSocket connection errors (`ws://... connection failed`).
2.  **Check Backend Logs:** Look for `Handshake status 200 OK` (success) or `Disconnect` messages.
3.  **Verify Redis:**
    *   If using the production Redis URL locally, ensure your IP isn't blocked or the VPN is active (if required).
    *   If using local Redis, ensure `REDIS_HOST=localhost` is set in `.env`.

### Quick Redis Connection Check
Run the verification script again if unsure:
```powershell
python test_redis_messaging.py
```
