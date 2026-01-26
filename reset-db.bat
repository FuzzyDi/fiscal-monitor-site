@echo off
REM Fiscal Monitor - Reset Database (Windows)

echo ======================================
echo   Fiscal Monitor - Database Reset
echo ======================================
echo.

echo WARNING: This will DELETE ALL DATA in the database!
echo.
set /p CONFIRM="Are you sure? Type YES to continue: "

if not "%CONFIRM%"=="YES" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo Stopping containers...
docker-compose down

echo.
echo Removing database volume...
docker volume rm fiscal-monitor-site_postgres_data 2>nul

echo.
echo Starting services with fresh database...
docker-compose up -d

echo.
echo Waiting for database to initialize (30 seconds)...
timeout /t 30 /nobreak

echo.
echo ======================================
echo   Database Reset Complete!
echo ======================================
echo.

docker-compose ps

echo.
echo The database has been recreated with all Telegram tables.
echo.

pause
