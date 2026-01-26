# Fiscal Monitor - Check Status (PowerShell)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Fiscal Monitor - System Status" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Docker Services:" -ForegroundColor Yellow
docker-compose ps
Write-Host ""

# Backend Health Check
Write-Host "Backend API (Port 3001):" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 3
    Write-Host "  [OK] Running" -ForegroundColor Green
    Write-Host "  Status: $($response.status)" -ForegroundColor Gray
    Write-Host "  Timestamp: $($response.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "  [ERROR] Not responding" -ForegroundColor Red
}
Write-Host ""

# Check .env configuration
Write-Host "Configuration:" -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    # Check Telegram token
    if ($envContent -match "TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE") {
        Write-Host "  [WARNING] Telegram token not configured" -ForegroundColor Yellow
    } else {
        Write-Host "  [OK] Telegram token configured" -ForegroundColor Green
        
        # Extract username
        if ($envContent -match "TELEGRAM_BOT_USERNAME=(.+)") {
            $username = $matches[1].Trim()
            Write-Host "  Bot username: @$username" -ForegroundColor Gray
        }
    }
    
    # Check Admin API Key
    if ($envContent -match "ADMIN_API_KEY=change_me") {
        Write-Host "  [WARNING] Admin API key uses default value" -ForegroundColor Yellow
    } else {
        Write-Host "  [OK] Admin API key configured" -ForegroundColor Green
    }
} else {
    Write-Host "  [ERROR] .env file not found" -ForegroundColor Red
}
Write-Host ""

# Container stats
Write-Host "Container Resource Usage:" -ForegroundColor Yellow
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker-compose ps -q)
Write-Host ""

Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f              - All logs (live)"
Write-Host "  docker-compose logs -f backend      - Backend logs"
Write-Host "  docker-compose logs -f telegram-bot - Bot logs"
Write-Host "  docker-compose restart              - Restart all"
Write-Host "  .\logs.ps1                          - View all logs"
Write-Host ""

Read-Host "Press Enter to exit"
