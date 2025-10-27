# API Testing with cURL

## 🧪 Testing Guide for Ticketing System API

This guide shows how to test your API endpoints using cURL commands.

## 📍 Base URLs

**Local Development:**

```
http://localhost:8000
```

**Dokploy Production:**

```
http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me
```

---

## 1️⃣ Health Check

Test if the backend is running:

```bash
curl http://localhost:8000/
```

Expected response:

```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "host": "localhost",
    "name": "postgres"
  },
  "config": {
    "DEBUG": true,
    "CORS_ALLOWED_ORIGINS": [...]
  }
}
```

---

## 2️⃣ User Registration

Register a new user:

```bash
curl -X POST http://localhost:8000/api/tickets/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

Expected response:

```json
{
  "user": {
    "id": 3,
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User"
  },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Save the access token for next requests!**

---

## 3️⃣ User Login

Login with existing user:

```bash
curl -X POST http://localhost:8000/api/tickets/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "gaga",
    "password": "your-password"
  }'
```

Expected response:

```json
{
  "user": {
    "id": 1,
    "username": "gaga",
    "email": "gaga@example.com",
    "first_name": "Gaga",
    "last_name": ""
  },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

## 4️⃣ Get Current User with Projects (NEW!)

**This is the key endpoint for checking if user should skip setup:**

```bash
# Replace YOUR_ACCESS_TOKEN with the token from login/register
curl -X GET http://localhost:8000/api/tickets/auth/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response for user WITH projects:

```json
{
  "id": 1,
  "username": "gaga",
  "email": "gaga@example.com",
  "first_name": "Gaga",
  "last_name": "",
  "projects": [
    {
      "id": 2,
      "key": "TICK",
      "name": "Tickets",
      "description": null,
      "lead_username": "gaga",
      "members": [],
      "tickets_count": 0,
      "columns_count": 0,
      "created_at": "2025-10-25T14:45:01.760004Z",
      "updated_at": "2025-10-25T14:45:01.760020Z"
    }
  ],
  "has_projects": true
}
```

Expected response for user WITHOUT projects:

```json
{
  "id": 3,
  "username": "testuser",
  "email": "test@example.com",
  "first_name": "Test",
  "last_name": "User",
  "projects": [],
  "has_projects": false
}
```

---

## 5️⃣ List All Projects

```bash
curl -X GET http://localhost:8000/api/tickets/projects/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "key": "DEFAULT",
      "name": "Default Project",
      "description": "Default project...",
      "lead_username": "",
      "members": [],
      "tickets_count": 0,
      "columns_count": 0
    },
    {
      "id": 2,
      "key": "TICK",
      "name": "Tickets",
      "lead_username": "gaga",
      "members": [],
      "tickets_count": 0,
      "columns_count": 0
    }
  ]
}
```

---

## 6️⃣ Create a New Project

```bash
curl -X POST http://localhost:8000/api/tickets/projects/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "TEST",
    "name": "Test Project",
    "description": "A test project",
    "lead_username": "gaga"
  }'
```

---

## 7️⃣ Update Project (Add Members)

```bash
curl -X PATCH http://localhost:8000/api/tickets/projects/2/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "member_usernames": ["testuser", "anotheruser"]
  }'
```

Expected response:

```json
{
  "id": 2,
  "key": "TICK",
  "name": "Tickets",
  "lead_username": "gaga",
  "members": [
    {
      "id": 3,
      "username": "testuser",
      "email": "test@example.com",
      "first_name": "Test",
      "last_name": "User"
    }
  ],
  "tickets_count": 0,
  "columns_count": 0
}
```

---

## 8️⃣ Test Complete Flow

**Step-by-step test to verify the setup redirect logic:**

### Step 1: Register a brand new user

```bash
curl -X POST http://localhost:8000/api/tickets/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "new@example.com",
    "password": "pass123",
    "first_name": "New",
    "last_name": "User"
  }'
```

**Save the access token from response**

### Step 2: Check if they have projects (should be false)

```bash
curl -X GET http://localhost:8000/api/tickets/auth/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected: `"has_projects": false`** → Should redirect to /setup

### Step 3: Login as "gaga" who has projects

```bash
curl -X POST http://localhost:8000/api/tickets/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "gaga",
    "password": "your-password"
  }'
