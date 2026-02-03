# =============================================================================
# SBG FiscalDrive Agent v2.0 - Windows Uninstaller
# Run: .\uninstall.ps1  (as Administrator)
# =============================================================================

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

$ServiceName = "sbg-fiscaldrive-agent"
$InstallDir = "C:\Program Files\sbg-fiscaldrive-agent"
$DataDir = "C:\ProgramData\sbg-fiscaldrive-agent"
$NssmExe = "$InstallDir\nssm\nssm.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SBG FiscalDrive Agent - Uninstall" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop service
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "[INFO] Stopping service..."
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    # Remove service
    Write-Host "[INFO] Removing service..."
    if (Test-Path $NssmExe) {
        & $NssmExe remove $ServiceName confirm
    } else {
        sc.exe delete $ServiceName
    }
    Start-Sleep -Seconds 1
} else {
    Write-Host "[INFO] Service not found"
}

# Ask about data deletion
Write-Host ""
$deleteData = Read-Host "Delete configuration and logs? ($DataDir) [y/N]"

if ($deleteData -eq "y" -or $deleteData -eq "Y") {
    Write-Host "[INFO] Deleting data..."
    Remove-Item -Path $DataDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Remove program
Write-Host "[INFO] Removing program..."
Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Uninstall completed" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
