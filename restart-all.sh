#!/bin/bash

# Fiscal Monitor - Restart All Services

set -e

echo "======================================"
echo "  Fiscal Monitor - Restarting Services"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Running start-all.sh instead..."
    ./start-all.sh
    exit 0
fi

echo "Restarting all services..."
pm2 restart all

echo ""
echo -e "${GREEN}✓ All services restarted${NC}"
echo ""

pm2 list
echo ""
echo "View logs: pm2 logs"
echo ""
