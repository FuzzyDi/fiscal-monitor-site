# SBG FiscalDrive Agent v2.0 - Windows

Fiscal module monitoring agent for Windows.

## Contents

- `sbg-fiscaldrive-agent.exe` - executable
- `agent.conf` - configuration
- `install.ps1` - installer (PowerShell)
- `uninstall.ps1` - uninstaller

## Installation

### 1. Run PowerShell as Administrator

Right-click PowerShell -> "Run as Administrator"

### 2. Allow script execution (if needed)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. Run installer

```powershell
cd C:\path\to\agent\folder
.\install.ps1
```

### 4. Configure (optional)

```powershell
notepad C:\ProgramData\sbg-fiscaldrive-agent\agent.conf
```

### 5. Set DB password (if using database)

```powershell
notepad C:\ProgramData\sbg-fiscaldrive-agent\secrets.bat
```

Add line:
```batch
set DB_PASSWORD=your_password
```

### 6. Restart service

```powershell
Restart-Service sbg-fiscaldrive-agent
```

## Management Commands

```powershell
# Status
Get-Service sbg-fiscaldrive-agent

# Start
Start-Service sbg-fiscaldrive-agent

# Stop
Stop-Service sbg-fiscaldrive-agent

# Restart
Restart-Service sbg-fiscaldrive-agent

# View logs
Get-Content C:\ProgramData\sbg-fiscaldrive-agent\agent.log -Tail 50

# Follow logs in real-time
Get-Content C:\ProgramData\sbg-fiscaldrive-agent\agent.log -Wait
```

Also available via `services.msc` (Windows Services).

## File Locations

| File | Path |
|------|------|
| Program | `C:\Program Files\sbg-fiscaldrive-agent\` |
| Config | `C:\ProgramData\sbg-fiscaldrive-agent\agent.conf` |
| DB Password | `C:\ProgramData\sbg-fiscaldrive-agent\secrets.bat` |
| Logs | `C:\ProgramData\sbg-fiscaldrive-agent\agent.log` |

## Uninstall

```powershell
.\uninstall.ps1
```

## Manual Run (for debugging)

```powershell
# Stop service
Stop-Service sbg-fiscaldrive-agent

# Run manually
& "C:\Program Files\sbg-fiscaldrive-agent\sbg-fiscaldrive-agent.exe" -config "C:\ProgramData\sbg-fiscaldrive-agent\agent.conf"
```

## System Requirements

- Windows Server 2012 R2+ / Windows 10+
- FiscalDriveService (JSON-RPC API on port 3448)
- PowerShell 5.1+
- Internet access (HTTPS)

## Troubleshooting

### Service does not start

1. Check logs: `C:\ProgramData\sbg-fiscaldrive-agent\agent-error.log`
2. Run manually for diagnostics

### SSL certificate error

Add to `agent.conf`:
```
server.insecure=true
```

### No shop info

Specify manually in `agent.conf`:
```
shop.inn=123456789
shop.number=1
shop.name=ShopName
pos.number=1
```
