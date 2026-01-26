# Fiscal Monitor - Rebuild All Containers (PowerShell)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Fiscal Monitor - Rebuilding" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Stopping all containers..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "Removing old containers..." -ForegroundColor Yellow
docker-compose rm -f

Write-Host ""
Write-Host "Building fresh images (this may take a few minutes)..." -ForegroundColor Yellow
docker-compose build --no-cache

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Rebuild Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

docker-compose ps

Write-Host ""
Write-Host "Checking backend health..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "[OK] Backend is healthy" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Backend not ready yet. Check logs: docker-compose logs backend" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
