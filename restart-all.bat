@echo off
REM Fiscal Monitor - Restart All Services (Windows)

echo ======================================
echo   Fiscal Monitor - Restarting Services
echo ======================================
echo.

docker-compose restart

echo.
echo [OK] All services restarted
echo.

docker-compose ps

echo.
pause
