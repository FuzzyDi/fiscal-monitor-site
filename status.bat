@echo off
REM Fiscal Monitor - Check Status (Windows)

echo ======================================
echo   Fiscal Monitor - System Status
echo ======================================
echo.

echo Docker Services:
docker-compose ps
echo.

echo ======================================
echo.
echo Recent logs (last 20 lines):
echo.

echo --- Backend API ---
docker-compose logs --tail=20 backend 2>nul
echo.

echo --- Telegram Bot ---
docker-compose logs --tail=20 telegram-bot 2>nul
echo.

echo --- Notification Worker ---
docker-compose logs --tail=20 notification-worker 2>nul
echo.

echo ======================================
echo.
echo Useful commands:
echo   docker-compose logs -f              - All logs (live)
echo   docker-compose logs -f backend      - Backend logs
echo   docker-compose logs -f telegram-bot - Bot logs
echo   docker-compose restart              - Restart all
echo.

pause
