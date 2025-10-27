# Local Network Testing Guide

## 🌐 Testing API from Other Devices on Your Network

Your local IP address: **192.168.100.6**

## ✅ Configuration Updates

The following has been added to allow network access:

### Backend Settings:

- **ALLOWED_HOSTS**: Now includes `192.168.100.6`
- **CORS_ALLOWED_ORIGINS**: Now includes `http://192.168.100.6:5173` and `http://192.168.100.6:8000`

## 🚀 How to Test

### 1. Start Your Backend

```powershell
# Make sure backend is running
cd backend
python manage.py runserver 0.0.0.0:8000
```

**Important:** Use `0.0.0.0:8000` instead of `127.0.0.1:8000` to bind to all network interfaces!

### 2. Test from Same Computer

**Option A: Using test script**

```powershell
.\test-api.ps1
# Or edit the script to use IP address:
# $baseUrl = "http://192.168.100.6:8000"
```

**Option B: Using curl/PowerShell**

```powershell
# Health check
curl http://192.168.100.6:8000/

# Or with Invoke-RestMethod
Invoke-RestMethod -Uri "http://192.168.100.6:8000/"
```

### 3. Test from Another Device on Same Network

From your phone, tablet, or another computer connected to the same WiFi/network:

**Health Check:**

```
http://192.168.100.6:8000/
```

**Login:**

```bash
curl -X POST http://192.168.100.6:8000/api/tickets/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"gaga","password":"your-password"}'
```

**Get User with Projects:**

```bash
curl -X GET http://192.168.100.6:8000/api/tickets/auth/me/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test Frontend from Network

If you want to access the frontend from other devices:

**Start frontend with network access:**

```powershell
cd frontend
npm run dev -- --host 0.0.0.0
```

Then access from any device on your network:

```
http://192.168.100.6:5173
```

**Update frontend .env for network testing:**

```bash
VITE_API_BASE_URL=http://192.168.100.6:8000
```

## 📱 Testing from Mobile Device

1. Make sure your phone is connected to the same WiFi network
2. Open browser on phone
3. Navigate to:
   - Backend: `http://192.168.100.6:8000/`
   - Frontend: `http://192.168.100.6:5173/` (if running with --host flag)
4. You should see the health check or login page

## 🔍 Troubleshooting

### Can't Connect from Other Devices

**Check Windows Firewall:**

```powershell
# Allow Python through firewall (run as Administrator)
New-NetFirewallRule -DisplayName "Python Dev Server" -Direction Inbound -Program "C:\Python311\python.exe" -Action Allow

# Or allow port 8000
New-NetFirewallRule -DisplayName "Django Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

**Verify backend is listening on all interfaces:**

```powershell
netstat -an | findstr :8000
```

Should show: `0.0.0.0:8000` not `127.0.0.1:8000`

**Check if devices are on same network:**

```powershell
# From another device, try to ping your computer
ping 192.168.100.6
```

### CORS Errors

If you get CORS errors from other devices, make sure:

1. Backend CORS settings include your IP
2. You're using the correct protocol (http:// not https://)
3. Port numbers match

## 🔐 Security Notes

**Important:** These settings are for **local development only**!

- Never expose `0.0.0.0:8000` to the internet
- Use these settings only on trusted local networks
- For production, use proper domain names and HTTPS
- Remove local IP addresses from ALLOWED_HOSTS in production

## 📋 Quick Reference

| Service  | Local URL                       | Network URL                         |
| -------- | ------------------------------- | ----------------------------------- |
| Backend  | http://localhost:8000           | http://192.168.100.6:8000           |
| Frontend | http://localhost:5173           | http://192.168.100.6:5173           |
| API Docs | http://localhost:8000/api/docs/ | http://192.168.100.6:8000/api/docs/ |

## 🧪 Example Test Sequence from Phone

1. **Open browser on phone**
2. **Visit:** `http://192.168.100.6:8000/`
3. **Should see:** `{"status": "healthy", ...}`
4. **Use a REST client app** (like "HTTP Request" or "Postman") to test POST requests
5. **Or access frontend:** `http://192.168.100.6:5173/` and login normally

## ⚡ Running Both Services for Network Access

```powershell
# Terminal 1 - Backend
cd backend
python manage.py runserver 0.0.0.0:8000

# Terminal 2 - Frontend
cd frontend
npm run dev -- --host 0.0.0.0

# Now both are accessible from network at:
# Backend:  http://192.168.100.6:8000
# Frontend: http://192.168.100.6:5173
```

Your devices on the same WiFi network can now access both services! 🎉
