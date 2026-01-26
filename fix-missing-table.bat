@echo off
echo ======================================
echo   Creating Missing Table
echo ======================================
echo.

echo Creating notification_subscription_requests table...
echo.

docker-compose exec -T postgres psql -U postgres -d fiscal_monitor < backend/fix-missing-table.sql

echo.
echo ======================================
echo   Table Created!
echo ======================================
echo.

echo Verifying...
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "\dt" | findstr "notification_subscription_requests"

echo.
echo Restarting backend...
docker-compose restart backend

echo.
echo Done! Test the portal now.
echo URL: https://fiscaldrive.sbg.network/portal/telegram
echo.

pause
