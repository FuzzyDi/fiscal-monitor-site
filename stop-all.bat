@echo off
REM Fiscal Monitor - Stop All Services (Windows)

echo ======================================
echo   Fiscal Monitor - Stopping Services
echo ======================================
echo.

docker-compose down

echo.
echo [OK] All services stopped
echo.

pause
