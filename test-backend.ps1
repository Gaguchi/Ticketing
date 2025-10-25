# Test backend endpoint and show redirect configuration
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host "Testing Backend Endpoint" -ForegroundColor Cyan
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host ""

$url = "http://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/"

Write-Host "URL: " -NoNewline -ForegroundColor Yellow
Write-Host $url
Write-Host ""

try {
    Write-Host "Making request..." -ForegroundColor Gray
    
    # Test with no redirect following to see if redirect happens
    $response = Invoke-WebRequest -Uri $url -MaximumRedirection 0 -ErrorAction SilentlyContinue
    
    Write-Host "Status Code: " -NoNewline -ForegroundColor Green
    Write-Host $response.StatusCode
    
    Write-Host "Content Type: " -NoNewline -ForegroundColor Green
    Write-Host $response.Headers.'Content-Type'
    
    Write-Host ""
    Write-Host "Response Body:" -ForegroundColor Yellow
    Write-Host $response.Content
    
    # Parse JSON if possible
    try {
        $json = $response.Content | ConvertFrom-Json
        Write-Host ""
        Write-Host "Configuration Check:" -ForegroundColor Cyan
        Write-Host "  USE_HTTPS_env: " -NoNewline -ForegroundColor White
        Write-Host $json.config.USE_HTTPS_env -ForegroundColor $(if ($json.config.USE_HTTPS_env -eq "False") { "Green" } else { "Red" })
        
        Write-Host "  SECURE_SSL_REDIRECT: " -NoNewline -ForegroundColor White
        Write-Host $json.config.SECURE_SSL_REDIRECT -ForegroundColor $(if ($json.config.SECURE_SSL_REDIRECT -eq $false) { "Green" } else { "Red" })
        
        Write-Host "  Scheme: " -NoNewline -ForegroundColor White
        Write-Host $json.config.scheme -ForegroundColor $(if ($json.config.scheme -eq "http") { "Green" } else { "Red" })
        
        Write-Host ""
        if ($json.config.SECURE_SSL_REDIRECT -eq $false -and $json.config.scheme -eq "http") {
            Write-Host "✅ SUCCESS: HTTP is working correctly!" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️  WARNING: Check configuration" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Could not parse JSON response" -ForegroundColor Yellow
    }
    
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    
    if ($statusCode -eq 307 -or $statusCode -eq 301 -or $statusCode -eq 302) {
        $location = $_.Exception.Response.Headers.Location
        Write-Host "❌ REDIRECT DETECTED!" -ForegroundColor Red
        Write-Host "Status Code: " -NoNewline -ForegroundColor Red
        Write-Host $statusCode
        Write-Host "Redirecting to: " -NoNewline -ForegroundColor Red
        Write-Host $location
        Write-Host ""
        Write-Host "Problem: Backend is still forcing HTTPS redirect" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Solutions:" -ForegroundColor Cyan
        Write-Host "  1. Make sure USE_HTTPS=False is set in Dokploy" -ForegroundColor White
        Write-Host "  2. Redeploy the backend service" -ForegroundColor White
        Write-Host "  3. Wait 2-3 minutes for deployment to complete" -ForegroundColor White
        Write-Host "  4. Try again" -ForegroundColor White
    }
    elseif ($statusCode -eq 404) {
        Write-Host "❌ 404 NOT FOUND" -ForegroundColor Red
        Write-Host ""
        Write-Host "Problem: Endpoint doesn't exist or service not running" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Check:" -ForegroundColor Cyan
        Write-Host "  1. Is the backend service running in Dokploy?" -ForegroundColor White
        Write-Host "  2. Check Dokploy logs for errors" -ForegroundColor White
        Write-Host "  3. Verify the domain is correct" -ForegroundColor White
    }
    else {
        Write-Host "❌ ERROR: Status Code $statusCode" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

Write-Host ""
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 59) -ForegroundColor Cyan
