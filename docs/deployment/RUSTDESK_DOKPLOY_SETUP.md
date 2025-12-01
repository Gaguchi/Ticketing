# RustDesk Self-Hosted Setup for Dokploy

> **Purpose**: Deploy your own RustDesk server for integrated remote desktop support
> **Created**: November 27, 2025

---

## 📋 Overview

### What You're Deploying

- **hbbs**: ID/Rendezvous server (handles connections)
- **hbbr**: Relay server (for when direct connection fails)
- **Web Client** (optional): Browser-based remote desktop for admins

### How It Integrates With Your Ticketing System

```
┌─────────────────────────────────────────────────────────────┐
│                    USER WORKFLOW                             │
│                                                              │
│  1. User installs RustDesk client (one-time, ~15MB)         │
│  2. RustDesk shows their ID: "123 456 789"                  │
│  3. User creates ticket in Service Desk portal              │
│  4. User enters their RustDesk ID in the ticket form        │
│  5. Ticket submitted with remote desktop ID attached        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    ADMIN WORKFLOW                            │
│                                                              │
│  1. Admin opens ticket in main dashboard                    │
│  2. Sees RustDesk ID: "123 456 789"                         │
│  3. Clicks "Connect via RustDesk" button                    │
│  4. RustDesk web client opens (or desktop app)              │
│  5. User gets popup: "Allow connection?" → Clicks Yes       │
│  6. Admin is now remotely controlling user's computer       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Dokploy Deployment Steps

### Step 1: Create New Service in Dokploy

1. Go to your Dokploy dashboard
2. Click **"Create Service"** → **"Docker Compose"**
3. Name it: `rustdesk-server`

### Step 2: Docker Compose Configuration

Paste this into the Docker Compose editor:

```yaml
version: "3"

services:
  rustdesk-server:
    image: rustdesk/rustdesk-server-s6:latest
    container_name: rustdesk-server
    ports:
      - "21115:21115"
      - "21116:21116"
      - "21116:21116/udp"
      - "21117:21117"
      - "21118:21118"
      - "21119:21119"
    environment:
      # Your domain - CHANGE THIS!
      - RELAY=rustdesk.yourdomain.com
      # Only allow encrypted connections
      - ENCRYPTED_ONLY=1
    volumes:
      - rustdesk-data:/root
    restart: unless-stopped

volumes:
  rustdesk-data:
```

### Step 3: Domain & SSL Configuration

In Dokploy, you need to configure **multiple ports**. RustDesk uses several ports:

| Port  | Protocol | Purpose                     | Domain Needed?       |
| ----- | -------- | --------------------------- | -------------------- |
| 21115 | TCP      | NAT test                    | No                   |
| 21116 | TCP+UDP  | ID server                   | Yes (for hbbs)       |
| 21117 | TCP      | Relay                       | Yes (for hbbr)       |
| 21118 | TCP      | Web client (hbbs websocket) | Yes (for web client) |
| 21119 | TCP      | Web client (hbbr websocket) | Yes (for web client) |

**Recommended Domain Setup:**

```
rustdesk.yourdomain.com → points to your Dokploy server IP
```

### Step 4: Firewall / Network Rules

Make sure these ports are open on your server/cloud provider:

```bash
# TCP ports
21115, 21116, 21117, 21118, 21119

# UDP port
21116
```

**For common cloud providers:**

<details>
<summary>DigitalOcean</summary>

1. Go to Networking → Firewalls
2. Create/edit firewall
3. Add inbound rules for ports 21115-21119 (TCP) and 21116 (UDP)
</details>

<details>
<summary>Hetzner</summary>

1. Go to your project → Firewalls
2. Add rules for the ports above
</details>

<details>
<summary>AWS</summary>

1. EC2 → Security Groups
2. Edit inbound rules
3. Add Custom TCP/UDP rules for the ports
</details>

### Step 5: Deploy

Click **Deploy** in Dokploy. Wait for the container to start.

### Step 6: Get Your Server Keys

After deployment, you need to retrieve the public key for client configuration:

```bash
# SSH into your server, then:
docker exec rustdesk-server cat /root/id_ed25519.pub
```

**Save this key!** You'll need it for client configuration.

---

## 🖥️ Client Configuration

### For End Users (Service Desk Users)

1. **Download RustDesk**: https://rustdesk.com/
2. **Install** (Windows/Mac/Linux - ~15MB)
3. **Configure your server**:
   - Open RustDesk → Settings (⚙️) → Network
   - Set:
     - **ID Server**: `rustdesk.yourdomain.com`
     - **Relay Server**: `rustdesk.yourdomain.com`
     - **Key**: `[paste the public key from Step 6]`
4. **Get your ID**: The main screen shows your 9-digit ID

### For IT Admins

**Option A: Desktop App (Recommended)**

- Same setup as users
- Can connect to any user by entering their ID

**Option B: Web Client**

- Navigate to: `https://rustdesk.com/web/` (or self-host the web client)
- Configure with your server details
- Note: Self-hosting the web client requires additional nginx setup

---

## 🔧 Self-Hosting the Web Client (Advanced)

If you want the web client on YOUR domain (not rustdesk.com/web):

### Additional Docker Service

Add this to your docker-compose.yml:

```yaml
rustdesk-web:
  image: phr34k/rustdesk-web:latest
  container_name: rustdesk-web
  ports:
    - "8080:80"
  environment:
    - RUSTDESK_SERVER=rustdesk.yourdomain.com
  depends_on:
    - rustdesk-server
  restart: unless-stopped
```

Then in Dokploy, add a domain:

```
web.rustdesk.yourdomain.com → port 8080
```

**Note**: The official RustDesk web client at rustdesk.com/web works fine with your self-hosted server. You only need to self-host the web client for:

