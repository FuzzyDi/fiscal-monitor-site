@echo off
REM Fiscal Monitor - View Logs (Windows)

echo ======================================
echo   Fiscal Monitor - Live Logs
echo ======================================
echo.
echo Press Ctrl+C to stop viewing logs
echo.

docker-compose logs -f --tail=50
