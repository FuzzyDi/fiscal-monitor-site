#!/bin/bash

# Fiscal Monitor - Stop All Services

set -e

echo "======================================"
echo "  Fiscal Monitor - Stopping Services"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}✗ PM2 not found. Nothing to stop.${NC}"
    exit 0
fi

echo "Stopping all services..."
pm2 stop all

echo ""
echo -e "${GREEN}✓ All services stopped${NC}"
echo ""

read -p "Delete processes from PM2? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 delete all
    echo -e "${GREEN}✓ All processes deleted${NC}"
fi

echo ""
echo "Current PM2 status:"
pm2 list
echo ""
