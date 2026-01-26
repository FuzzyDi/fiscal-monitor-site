@echo off
chcp 65001 >nul
cls

echo ╔════════════════════════════════════════════════════════╗
echo ║  Fiscal Monitor - Production Rebuild                  ║
echo ║  This will fix API URL issues                         ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [1/6] Stopping containers...
docker-compose down
echo ✓ Stopped
echo.

echo [2/6] Removing old frontend image...
docker rmi fiscal-monitor-frontend -f 2>nul
echo ✓ Removed
echo.

echo [3/6] Ensuring frontend API base URL...
echo (Recommended) For unified endpoint: NEXT_PUBLIC_API_URL should be empty in frontend\.env
echo NEXT_PUBLIC_API_URL= > frontend\.env
echo ✓ Updated frontend\.env
echo.

echo [4/6] Rebuilding from scratch...
docker-compose build --no-cache
if %errorlevel% neq 0 (
    echo ✗ Build failed!
    pause
    exit /b 1
)
echo ✓ Built
echo.

echo [5/6] Starting services...
docker-compose up -d
echo ✓ Started
echo.

echo Waiting for services to be ready...
timeout /t 20 /nobreak >nul

echo [6/6] Verifying configuration...
docker-compose exec -T frontend env | findstr "NEXT_PUBLIC_API_URL" 2>nul
echo.

echo ════════════════════════════════════════════════════════
echo ✓ Rebuild complete!
echo ════════════════════════════════════════════════════════
echo.
echo Your site should now work at:
echo   https://fiscaldrive.sbg.network
echo.
echo If still not working, check browser DevTools (F12) → Network
echo API requests should go to: https://fiscaldrive.sbg.network/api/...
echo.

pause
