# Database Reset Script for Development
# This script resets the database and optionally creates a superuser

param(
    [switch]$CreateSuperuser,
    [switch]$LoadFixtures,
    [switch]$NoInput
)

Write-Host ""
Write-Host "🔄 Database Reset Utility" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Already in backend directory
Set-Location -Path "$PSScriptRoot"

# Build the command
$command = "python manage.py reset_db"

if ($CreateSuperuser) {
    $command += " --create-superuser"
}

if ($LoadFixtures) {
    $command += " --load-fixtures"
}

if ($NoInput) {
    $command += " --no-input"
}

# Execute the command
Write-Host "Executing: $command" -ForegroundColor Yellow
Write-Host ""

Invoke-Expression $command

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
