# Manual cloudflared installation script
# Run this if winget doesn't work

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cloudflared Manual Installation" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
$installPath = "$env:ProgramFiles\Cloudflare\cloudflared"
$exePath = "$installPath\cloudflared.exe"

# Create directory
Write-Host "Creating installation directory..." -ForegroundColor Yellow
if (-not (Test-Path $installPath)) {
    New-Item -ItemType Directory -Path $installPath -Force | Out-Null
}

# Download
Write-Host "Downloading cloudflared..." -ForegroundColor Yellow
try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $exePath -UseBasicParsing
    Write-Host "✓ Downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Download failed: $_" -ForegroundColor Red
    exit 1
}

# Add to PATH
Write-Host "Adding to PATH..." -ForegroundColor Yellow
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$installPath*") {
    [Environment]::SetEnvironmentVariable(
        "Path",
        "$currentPath;$installPath",
        "Machine"
    )
    Write-Host "✓ Added to PATH" -ForegroundColor Green
} else {
    Write-Host "✓ Already in PATH" -ForegroundColor Green
}

# Refresh PATH for current session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Test
Write-Host "`nTesting installation..." -ForegroundColor Yellow
& $exePath --version

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Installation complete!" -ForegroundColor Green
    Write-Host "You can now use 'cloudflared' command" -ForegroundColor Cyan
} else {
    Write-Host "`n✗ Installation failed" -ForegroundColor Red
}

Write-Host "`nIMPORTANT: Close and reopen PowerShell for PATH changes to take effect!" -ForegroundColor Yellow
