# Quick API Test Script
# Tests the new /auth/me/ endpoint with project information

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Testing Ticketing System API" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:8000"
# Uncomment one of these to test from your network:
# $baseUrl = "http://31.146.76.40:8000"  # Your public IP
# $baseUrl = "http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me"  # Dokploy production

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/" -Method GET
    Write-Host "✅ Backend is healthy!" -ForegroundColor Green
    Write-Host "   Database: $($health.database.status)" -ForegroundColor Gray
    Write-Host "   Debug: $($health.config.DEBUG)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    Write-Host "   Make sure the backend is running (./start.ps1)" -ForegroundColor Red
    exit
}

# Test 2: Login
Write-Host "2. Testing Login..." -ForegroundColor Yellow
$username = Read-Host "   Enter username (or press Enter for 'gaga')"
if ([string]::IsNullOrWhiteSpace($username)) {
    $username = "gaga"
}

$password = Read-Host "   Enter password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

try {
    $loginBody = @{
        username = $username
        password = $passwordPlain
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/tickets/auth/login/" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $response.access
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   User: $($response.user.username)" -ForegroundColor Gray
    Write-Host "   Email: $($response.user.email)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit
}

# Test 3: Get Current User with Projects
Write-Host "3. Testing Get Current User with Projects..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $userInfo = Invoke-RestMethod -Uri "$baseUrl/api/tickets/auth/me/" `
        -Method GET `
        -Headers $headers

    Write-Host "✅ User info retrieved!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   User Details:" -ForegroundColor Cyan
    Write-Host "   ID: $($userInfo.id)" -ForegroundColor Gray
    Write-Host "   Username: $($userInfo.username)" -ForegroundColor Gray
    Write-Host "   Email: $($userInfo.email)" -ForegroundColor Gray
    Write-Host "   Name: $($userInfo.first_name) $($userInfo.last_name)" -ForegroundColor Gray
    Write-Host "   Has Projects: $($userInfo.has_projects)" -ForegroundColor $(if ($userInfo.has_projects) { "Green" } else { "Red" })
    Write-Host ""

    if ($userInfo.has_projects) {
        Write-Host "   Projects ($($userInfo.projects.Count)):" -ForegroundColor Cyan
        foreach ($project in $userInfo.projects) {
            Write-Host "   * [$($project.key)] $($project.name)" -ForegroundColor Gray
            Write-Host "     - Lead: $($project.lead_username)" -ForegroundColor Gray
            Write-Host "     - Members: $($project.members.Count)" -ForegroundColor Gray
            Write-Host "     - Tickets: $($project.tickets_count)" -ForegroundColor Gray
            Write-Host "     - Columns: $($project.columns_count)" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "   >> Redirect Decision: Dashboard (/)" -ForegroundColor Green
    }
    else {
        Write-Host "   Projects: None" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   >> Redirect Decision: Setup (/setup)" -ForegroundColor Yellow
    }
    Write-Host ""

}
catch {
    Write-Host "❌ Failed to get user info: $_" -ForegroundColor Red
    exit
}

# Test 4: List All Projects
Write-Host "4. Testing List All Projects..." -ForegroundColor Yellow
try {
    $projects = Invoke-RestMethod -Uri "$baseUrl/api/tickets/projects/" `
        -Method GET `
        -Headers $headers

    Write-Host "✅ Found $($projects.count) total projects in system" -ForegroundColor Green
    Write-Host ""
    Write-Host "   All Projects:" -ForegroundColor Cyan
    foreach ($project in $projects.results) {
        Write-Host "   * [$($project.key)] $($project.name)" -ForegroundColor Gray
        Write-Host "     - Lead: $($project.lead_username)" -ForegroundColor Gray
        Write-Host "     - Members: $($project.members.Count)" -ForegroundColor Gray
    }
    Write-Host ""
}
catch {
    Write-Host "❌ Failed to list projects: $_" -ForegroundColor Red
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your access token (save this for manual testing):" -ForegroundColor Yellow
Write-Host $token -ForegroundColor Gray
Write-Host ""
