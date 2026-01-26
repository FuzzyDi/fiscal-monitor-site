#!/bin/bash

# Fiscal Monitor - Check Status

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "======================================"
echo "  Fiscal Monitor - System Status"
echo "======================================"
echo ""

# Check PM2
echo -e "${BLUE}PM2 Processes:${NC}"
if command -v pm2 &> /dev/null; then
    pm2 list
    echo ""
else
    echo -e "${RED}✗ PM2 not installed${NC}"
    echo ""
fi

# Check Backend API
echo -e "${BLUE}Backend API (Port 3001):${NC}"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    HEALTH=$(curl -s http://localhost:3001/health)
    echo -e "${GREEN}✓ Running${NC}"
    echo "  Response: $HEALTH"
else
    echo -e "${RED}✗ Not responding${NC}"
fi
echo ""

# Check Database
echo -e "${BLUE}Database:${NC}"
if [ -f "backend/.env" ]; then
    DATABASE_URL=$(grep "DATABASE_URL=" backend/.env | cut -d '=' -f2-)
    if [ ! -z "$DATABASE_URL" ]; then
        if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Connected${NC}"
            echo "  URL: ${DATABASE_URL:0:50}..."
        else
            echo -e "${RED}✗ Cannot connect${NC}"
            echo "  URL: ${DATABASE_URL:0:50}..."
        fi
    else
        echo -e "${YELLOW}⚠ DATABASE_URL not set${NC}"
    fi
else
    echo -e "${RED}✗ .env file not found${NC}"
fi
echo ""

# Check Telegram Bot Token
echo -e "${BLUE}Telegram Bot:${NC}"
if [ -f "backend/.env" ]; then
    TELEGRAM_TOKEN=$(grep "TELEGRAM_BOT_TOKEN=" backend/.env | cut -d '=' -f2)
    if [ "$TELEGRAM_TOKEN" == "YOUR_BOT_TOKEN_HERE" ] || [ -z "$TELEGRAM_TOKEN" ]; then
        echo -e "${RED}✗ Token not configured${NC}"
    else
        echo -e "${GREEN}✓ Token configured${NC}"
        TOKEN_USERNAME=$(grep "TELEGRAM_BOT_USERNAME=" backend/.env | cut -d '=' -f2)
        echo "  Username: @$TOKEN_USERNAME"
    fi
else
    echo -e "${RED}✗ .env file not found${NC}"
fi
echo ""

# System Resources
echo -e "${BLUE}System Resources:${NC}"
echo "  CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
echo "  Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "  Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
echo ""

# Logs
echo -e "${BLUE}Recent Logs (last 5 lines each):${NC}"
if command -v pm2 &> /dev/null; then
    echo ""
    echo "Backend API:"
    pm2 logs fiscal-api --nostream --lines 5 2>/dev/null | tail -5 || echo "  No logs"
    echo ""
    echo "Telegram Bot:"
    pm2 logs telegram-bot --nostream --lines 5 2>/dev/null | tail -5 || echo "  No logs"
    echo ""
    echo "Notification Worker:"
    pm2 logs notification-worker --nostream --lines 5 2>/dev/null | tail -5 || echo "  No logs"
fi

echo ""
echo "======================================"
echo ""
