# Clear Browser HSTS Cache - Windows

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  BROWSER HSTS CACHE CLEARING INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

Write-Host "Your backend is working correctly (HTTP, no redirects)!" -ForegroundColor Green
Write-Host "The redirect is happening in YOUR BROWSER due to cached HSTS policy." -ForegroundColor Yellow
Write-Host ""

Write-Host "=" * 70 -ForegroundColor White
Write-Host "OPTION 1: Use Incognito/Private Window (FASTEST)" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor White
Write-Host ""
Write-Host "Chrome/Edge:" -ForegroundColor Yellow
Write-Host "  Press: Ctrl+Shift+N" -ForegroundColor White
Write-Host ""
Write-Host "Firefox:" -ForegroundColor Yellow
Write-Host "  Press: Ctrl+Shift+P" -ForegroundColor White
Write-Host ""
Write-Host "Then visit: http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/" -ForegroundColor Green
Write-Host ""

Write-Host "=" * 70 -ForegroundColor White
Write-Host "OPTION 2: Clear HSTS Cache (PERMANENT FIX)" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor White
Write-Host ""

Write-Host "--- Chrome/Edge ---" -ForegroundColor Yellow
Write-Host "1. Open new tab and go to: " -NoNewline -ForegroundColor White
Write-Host "chrome://net-internals/#hsts" -ForegroundColor Green
Write-Host "   (Edge users: " -NoNewline -ForegroundColor White
Write-Host "edge://net-internals/#hsts" -NoNewline -ForegroundColor Green
Write-Host ")" -ForegroundColor White
Write-Host ""
Write-Host "2. Scroll down to 'Delete domain security policies'" -ForegroundColor White
Write-Host ""
Write-Host "3. Enter domain: " -NoNewline -ForegroundColor White
Write-Host "tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me" -ForegroundColor Green
Write-Host ""
Write-Host "4. Click 'Delete'" -ForegroundColor White
Write-Host ""
Write-Host "5. Also delete: " -NoNewline -ForegroundColor White
Write-Host "traefik.me" -ForegroundColor Green
Write-Host "   (in case HSTS is set on parent domain)" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Close and reopen browser" -ForegroundColor White
Write-Host ""

Write-Host "--- Firefox ---" -ForegroundColor Yellow
Write-Host "1. Close Firefox completely" -ForegroundColor White
Write-Host ""
Write-Host "2. Press " -NoNewline -ForegroundColor White
Write-Host "Win+R" -NoNewline -ForegroundColor Green
Write-Host " and paste:" -ForegroundColor White
Write-Host "   %APPDATA%\Mozilla\Firefox\Profiles\" -ForegroundColor Green
Write-Host ""
Write-Host "3. Open your profile folder (ends with .default-release)" -ForegroundColor White
Write-Host ""
Write-Host "4. Delete file: " -NoNewline -ForegroundColor White
Write-Host "SiteSecurityServiceState.txt" -ForegroundColor Green
Write-Host ""
Write-Host "5. Reopen Firefox" -ForegroundColor White
Write-Host ""

Write-Host "=" * 70 -ForegroundColor White
Write-Host "OPTION 3: Quick PowerShell Test (VERIFY IT WORKS)" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor White
Write-Host ""
Write-Host "Run this command to test (bypasses browser):" -ForegroundColor White
Write-Host ""
Write-Host '  Invoke-WebRequest http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/' -ForegroundColor Green
Write-Host ""
Write-Host "Expected: Status 200 with JSON response (no redirect)" -ForegroundColor Gray
Write-Host ""

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# Offer to open Chrome HSTS page
$openChrome = Read-Host "Open Chrome HSTS settings now? (y/n)"
if ($openChrome -eq 'y' -or $openChrome -eq 'Y') {
    Start-Process "chrome://net-internals/#hsts"
    Write-Host ""
    Write-Host "✅ Opened Chrome HSTS page" -ForegroundColor Green
    Write-Host "   Domain to delete: tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me" -ForegroundColor Yellow
}

Write-Host ""
