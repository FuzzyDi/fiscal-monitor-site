# Apply Telegram Migration (PowerShell)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Applying Telegram Migration" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This will add 8 new tables for Telegram notifications." -ForegroundColor Yellow
Write-Host "Existing data will NOT be deleted." -ForegroundColor Green
Write-Host ""

$confirmation = Read-Host "Continue? (Y/N)"

if ($confirmation -ne "Y") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""
Write-Host "Applying migration..." -ForegroundColor Cyan

# Apply migration
Get-Content backend/telegram-migration.sql | docker-compose exec -T postgres psql -U postgres -d fiscal_monitor

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Migration Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Verify tables
Write-Host "Verifying tables..." -ForegroundColor Cyan
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "\dt"

Write-Host ""
Write-Host "Expected tables:" -ForegroundColor Cyan
Write-Host "  - access_tokens (existing)" -ForegroundColor Gray
Write-Host "  - fiscal_events (existing)" -ForegroundColor Gray
Write-Host "  - fiscal_last_state (existing)" -ForegroundColor Gray
Write-Host "  - registrations (existing)" -ForegroundColor Gray
Write-Host "  - notification_cooldowns (NEW)" -ForegroundColor Green
Write-Host "  - notification_history (NEW)" -ForegroundColor Green
Write-Host "  - notification_preferences (NEW)" -ForegroundColor Green
Write-Host "  - notification_queue (NEW)" -ForegroundColor Green
Write-Host "  - notification_subscription_requests (NEW)" -ForegroundColor Green
Write-Host "  - notification_subscriptions (NEW)" -ForegroundColor Green
Write-Host "  - telegram_connect_codes (NEW)" -ForegroundColor Green
Write-Host "  - telegram_connections (NEW)" -ForegroundColor Green
Write-Host ""
Write-Host "Total: 12 tables" -ForegroundColor Yellow

Write-Host ""
Write-Host "Telegram features are now ready!" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
