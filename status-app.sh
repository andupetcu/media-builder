#!/bin/bash

# Media Builder App Status Script
# Shows status of all services

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
WEB_PORT=3000
API_PORT=3001
WS_PORT=8081
HOST="10.0.0.60"

echo -e "${GREEN}=== Media Builder App Status ===${NC}"
echo ""

# Function to check port status
check_service() {
    local name=$1
    local port=$2
    # Use ss instead of lsof to check for bound ports
    local pids=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1)

    if [ ! -z "$pids" ]; then
        echo -e "${GREEN}✓ $name (port $port)${NC}"
        for pid in $pids; do
            local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "")
            local uptime=$(ps -p $pid -o etime= 2>/dev/null | xargs)
            echo "    PID: $pid | Uptime: $uptime"
            echo "    Command: $(echo $cmd | cut -c1-80)"
        done
        echo ""
        return 0
    else
        echo -e "${RED}✗ $name (port $port) - NOT RUNNING${NC}"
        echo ""
        return 1
    fi
}

# Check all services
check_service "Web Frontend" $WEB_PORT
WEB_STATUS=$?

check_service "API Backend" $API_PORT
API_STATUS=$?

check_service "WebSocket" $WS_PORT
WS_STATUS=$?

# Summary
echo -e "${GREEN}=== Summary ===${NC}"
if [ $WEB_STATUS -eq 0 ] && [ $API_STATUS -eq 0 ]; then
    echo -e "${GREEN}All core services are running!${NC}"
    echo ""
    echo "Access the app at:"
    echo "  https://builder.footprints.media"
    echo ""
    echo "Or directly:"
    echo "  Web: http://${HOST}:${WEB_PORT}"
    echo "  API: http://${HOST}:${API_PORT}"
    echo ""
    echo "Logs: tail -f logs/web.log logs/api.log"
else
    echo -e "${RED}Some services are not running!${NC}"
    echo ""
    echo "To start all services, run: ./start-app.sh"
fi
