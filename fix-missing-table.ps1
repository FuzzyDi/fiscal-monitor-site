# Fix Missing Table - Manual Creation

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Creating Missing Table Manually" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Creating notification_subscription_requests table..." -ForegroundColor Yellow

$sql = @"
-- Create missing table
CREATE TABLE IF NOT EXISTS notification_subscription_requests (
  id SERIAL PRIMARY KEY,
  shop_inn TEXT NOT NULL REFERENCES registrations(shop_inn) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  client_comment TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  admin_comment TEXT,
  subscription_id INTEGER
);

-- Ensure only one pending request per INN
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_requests_pending 
  ON notification_subscription_requests(shop_inn, status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_subscription_requests_status 
  ON notification_subscription_requests(status, requested_at);
"@

$sql | docker-compose exec -T postgres psql -U postgres -d fiscal_monitor

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Table Created!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

Write-Host "Verifying..." -ForegroundColor Cyan
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "\dt" | Select-String "notification_subscription_requests"

Write-Host ""
Write-Host "Restarting backend..." -ForegroundColor Cyan
docker-compose restart backend

Write-Host ""
Write-Host "Done! Test the portal now." -ForegroundColor Green
Write-Host "URL: https://fiscaldrive.sbg.network/portal/telegram" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
