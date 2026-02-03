param(
    [switch]$WithCelery,
    [switch]$CeleryOnly
)

Write-Host "Starting Ticketing System..." -ForegroundColor Green

if (-not $CeleryOnly) {
    # Start Backend
    Write-Host "Starting Backend (Django)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; if (Test-Path 'venv/Scripts/Activate.ps1') { . ./venv/Scripts/Activate.ps1 } else { Write-Warning 'Virtual environment not found at backend/venv' }; python manage.py runserver 8002"

    # Start Frontend
    Write-Host "Starting Frontend (Vite)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

    # Start Servicedesk
    Write-Host "Starting Servicedesk (Vite Port 3001)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd servicedesk; npm run dev"
}

# Start Celery if requested
if ($WithCelery -or $CeleryOnly) {
    Write-Host ""
    Write-Host "Starting Celery services (requires Redis on localhost:6379)..." -ForegroundColor Yellow
    
    # Start Celery Worker
    Write-Host "Starting Celery Worker..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; if (Test-Path 'venv/Scripts/Activate.ps1') { . ./venv/Scripts/Activate.ps1 }; Write-Host 'Celery Worker Starting...' -ForegroundColor Green; celery -A config worker --loglevel=info --pool=solo"
    
    # Start Celery Beat
    Write-Host "Starting Celery Beat Scheduler..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; if (Test-Path 'venv/Scripts/Activate.ps1') { . ./venv/Scripts/Activate.ps1 }; Write-Host 'Celery Beat Starting...' -ForegroundColor Green; celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler"
}

Write-Host ""
Write-Host "All services launch commands issued." -ForegroundColor Green

if (-not $CeleryOnly) {
    Write-Host "Backend: http://localhost:8002"
    Write-Host "Frontend: http://localhost:5178"
    Write-Host "Servicedesk: http://localhost:3001"
}

if ($WithCelery -or $CeleryOnly) {
    Write-Host ""
    Write-Host "Celery services:" -ForegroundColor Yellow
    Write-Host "  - Worker: Processing background tasks"
    Write-Host "  - Beat: Scheduling periodic tasks (auto-archive every hour)"
    Write-Host ""
    Write-Host "NOTE: Redis must be running on localhost:6379" -ForegroundColor Yellow
    Write-Host "      Install Redis: https://redis.io/docs/install/" -ForegroundColor DarkGray
    Write-Host "      Or use Docker: docker run -d -p 6379:6379 redis:alpine" -ForegroundColor DarkGray
}
