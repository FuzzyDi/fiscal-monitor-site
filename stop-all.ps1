# Fiscal Monitor - Stop All Services (PowerShell)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Fiscal Monitor - Stopping Services" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

docker-compose down

Write-Host ""
Write-Host "[OK] All services stopped" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
