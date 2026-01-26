@echo off
REM Fiscal Monitor - Start All Services (Windows)
REM Использует Docker Compose для запуска всех сервисов

echo ======================================
echo   Fiscal Monitor - Starting Services
echo ======================================
echo.

REM Проверка Docker
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker not found! Please install Docker Desktop.
    pause
    exit /b 1
)

REM Проверка docker-compose
docker-compose --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] docker-compose not found! Please install Docker Compose.
    pause
    exit /b 1
)

echo [OK] Docker is installed
echo.

REM Проверка .env файла
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo Creating from .env.example...
    copy .env.example .env
    echo.
    echo Please edit .env file and configure:
    echo   - ADMIN_API_KEY
    echo   - TELEGRAM_BOT_TOKEN
    echo   - TELEGRAM_BOT_USERNAME
    echo.
    pause
)

REM Проверка Telegram токена
findstr /C:"TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE" .env >nul
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Telegram bot token not configured!
    echo Telegram bot will fail to start.
    echo Please update TELEGRAM_BOT_TOKEN in .env file.
    echo.
)

echo Starting services with Docker Compose...
echo.

REM Останавливаем старые контейнеры (если есть)
docker-compose down

REM Запускаем все сервисы
docker-compose up -d --build

echo.
echo ======================================
echo   Services Started!
echo ======================================
echo.

REM Показываем статус
docker-compose ps

echo.
echo Useful commands:
echo   docker-compose logs -f          - View all logs
echo   docker-compose logs -f backend  - View backend logs
echo   docker-compose ps               - List services
echo   stop-all.bat                    - Stop all services
echo.
echo Access points:
echo   Backend API:  http://localhost:3001
echo   Frontend:     http://localhost:3000
echo   Nginx:        http://localhost:8080
echo.

pause
