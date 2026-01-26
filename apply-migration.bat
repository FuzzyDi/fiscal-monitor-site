@echo off
REM Apply Telegram Migration (Windows)

echo ======================================
echo   Applying Telegram Migration
echo ======================================
echo.

echo This will add 8 new tables for Telegram notifications.
echo Existing data will NOT be deleted.
echo.

set /p CONFIRM="Continue? (Y/N): "

if not "%CONFIRM%"=="Y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo Applying migration...

type backend\telegram-migration.sql | docker-compose exec -T postgres psql -U postgres -d fiscal_monitor

echo.
echo ======================================
echo   Migration Complete!
echo ======================================
echo.

echo Verifying tables...
docker-compose exec postgres psql -U postgres -d fiscal_monitor -c "\dt"

echo.
echo Expected: 12 tables (4 old + 8 new)
echo.

pause
