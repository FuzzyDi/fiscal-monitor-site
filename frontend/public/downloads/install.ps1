# =============================================================================
# SBG FiscalDrive Agent v2.0 - Windows Installer
# Run: .\install.ps1  (as Administrator)
# =============================================================================

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

# Configuration
$ServiceName = "sbg-fiscaldrive-agent"
$DisplayName = "SBG FiscalDrive Agent"
$Description = "Fiscal module monitoring agent"
$InstallDir = "C:\Program Files\sbg-fiscaldrive-agent"
$DataDir = "C:\ProgramData\sbg-fiscaldrive-agent"
$NssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
$NssmDir = "$InstallDir\nssm"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SBG FiscalDrive Agent - Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check files
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BinaryPath = Join-Path $ScriptDir "sbg-fiscaldrive-agent.exe"
$ConfigPath = Join-Path $ScriptDir "agent.conf"

if (-not (Test-Path $BinaryPath)) {
    Write-Host "[ERROR] Not found: $BinaryPath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $ConfigPath)) {
    Write-Host "[ERROR] Not found: $ConfigPath" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Files found" -ForegroundColor Green

# Stop existing service
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "[INFO] Stopping existing service..."
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Create directories
Write-Host "[INFO] Creating directories..."
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
New-Item -ItemType Directory -Force -Path $NssmDir | Out-Null

# Copy files
Write-Host "[INFO] Copying files..."
Copy-Item $BinaryPath "$InstallDir\sbg-fiscaldrive-agent.exe" -Force

# Copy config only if not exists
$TargetConfig = "$DataDir\agent.conf"
if (-not (Test-Path $TargetConfig)) {
    Write-Host "[INFO] Copying configuration..."
    Copy-Item $ConfigPath $TargetConfig
} else {
    Write-Host "[WARN] Config exists: $TargetConfig" -ForegroundColor Yellow
}

# Create secrets file
$SecretsFile = "$DataDir\secrets.bat"
if (-not (Test-Path $SecretsFile)) {
    Write-Host "[INFO] Creating secrets file..."
    $secretsContent = "@echo off`r`nREM Set DB password here:`r`nset DB_PASSWORD="
    [System.IO.File]::WriteAllText($SecretsFile, $secretsContent, [System.Text.Encoding]::ASCII)
    Write-Host "[WARN] Edit $SecretsFile and set DB_PASSWORD" -ForegroundColor Yellow
}

# Download NSSM
$NssmExe = "$NssmDir\nssm.exe"
if (-not (Test-Path $NssmExe)) {
    Write-Host "[INFO] Downloading NSSM..."
    $NssmZip = "$env:TEMP\nssm.zip"
    
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $NssmUrl -OutFile $NssmZip -UseBasicParsing
        
        Write-Host "[INFO] Extracting NSSM..."
        Expand-Archive -Path $NssmZip -DestinationPath "$env:TEMP\nssm" -Force
        
        # Copy exe (64-bit)
        $NssmExtracted = Get-ChildItem "$env:TEMP\nssm\nssm-*\win64\nssm.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($NssmExtracted) {
            Copy-Item $NssmExtracted.FullName $NssmExe
        } else {
            # Try 32-bit
            $NssmExtracted = Get-ChildItem "$env:TEMP\nssm\nssm-*\win32\nssm.exe" | Select-Object -First 1
            Copy-Item $NssmExtracted.FullName $NssmExe
        }
        
        Remove-Item $NssmZip -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:TEMP\nssm" -Recurse -Force -ErrorAction SilentlyContinue
        
    } catch {
        Write-Host "[ERROR] Failed to download NSSM: $_" -ForegroundColor Red
        Write-Host "[INFO] Download manually: $NssmUrl" -ForegroundColor Yellow
        exit 1
    }
}

# Remove old service
if ($existingService) {
    Write-Host "[INFO] Removing old service..."
    & $NssmExe remove $ServiceName confirm 2>$null
    Start-Sleep -Seconds 1
}

# Create batch wrapper
$BatchWrapper = "$InstallDir\start-agent.bat"
$batchContent = "@echo off`r`nif exist `"C:\ProgramData\sbg-fiscaldrive-agent\secrets.bat`" (`r`n    call `"C:\ProgramData\sbg-fiscaldrive-agent\secrets.bat`"`r`n)`r`n`"C:\Program Files\sbg-fiscaldrive-agent\sbg-fiscaldrive-agent.exe`" -config `"C:\ProgramData\sbg-fiscaldrive-agent\agent.conf`""
[System.IO.File]::WriteAllText($BatchWrapper, $batchContent, [System.Text.Encoding]::ASCII)

# Install service via NSSM
Write-Host "[INFO] Installing service..."
& $NssmExe install $ServiceName $BatchWrapper
& $NssmExe set $ServiceName DisplayName $DisplayName
& $NssmExe set $ServiceName Description $Description
& $NssmExe set $ServiceName AppDirectory $InstallDir
& $NssmExe set $ServiceName AppStdout "$DataDir\agent.log"
& $NssmExe set $ServiceName AppStderr "$DataDir\agent-error.log"
& $NssmExe set $ServiceName AppRotateFiles 1
& $NssmExe set $ServiceName AppRotateBytes 10485760
& $NssmExe set $ServiceName Start SERVICE_AUTO_START

# Start service
Write-Host "[INFO] Starting service..."
Start-Service -Name $ServiceName

Start-Sleep -Seconds 2

# Check status
$service = Get-Service -Name $ServiceName
if ($service.Status -eq "Running") {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Installation completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[WARN] Service not started. Check logs." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Configuration: $TargetConfig"
Write-Host "DB Password:   $SecretsFile"
Write-Host "Logs:          $DataDir\agent.log"
Write-Host ""
Write-Host "Management commands:" -ForegroundColor Cyan
Write-Host "  Start-Service $ServiceName    - Start"
Write-Host "  Stop-Service $ServiceName     - Stop"
Write-Host "  Restart-Service $ServiceName  - Restart"
Write-Host "  Get-Service $ServiceName      - Status"
Write-Host ""
Write-Host "Or use services.msc (Windows Services)"
Write-Host ""