```

### Step 4: Check gaga's projects (should be true)

```bash
curl -X GET http://localhost:8000/api/tickets/auth/me/ \
  -H "Authorization: Bearer GAGA_ACCESS_TOKEN"
```

**Expected: `"has_projects": true`** → Should redirect to /dashboard

### Step 5: Add newuser as member to gaga's project

```bash
curl -X PATCH http://localhost:8000/api/tickets/projects/2/ \
  -H "Authorization: Bearer GAGA_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "member_usernames": ["newuser"]
  }'
```

### Step 6: Login as newuser again and check projects

```bash
# Login
curl -X POST http://localhost:8000/api/tickets/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "pass123"
  }'

# Check projects
curl -X GET http://localhost:8000/api/tickets/auth/me/ \
  -H "Authorization: Bearer NEWUSER_ACCESS_TOKEN"
```

**Expected: `"has_projects": true`** → Now should redirect to /dashboard!

---

## 🔧 PowerShell Equivalents

If you're on Windows PowerShell, use these instead:

### Register User:

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/tickets/auth/register/" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"username":"testuser","email":"test@example.com","password":"testpass123","first_name":"Test","last_name":"User"}'
```

### Login:

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/tickets/auth/login/" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"username":"gaga","password":"your-password"}'

$token = $response.access
Write-Host "Access Token: $token"
```

### Get Current User with Projects:

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:8000/api/tickets/auth/me/" `
  -Method GET `
  -Headers $headers | ConvertTo-Json -Depth 10
```

---

## 🐛 Troubleshooting

### 401 Unauthorized

- Token is missing or expired
- Make sure to include the `Authorization: Bearer TOKEN` header
- Get a new token by logging in again

### 400 Bad Request

- Check your JSON syntax
- Verify all required fields are included
- Check for typos in field names

### 404 Not Found

- Verify the endpoint URL is correct
- Check if the API is running (`curl http://localhost:8000/`)

### CORS Errors (in browser, not curl)

- Add your frontend URL to `CORS_ALLOWED_ORIGINS` in backend settings
- Redeploy backend after changing settings

---

## 📊 Quick Reference

| Endpoint                      | Method | Auth Required | Purpose             |
| ----------------------------- | ------ | ------------- | ------------------- |
| `/`                           | GET    | No            | Health check        |
| `/api/tickets/auth/register/` | POST   | No            | Register new user   |
| `/api/tickets/auth/login/`    | POST   | No            | Login user          |
| `/api/tickets/auth/me/`       | GET    | Yes           | Get user + projects |
| `/api/tickets/projects/`      | GET    | Yes           | List all projects   |
| `/api/tickets/projects/`      | POST   | Yes           | Create project      |
| `/api/tickets/projects/{id}/` | PATCH  | Yes           | Update project      |
| `/api/tickets/tickets/`       | GET    | Yes           | List tickets        |
| `/api/docs/`                  | GET    | No            | API documentation   |

---

## 💡 Pro Tips

1. **Save tokens in variables:**

   ```bash
   TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."
   curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/tickets/auth/me/
   ```

2. **Pretty print JSON:**

   ```bash
   curl http://localhost:8000/api/tickets/auth/me/ \
     -H "Authorization: Bearer $TOKEN" | jq
   ```

3. **See full request/response headers:**

   ```bash
   curl -v http://localhost:8000/api/tickets/auth/me/ \
     -H "Authorization: Bearer $TOKEN"
   ```

4. **Test on production (Dokploy):**
   ```bash
   curl http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/api/tickets/auth/me/ \
     -H "Authorization: Bearer $TOKEN"
   ```
