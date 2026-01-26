# Fiscal Monitor - Start All Services (PowerShell)
# Использует Docker Compose для запуска всех сервисов

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Fiscal Monitor - Starting Services" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Проверка Docker
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "[OK] Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker not found! Please install Docker Desktop." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Проверка docker-compose
try {
    $composeVersion = docker-compose --version 2>&1
    Write-Host "[OK] Docker Compose: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] docker-compose not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Проверка .env файла
if (-not (Test-Path ".env")) {
    Write-Host "[WARNING] .env file not found!" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host ""
        Write-Host "Please edit .env file and configure:" -ForegroundColor Yellow
        Write-Host "  - ADMIN_API_KEY" -ForegroundColor Yellow
        Write-Host "  - TELEGRAM_BOT_TOKEN" -ForegroundColor Yellow
        Write-Host "  - TELEGRAM_BOT_USERNAME" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to continue"
    }
}

# Проверка Telegram токена
$envContent = Get-Content ".env" -Raw
if ($envContent -match "TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE") {
    Write-Host "[WARNING] Telegram bot token not configured!" -ForegroundColor Yellow
    Write-Host "Telegram bot will fail to start until you configure the token." -ForegroundColor Yellow
    Write-Host "Update TELEGRAM_BOT_TOKEN in .env file." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Starting services with Docker Compose..." -ForegroundColor Cyan
Write-Host ""

# Останавливаем старые контейнеры
Write-Host "Stopping old containers..." -ForegroundColor Gray
docker-compose down 2>&1 | Out-Null

# Запускаем все сервисы
Write-Host "Building and starting services..." -ForegroundColor Cyan
docker-compose up -d --build

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Services Started Successfully!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Показываем статус
docker-compose ps

Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  docker-compose logs -f          - View all logs"
Write-Host "  docker-compose logs -f backend  - View backend logs"
Write-Host "  docker-compose ps               - List services"
Write-Host "  .\stop-all.ps1                  - Stop all services"
Write-Host "  .\status.ps1                    - Check status"
Write-Host ""
Write-Host "Access points:" -ForegroundColor Cyan
Write-Host "  Backend API:  http://localhost:3001"
Write-Host "  Frontend:     http://localhost:3000"
Write-Host "  Nginx:        http://localhost:8080"
Write-Host ""

# Проверка здоровья backend
Start-Sleep -Seconds 5
Write-Host "Checking backend health..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "[OK] Backend is healthy: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Backend health check failed. Check logs with: docker-compose logs backend" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
