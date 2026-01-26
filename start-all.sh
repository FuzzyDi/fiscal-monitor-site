#!/bin/bash

# Fiscal Monitor - Start All Services
# This script starts all backend services using PM2

set -e  # Exit on error

echo "======================================"
echo "  Fiscal Monitor - Starting Services"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 not found. Installing PM2...${NC}"
    npm install -g pm2
fi

# Navigate to project root
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

echo -e "${GREEN}✓${NC} Project root: $PROJECT_ROOT"
echo ""

# Check .env file
if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    echo -e "${RED}✗ Error: backend/.env file not found!${NC}"
    echo "Please create .env file from .env.example"
    exit 1
fi

# Check if Telegram token is configured
TELEGRAM_TOKEN=$(grep "TELEGRAM_BOT_TOKEN=" "$PROJECT_ROOT/backend/.env" | cut -d '=' -f2)
if [ "$TELEGRAM_TOKEN" == "YOUR_BOT_TOKEN_HERE" ] || [ -z "$TELEGRAM_TOKEN" ]; then
    echo -e "${YELLOW}⚠ Warning: Telegram bot token not configured!${NC}"
    echo "Telegram bot will fail to start until you configure the token."
    echo "Update TELEGRAM_BOT_TOKEN in backend/.env"
    echo ""
fi

echo -e "${GREEN}✓${NC} Configuration OK"
echo ""

# Stop existing processes (if any)
echo "Stopping existing services..."
pm2 stop fiscal-api telegram-bot notification-worker 2>/dev/null || true
pm2 delete fiscal-api telegram-bot notification-worker 2>/dev/null || true
echo -e "${GREEN}✓${NC} Cleaned up old processes"
echo ""

# Start Backend API
echo "Starting Backend API..."
cd "$PROJECT_ROOT/backend"
pm2 start server.js --name "fiscal-api" --time
echo -e "${GREEN}✓${NC} Backend API started"
echo ""

# Start Telegram Bot
echo "Starting Telegram Bot..."
pm2 start telegram-bot.js --name "telegram-bot" --time
echo -e "${GREEN}✓${NC} Telegram Bot started"
echo ""

# Start Background Worker
echo "Starting Background Worker..."
pm2 start background-worker.js --name "notification-worker" --time
echo -e "${GREEN}✓${NC} Background Worker started"
echo ""

# Save PM2 configuration
pm2 save

echo ""
echo "======================================"
echo -e "${GREEN}  All Services Started Successfully!${NC}"
echo "======================================"
echo ""
echo "Running services:"
pm2 list
echo ""
echo "Useful commands:"
echo "  pm2 logs              - View all logs"
echo "  pm2 logs fiscal-api   - View API logs"
echo "  pm2 logs telegram-bot - View bot logs"
echo "  pm2 logs notification-worker - View worker logs"
echo "  pm2 monit             - Monitor all processes"
echo "  pm2 restart all       - Restart all services"
echo "  pm2 stop all          - Stop all services"
echo ""
echo "To stop services:"
echo "  ./stop-all.sh         or    pm2 stop all"
echo ""
