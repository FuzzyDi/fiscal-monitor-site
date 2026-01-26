# Setup script for Fiscal Monitor IP access
# Run this script to configure access via IP address

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fiscal Monitor - IP Access Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Get local IP address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual"
} | Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    Write-Host "Could not detect IP address automatically." -ForegroundColor Yellow
    $ipAddress = Read-Host "Please enter your IP address (e.g., 192.168.80.19)"
}

Write-Host "Detected IP Address: $ipAddress" -ForegroundColor Green

# Confirm
$confirm = Read-Host "`nUse this IP? (Y/n)"
if ($confirm -eq "n" -or $confirm -eq "N") {
    $ipAddress = Read-Host "Enter your IP address"
}

$apiUrl = "http://${ipAddress}:3001"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "Frontend URL: http://${ipAddress}:3000" -ForegroundColor White
Write-Host "API URL: $apiUrl" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan

# Create .env.local
$envContent = "NEXT_PUBLIC_API_URL=$apiUrl"
$envPath = "frontend\.env.local"

Write-Host "Creating $envPath..." -ForegroundColor Yellow
$envContent | Out-File -FilePath $envPath -Encoding ASCII -NoNewline

if (Test-Path $envPath) {
    Write-Host "✓ Created $envPath" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create $envPath" -ForegroundColor Red
    exit 1
}

# Stop containers
Write-Host "`nStopping containers..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null

# Remove old images
Write-Host "Removing old images..." -ForegroundColor Yellow
docker rmi fiscal-monitor-frontend fiscal-monitor-backend -f 2>&1 | Out-Null

# Build
Write-Host "`nBuilding containers (this may take a few minutes)..." -ForegroundColor Yellow
docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}

# Start
Write-Host "`nStarting containers..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to start containers!" -ForegroundColor Red
    exit 1
}

# Wait for services
Write-Host "`nWaiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check status
Write-Host "`nChecking container status..." -ForegroundColor Yellow
docker-compose ps

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nYou can now access:" -ForegroundColor White
Write-Host "  Frontend:    http://${ipAddress}:3000" -ForegroundColor Cyan
Write-Host "  Admin Login: http://${ipAddress}:3000/admin/login" -ForegroundColor Cyan
Write-Host "  Portal:      http://${ipAddress}:3000/portal/login" -ForegroundColor Cyan
Write-Host "  API Health:  http://${ipAddress}:3001/health" -ForegroundColor Cyan

Write-Host "`nPress Enter to open in browser..." -ForegroundColor Yellow
Read-Host

Start-Process "http://${ipAddress}:3000"

Write-Host "`nSetup script completed." -ForegroundColor Green
Write-Host "If you encounter issues, check logs with: docker-compose logs -f" -ForegroundColor Yellow
