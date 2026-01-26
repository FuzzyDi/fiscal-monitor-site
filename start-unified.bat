@echo off
chcp 65001 >nul
cls

echo ╔════════════════════════════════════════════════════════╗
echo ║  Fiscal Monitor - Unified Endpoint Setup              ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [1/3] Stopping old containers...
docker-compose down
echo ✓ Stopped
echo.

echo [2/3] Starting services with Nginx...
docker-compose up -d --build
echo.

echo Waiting for services to start...
timeout /t 15 /nobreak >nul
echo.

echo [3/3] Checking status...
docker-compose ps
echo.

echo ════════════════════════════════════════════════════════
echo ✓ Services are running!
echo ════════════════════════════════════════════════════════
echo.
echo Access points:
echo   Local:    http://localhost:8080
echo   Admin:    http://localhost:8080/admin/login
echo   Portal:   http://localhost:8080/portal/login
echo   API:      http://localhost:8080/api/v1/...
echo   Health:   http://localhost:8080/health
echo.
echo ════════════════════════════════════════════════════════
echo.

set /p open="Open in browser? (Y/n): "
if /i "%open%" neq "n" (
    start http://localhost:8080
)

echo.
echo To expose publicly:
echo   cloudflared tunnel run fiscal-monitor  (named tunnel with fiscaldrive.sbg.network)
echo   OR (quick)
echo   cloudflared tunnel --url http://localhost:8080
echo.

pause
