# Cloudflare Tunnel Setup Script
# This script will set up Cloudflare Tunnel for Fiscal Monitor

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cloudflare Tunnel Setup for Fiscal Monitor" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if cloudflared is installed
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue

if (-not $cloudflared) {
    Write-Host "cloudflared not found. Installing..." -ForegroundColor Yellow
    
    # Check if winget is available
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    
    if ($winget) {
        winget install Cloudflare.cloudflared
    } else {
        Write-Host "Please download cloudflared manually from:" -ForegroundColor Red
        Write-Host "https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Cyan
        Write-Host "`nDownload cloudflared-windows-amd64.exe and add it to PATH" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✓ cloudflared is installed" -ForegroundColor Green

# Check if user is logged in
Write-Host "`nChecking authentication..." -ForegroundColor Yellow

$configPath = "$env:USERPROFILE\.cloudflared"
if (-not (Test-Path "$configPath\cert.pem")) {
    Write-Host "You need to login to Cloudflare first." -ForegroundColor Yellow
    Write-Host "Running: cloudflared tunnel login" -ForegroundColor Cyan
    Write-Host "This will open a browser window. Please login and authorize." -ForegroundColor Yellow
    
    cloudflared tunnel login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Login failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Authenticated" -ForegroundColor Green

# List existing tunnels
Write-Host "`nChecking for existing tunnels..." -ForegroundColor Yellow
$tunnels = cloudflared tunnel list 2>&1

if ($tunnels -match "fiscal-monitor") {
    Write-Host "✓ Tunnel 'fiscal-monitor' already exists" -ForegroundColor Green
} else {
    Write-Host "Creating new tunnel 'fiscal-monitor'..." -ForegroundColor Yellow
    cloudflared tunnel create fiscal-monitor
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to create tunnel" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Tunnel created successfully" -ForegroundColor Green
}

# Get tunnel info
$tunnelInfo = cloudflared tunnel info fiscal-monitor 2>&1
Write-Host "`nTunnel Information:" -ForegroundColor Cyan
Write-Host $tunnelInfo -ForegroundColor White

# Create config file
Write-Host "`nCreating tunnel configuration..." -ForegroundColor Yellow

$tunnelId = ($tunnelInfo | Select-String -Pattern "([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})").Matches.Value

if (-not $tunnelId) {
    Write-Host "✗ Could not determine tunnel ID" -ForegroundColor Red
    exit 1
}

$configContent = @"
tunnel: $tunnelId
credentials-file: $configPath\$tunnelId.json

ingress:
  # Project: Fiscal Monitor (unified endpoint)
  - hostname: fiscaldrive.sbg.network
    service: http://localhost:8080

  # Optional API hostname for this project
  - hostname: api.fiscaldrive.sbg.network
    service: http://localhost:8080

  - service: http_status:404
"@

$configContent | Out-File -FilePath "$configPath\config.yml" -Encoding UTF8

Write-Host "✓ Configuration created at: $configPath\config.yml" -ForegroundColor Green

# Instructions
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nTo start the tunnel, run:" -ForegroundColor Yellow
Write-Host "  cloudflared tunnel run fiscal-monitor" -ForegroundColor Cyan

Write-Host "`nOr use this one-liner (simpler):" -ForegroundColor Yellow
Write-Host "  cloudflared tunnel --url http://localhost:8080" -ForegroundColor Cyan

Write-Host "`nYour service will be available at a URL like:" -ForegroundColor Yellow
Write-Host "  https://abc-def-ghi.trycloudflare.com" -ForegroundColor Cyan

Write-Host "`n⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "The free quick tunnel URL changes each time you restart." -ForegroundColor White
Write-Host "For a permanent URL, configure a custom domain in Cloudflare dashboard." -ForegroundColor White

Write-Host "`nTo configure a custom domain:" -ForegroundColor Yellow
Write-Host "1. Go to https://dash.cloudflare.com" -ForegroundColor White
Write-Host "2. Add your domain to Cloudflare (if not already)" -ForegroundColor White
Write-Host "3. Go to Zero Trust > Networks > Tunnels" -ForegroundColor White
Write-Host "4. Configure public hostname for your tunnel" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan

# Ask if user wants to start now
$start = Read-Host "`nStart tunnel now? (Y/n)"

if ($start -ne "n" -and $start -ne "N") {
    Write-Host "`nStarting tunnel..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

    cloudflared tunnel --url http://localhost:8080
}