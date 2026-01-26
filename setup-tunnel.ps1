# Complete Cloudflare Tunnel Setup - Fiscal Monitor
# This script will set up everything automatically

$ErrorActionPreference = "Stop"

Write-Host @"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     Cloudflare Tunnel Setup for Fiscal Monitor            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""

# Function to check if running as admin
function Test-Administrator {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($user)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "⚠️  This script should be run as Administrator for best results." -ForegroundColor Yellow
    Write-Host "   Some features may not work without admin rights.`n" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit
    }
}

# Step 1: Check Docker is running
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "Step 1: Checking Docker..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

try {
    $dockerStatus = docker-compose ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker is running" -ForegroundColor Green
        
        # Check if containers are up
        $frontendUp = $dockerStatus | Select-String "fiscal-monitor-frontend" | Select-String "Up"
        $backendUp = $dockerStatus | Select-String "fiscal-monitor-backend" | Select-String "Up"
        
        if ($frontendUp -and $backendUp) {
            Write-Host "✓ Fiscal Monitor containers are running" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Fiscal Monitor containers are not running" -ForegroundColor Yellow
            $start = Read-Host "Start them now? (Y/n)"
            if ($start -ne "n" -and $start -ne "N") {
                Write-Host "Starting containers..." -ForegroundColor Yellow
                docker-compose up -d
                Start-Sleep -Seconds 10
            }
        }
    }
} catch {
    Write-Host "✗ Docker is not running or not installed" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

# Test localhost
Write-Host "`nTesting local access..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✓ Frontend is accessible at http://localhost:8080" -ForegroundColor Green
} catch {
    Write-Host "✗ Cannot access http://localhost:8080" -ForegroundColor Red
    Write-Host "  Make sure Fiscal Monitor is running!" -ForegroundColor Yellow
    exit 1
}

# Step 2: Install cloudflared
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "Step 2: Installing cloudflared..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue

