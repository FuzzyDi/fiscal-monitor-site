# Fiscal Monitor - Reset Database (PowerShell)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Fiscal Monitor - Database Reset" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "WARNING: This will DELETE ALL DATA in the database!" -ForegroundColor Red
Write-Host ""

$confirmation = Read-Host "Are you sure? Type YES to continue"

if ($confirmation -ne "YES") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""
Write-Host "Stopping containers..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "Removing database volume..." -ForegroundColor Yellow
docker volume rm fiscal-monitor-site_postgres_data 2>$null

Write-Host ""
Write-Host "Starting services with fresh database..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "Waiting for database to initialize (30 seconds)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Database Reset Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

docker-compose ps

Write-Host ""
Write-Host "The database has been recreated with all Telegram tables." -ForegroundColor Green
Write-Host ""

# Verify tables
Write-Host "Verifying tables..." -ForegroundColor Cyan
docker-compose exec -T postgres psql -U postgres -d fiscal_monitor -c "\dt" 2>$null

Write-Host ""
Read-Host "Press Enter to exit"
