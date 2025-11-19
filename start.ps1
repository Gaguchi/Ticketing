Write-Host "Starting Ticketing System..." -ForegroundColor Green

# Start Backend
Write-Host "Starting Backend (Django)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; if (Test-Path 'venv/Scripts/Activate.ps1') { . ./venv/Scripts/Activate.ps1 } else { Write-Warning 'Virtual environment not found at backend/venv' }; python manage.py runserver"

# Start Frontend
Write-Host "Starting Frontend (Vite)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

# Start Servicedesk
Write-Host "Starting Servicedesk (Vite Port 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd servicedesk; npm run dev"

Write-Host "All services launch commands issued." -ForegroundColor Green
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Servicedesk: http://localhost:3001"