if ($cloudflared) {
    Write-Host "✓ cloudflared is already installed" -ForegroundColor Green
    $version = & cloudflared --version
    Write-Host "  Version: $version" -ForegroundColor Gray
} else {
    Write-Host "cloudflared not found. Installing..." -ForegroundColor Yellow
    
    # Try winget first
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Host "Installing via winget..." -ForegroundColor Yellow
        try {
            winget install Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Installed via winget" -ForegroundColor Green
                
                # Refresh PATH
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
                
                Write-Host "`n⚠️  IMPORTANT: Please close and reopen PowerShell, then run this script again!" -ForegroundColor Yellow
                Write-Host "Press any key to exit..." -ForegroundColor Gray
                $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                exit 0
            }
        } catch {
            Write-Host "winget installation failed, trying manual download..." -ForegroundColor Yellow
        }
    }
    
    # Manual installation
    Write-Host "Downloading cloudflared manually..." -ForegroundColor Yellow
    $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    $installPath = "$env:ProgramFiles\Cloudflare\cloudflared"
    $exePath = "$installPath\cloudflared.exe"
    
    # Create directory
    if (-not (Test-Path $installPath)) {
        New-Item -ItemType Directory -Path $installPath -Force | Out-Null
    }
    
    # Download
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $downloadUrl -OutFile $exePath -UseBasicParsing
        Write-Host "✓ Downloaded successfully" -ForegroundColor Green
        
        # Add to PATH
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        if ($currentPath -notlike "*$installPath*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$installPath", "Machine")
            $env:Path += ";$installPath"
        }
        
        Write-Host "✓ Installation complete" -ForegroundColor Green
    } catch {
        Write-Host "✗ Download failed: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Quick Tunnel (simplest option)
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "Step 3: Choose Tunnel Type" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

Write-Host @"

You have 2 options:

1. Quick Tunnel (Recommended for testing)
   ✓ No login required
   ✓ Works immediately
   ✓ Random URL (changes on restart)
   ✓ Example: https://abc-def-ghi.trycloudflare.com

2. Named Tunnel (For production)
   ✓ Login to Cloudflare required
   ✓ Can use custom domain (if you have one)
   ✓ Permanent URL
   ✓ Can run as Windows Service

"@ -ForegroundColor White

$choice = Read-Host "Choose option (1 or 2)"

if ($choice -eq "1") {
    # Quick Tunnel
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "Starting Quick Tunnel..." -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    
    Write-Host @"

This will create a public URL for your Fiscal Monitor.
The URL will be displayed below.

Press Ctrl+C to stop the tunnel.

"@ -ForegroundColor Yellow

    Write-Host "Starting tunnel..." -ForegroundColor Green
    Start-Sleep -Seconds 2
    
    # Start tunnel
    cloudflared tunnel --url http://localhost:8080
    
} elseif ($choice -eq "2") {
    # Named Tunnel
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "Setting up Named Tunnel..." -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    
    # Check if already logged in
    $configPath = "$env:USERPROFILE\.cloudflared"
    $certPath = "$configPath\cert.pem"
    
    if (-not (Test-Path $certPath)) {
        Write-Host "`nYou need to login to Cloudflare first." -ForegroundColor Yellow
        Write-Host "This will open a browser window." -ForegroundColor Yellow
        Write-Host "Please login and authorize the connection.`n" -ForegroundColor Yellow
        
        Read-Host "Press Enter to continue"
        
        cloudflared tunnel login
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Login failed" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✓ Successfully logged in" -ForegroundColor Green
    } else {
        Write-Host "✓ Already logged in to Cloudflare" -ForegroundColor Green
    }
    
    # Check for existing tunnel
    Write-Host "`nChecking for existing tunnels..." -ForegroundColor Yellow
    $existingTunnel = cloudflared tunnel list 2>&1 | Select-String "fiscal-monitor"
    
    if ($existingTunnel) {
        Write-Host "✓ Tunnel 'fiscal-monitor' already exists" -ForegroundColor Green
    } else {
        Write-Host "Creating tunnel 'fiscal-monitor'..." -ForegroundColor Yellow
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
    Write-Host $tunnelInfo -ForegroundColor Gray
    
    # Extract tunnel ID
    $tunnelId = ($tunnelInfo | Select-String -Pattern "([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})").Matches.Value
    
    if (-not $tunnelId) {
        Write-Host "✗ Could not determine tunnel ID" -ForegroundColor Red
        exit 1
    }
    
    # Create config
    Write-Host "`nCreating configuration..." -ForegroundColor Yellow
    
    $configContent = @"
tunnel: $tunnelId
credentials-file: $configPath\$tunnelId.json

ingress:
  # Catch-all rule
  - service: http://localhost:8080
"@
    
    $configContent | Out-File -FilePath "$configPath\config.yml" -Encoding UTF8
    Write-Host "✓ Configuration created" -ForegroundColor Green
    
    # Ask about Windows Service
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "Windows Service Installation (Optional)" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    
    Write-Host @"

Would you like to install the tunnel as a Windows Service?
This will make it start automatically with Windows.

"@ -ForegroundColor White
    
    $installService = Read-Host "Install as service? (y/N)"
    
    if ($installService -eq "y" -or $installService -eq "Y") {
        if (-not (Test-Administrator)) {
            Write-Host "✗ Admin rights required to install service" -ForegroundColor Red
            Write-Host "  Please restart this script as Administrator" -ForegroundColor Yellow
        } else {
            Write-Host "Installing Windows Service..." -ForegroundColor Yellow
            cloudflared service install
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Service installed" -ForegroundColor Green
                Write-Host "Starting service..." -ForegroundColor Yellow
                net start cloudflared
                Write-Host "✓ Service started" -ForegroundColor Green
                
                Write-Host @"

✓ Tunnel is now running as a Windows Service!
  It will start automatically when Windows boots.

To manage the service:
  Stop:    net stop cloudflared
  Start:   net start cloudflared
  Remove:  cloudflared service uninstall

"@ -ForegroundColor Green
            }
        }
    } else {
        Write-Host "`nStarting tunnel manually..." -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Gray
        
        Start-Sleep -Seconds 2
        cloudflared tunnel run fiscal-monitor
    }
    
} else {
    Write-Host "Invalid choice" -ForegroundColor Red
    exit 1
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
