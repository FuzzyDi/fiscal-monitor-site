@echo off
REM Fiscal Monitor - Rebuild All Containers (Windows)

echo ======================================
echo   Fiscal Monitor - Rebuilding
echo ======================================
echo.

echo Stopping all containers...
docker-compose down

echo.
echo Removing old images...
docker-compose rm -f

echo.
echo Building fresh images...
docker-compose build --no-cache

echo.
echo Starting services...
docker-compose up -d

echo.
echo ======================================
echo   Rebuild Complete!
echo ======================================
echo.

docker-compose ps

echo.
pause
