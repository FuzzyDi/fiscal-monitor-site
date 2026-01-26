@echo off
chcp 65001 >nul
cls

echo ╔════════════════════════════════════════════════════════╗
echo ║  Fiscal Monitor - Production              ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [1/4] Checking environment...
if not exist .env (
    echo Creating .env file...
    echo NEXT_PUBLIC_API_URL= > .env
    echo ✓ Created .env
) else (
    echo ✓ .env exists
)
echo.

echo [2/4] Starting Docker services...
docker-compose up -d --build
if %errorlevel% neq 0 (
    echo ✗ Failed to start Docker services
    pause
    exit /b 1
)
echo ✓ Services started
echo.

echo Waiting for services...
timeout /t 15 /nobreak >nul

echo [3/4] Checking services...
docker-compose ps
echo.

echo [4/4] Starting Cloudflare Tunnel...
echo.
echo ════════════════════════════════════════════════════════
echo Your site will be available at:
echo   https://fiscaldrive.sbg.network
echo   https://fiscaldrive.sbg.network/admin/login
echo   https://fiscaldrive.sbg.network/portal/login
echo   https://api.fiscaldrive.sbg.network
echo ════════════════════════════════════════════════════════
echo.
echo Press Ctrl+C to stop the tunnel
echo.

cloudflared tunnel run fiscal-monitor

pause