- Custom branding
- Intranet-only access
- Full control over the web UI

---

## 🔗 Integration with Ticketing System

### Backend Changes Needed

Add these fields to your Ticket model:

```python
# backend/tickets/models.py

class Ticket(models.Model):
    # ... existing fields ...

    REMOTE_DESKTOP_TOOLS = [
        ('rustdesk', 'RustDesk'),
        ('anydesk', 'AnyDesk'),
        ('teamviewer', 'TeamViewer'),
        ('chrome_rd', 'Chrome Remote Desktop'),
        ('other', 'Other'),
    ]

    remote_desktop_tool = models.CharField(
        max_length=50,
        choices=REMOTE_DESKTOP_TOOLS,
        null=True,
        blank=True,
        help_text="Remote desktop tool the user has installed"
    )
    remote_desktop_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="User's remote desktop ID for support sessions"
    )
```

### Frontend: Service Desk Ticket Form

```tsx
// In ticket creation form
<div className="space-y-2">
  <label>Remote Desktop Access (optional)</label>
  <p className="text-sm text-gray-500">
    For faster support, provide your remote desktop ID
  </p>

  <div className="flex gap-2">
    <select
      value={remoteDesktopTool}
      onChange={(e) => setRemoteDesktopTool(e.target.value)}
      className="..."
    >
      <option value="">Select tool...</option>
      <option value="rustdesk">RustDesk</option>
      <option value="anydesk">AnyDesk</option>
      <option value="teamviewer">TeamViewer</option>
      <option value="other">Other</option>
    </select>

    <input
      type="text"
      placeholder="Your ID (e.g., 123 456 789)"
      value={remoteDesktopId}
      onChange={(e) => setRemoteDesktopId(e.target.value)}
      className="..."
    />
  </div>
</div>
```

### Frontend: Admin Ticket View (Connect Button)

```tsx
// In ticket detail view (main frontend)
{
  ticket.remote_desktop_id && (
    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-600">Remote Desktop</span>
          <div className="font-mono text-lg">
            {ticket.remote_desktop_tool}: {ticket.remote_desktop_id}
          </div>
        </div>

        <button
          onClick={() => handleRemoteConnect(ticket)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg 
                   hover:bg-blue-700 flex items-center gap-2"
        >
          🖥️ Connect
        </button>
      </div>
    </div>
  );
}

// Handler function
const handleRemoteConnect = (ticket: Ticket) => {
  const id = ticket.remote_desktop_id.replace(/\s/g, ""); // Remove spaces

  switch (ticket.remote_desktop_tool) {
    case "rustdesk":
      // Opens RustDesk with the ID pre-filled
      // Option 1: Deep link (if RustDesk is installed)
      window.open(`rustdesk://connect/${id}`, "_blank");
      // Option 2: Web client
      // window.open(`https://rustdesk.yourdomain.com/web/#/connect/${id}`, '_blank');
      break;
    case "anydesk":
      window.open(`anydesk:${id}`, "_blank");
      break;
    case "teamviewer":
      window.open(`teamviewer10://control?device=${id}`, "_blank");
      break;
    default:
      // Copy to clipboard
      navigator.clipboard.writeText(id);
      message.success("ID copied to clipboard");
  }
};
```

---

## ❓ FAQ

### Q: Can users just click a button and give us access?

**No.** For security, RustDesk requires the user to:

1. Have RustDesk running
2. Click "Accept" when admin tries to connect

This is intentional - you don't want software that gives remote access without user consent.

### Q: What if user isn't at their computer?

For unattended access, RustDesk supports setting a **permanent password**:

1. User sets password in RustDesk settings
2. User gives password to admin (via ticket)
3. Admin can connect anytime with ID + password

**Note**: This is less secure and should be for specific use cases only.

### Q: Is this free?

- **RustDesk Server (OSS)**: Free, AGPL-3.0 license
- **RustDesk Pro**: Paid, adds web console, LDAP, etc.

For basic needs, OSS version is sufficient.

### Q: How many users can it handle?

The free version has no limits. A small VPS (2GB RAM) can handle hundreds of concurrent connections.

### Q: What about existing AnyDesk/TeamViewer users?

No problem! The dropdown supports multiple tools. Users can enter their AnyDesk or TeamViewer ID instead. The "Connect" button will use the appropriate deep link.

---

## 🔐 Security Considerations

1. **ENCRYPTED_ONLY=1**: Ensures all connections are encrypted
2. **Firewall**: Only open required ports
3. **Key-based**: Clients need your server's public key
4. **User consent**: Users must accept each connection
5. **Audit**: RustDesk Pro adds session logging (optional)

---

## 📊 Monitoring

Check server status:

```bash
docker logs rustdesk-server
```

Common issues:

- **Clients can't connect**: Check firewall, ensure UDP 21116 is open
- **Relay not working**: Verify port 21117 is accessible
- **Web client issues**: Ensure ports 21118/21119 are open and proxied correctly

---

## 🎯 Quick Start Checklist

- [ ] Create Dokploy service with docker-compose
- [ ] Configure domain: `rustdesk.yourdomain.com`
- [ ] Open firewall ports: 21115-21119 (TCP), 21116 (UDP)
- [ ] Deploy and verify container is running
- [ ] Get public key from container
- [ ] Test with RustDesk client on your machine
- [ ] Add remote_desktop fields to Ticket model
- [ ] Update Service Desk ticket form
- [ ] Add "Connect" button to admin ticket view

---

## References

- RustDesk Docs: https://rustdesk.com/docs/en/self-host/
- RustDesk GitHub: https://github.com/rustdesk/rustdesk-server
- Docker Image: https://hub.docker.com/r/rustdesk/rustdesk-server-s6
