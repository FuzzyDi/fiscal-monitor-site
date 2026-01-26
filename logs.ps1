# Fiscal Monitor - View Logs (PowerShell)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Fiscal Monitor - Live Logs" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop viewing logs" -ForegroundColor Yellow
Write-Host ""

docker-compose logs -f --tail=50
