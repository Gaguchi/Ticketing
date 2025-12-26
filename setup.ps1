# Ticketing System Setup Script
# Run this once to set up all dependencies

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$SkipNodeCheck
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ticketing System Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
if (-not $BackendOnly -and -not $SkipNodeCheck) {
    Write-Host "Checking Node.js version..." -ForegroundColor Yellow
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Gray
        
        # Extract major.minor version
        $versionMatch = $nodeVersion -match 'v(\d+)\.(\d+)'
        if ($versionMatch) {
            $major = [int]$Matches[1]
            $minor = [int]$Matches[2]
            
            # Check if version is compatible with rolldown-vite (20.19+ or 22.12+)
            $compatible = ($major -eq 20 -and $minor -ge 19) -or ($major -ge 22 -and $minor -ge 12) -or ($major -gt 22)
            
            if (-not $compatible) {
                Write-Host ""
                Write-Host "  WARNING: Your Node.js version ($nodeVersion) may not be compatible with rolldown-vite." -ForegroundColor Yellow
                Write-Host "  Recommended: Node.js 20.19+ or 22.12+" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "  Options:" -ForegroundColor White
                Write-Host "    1. Update Node.js: https://nodejs.org/" -ForegroundColor Gray
                Write-Host "    2. Use nvm-windows to manage versions: https://github.com/coreybutler/nvm-windows" -ForegroundColor Gray
                Write-Host "    3. Continue anyway (may have issues): use -SkipNodeCheck flag" -ForegroundColor Gray
                Write-Host ""
                
                $response = Read-Host "Continue anyway? (y/N)"
                if ($response -ne 'y' -and $response -ne 'Y') {
                    Write-Host "Setup cancelled. Please update Node.js and try again." -ForegroundColor Red
                    exit 1
                }
            }
        }
    } else {
        Write-Host "  WARNING: Node.js not found. Frontend setup will fail." -ForegroundColor Red
        Write-Host "  Install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    }
}

# ===========================================
# Backend Setup
# ===========================================
if (-not $FrontendOnly) {
    Write-Host ""
    Write-Host "Setting up Backend..." -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    Push-Location backend
    
    # Check if Python is available
    $pythonCmd = $null
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $pythonCmd = "python"
    } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        $pythonCmd = "python3"
    } else {
        Write-Host "  ERROR: Python not found. Please install Python 3.10+" -ForegroundColor Red
        Write-Host "  Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
        Pop-Location
        exit 1
    }
    
    $pythonVersion = & $pythonCmd --version 2>&1
    Write-Host "  Python version: $pythonVersion" -ForegroundColor Gray
    
    # Create virtual environment if it doesn't exist
    if (-not (Test-Path "venv")) {
        Write-Host "  Creating virtual environment..." -ForegroundColor Yellow
        & $pythonCmd -m venv venv
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ERROR: Failed to create virtual environment" -ForegroundColor Red
            Pop-Location
            exit 1
        }
        Write-Host "  Virtual environment created!" -ForegroundColor Green
    } else {
        Write-Host "  Virtual environment already exists" -ForegroundColor Gray
    }
    
    # Activate virtual environment and install dependencies
    Write-Host "  Activating virtual environment..." -ForegroundColor Yellow
    . ./venv/Scripts/Activate.ps1
    
    Write-Host "  Upgrading pip..." -ForegroundColor Yellow
    python -m pip install --upgrade pip --quiet
    
    Write-Host "  Installing dependencies from requirements.txt..." -ForegroundColor Yellow
    pip install -r requirements.txt --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Failed to install dependencies" -ForegroundColor Red
        deactivate
        Pop-Location
        exit 1
    }
    
    Write-Host "  Backend dependencies installed!" -ForegroundColor Green
    
    # Check if .env exists
    if (-not (Test-Path ".env")) {
        Write-Host "  NOTE: No .env file found. You may need to create one." -ForegroundColor Yellow
        Write-Host "        Copy .env.example to .env and configure it." -ForegroundColor Gray
    }
    
    # Run migrations
    Write-Host "  Running database migrations..." -ForegroundColor Yellow
    python manage.py migrate --verbosity 0
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Migrations complete!" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Migration failed (database may not be configured)" -ForegroundColor Yellow
    }
    
    deactivate
    Pop-Location
    
    Write-Host "  Backend setup complete!" -ForegroundColor Green
}

# ===========================================
# Frontend Setup
# ===========================================
if (-not $BackendOnly) {
    Write-Host ""
    Write-Host "Setting up Frontend..." -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    Push-Location frontend
    
    # Clean install
    if (Test-Path "node_modules") {
        Write-Host "  Removing existing node_modules..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force node_modules
    }
    if (Test-Path "package-lock.json") {
        Write-Host "  Removing package-lock.json..." -ForegroundColor Yellow
        Remove-Item -Force package-lock.json
    }
    
    Write-Host "  Installing npm dependencies..." -ForegroundColor Yellow
    npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: npm install failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host "  Frontend setup complete!" -ForegroundColor Green
    Pop-Location
    
    # ===========================================
    # Servicedesk Setup
    # ===========================================
    Write-Host ""
    Write-Host "Setting up Servicedesk..." -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    Push-Location servicedesk
    
    # Clean install
    if (Test-Path "node_modules") {
        Write-Host "  Removing existing node_modules..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force node_modules
    }
    if (Test-Path "package-lock.json") {
        Write-Host "  Removing package-lock.json..." -ForegroundColor Yellow
        Remove-Item -Force package-lock.json
    }
    
    Write-Host "  Installing npm dependencies..." -ForegroundColor Yellow
    npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: npm install failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host "  Servicedesk setup complete!" -ForegroundColor Green
    Pop-Location
}

# ===========================================
# Summary
# ===========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the application, run:" -ForegroundColor White
Write-Host "  ./start.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Services will be available at:" -ForegroundColor White
Write-Host "  Backend:     http://localhost:8000" -ForegroundColor Gray
Write-Host "  Frontend:    http://localhost:5173" -ForegroundColor Gray
Write-Host "  Servicedesk: http://localhost:3001" -ForegroundColor Gray
Write-Host ""
