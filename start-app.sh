#!/bin/bash

# Media Builder App Startup Script
# Safely starts all services on their designated ports

set -e

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
PROJECT_DIR="/home/pixot/media-builder-v3"

echo -e "${GREEN}=== Media Builder App Startup ===${NC}"
echo "Web:       ${HOST}:${WEB_PORT}"
echo "API:       ${HOST}:${API_PORT}"
echo "WebSocket: ${HOST}:${WS_PORT}"
echo ""

cd "$PROJECT_DIR"

# Function to check if a port is in use
check_port() {
    local port=$1
    lsof -ti:$port 2>/dev/null
}

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pids=$(check_port $port)

    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}Port $port is in use by PIDs: $pids${NC}"
        echo -e "${YELLOW}Killing processes on port $port...${NC}"

        for pid in $pids; do
            # Check if it's a media-builder process
            local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "")
            if [[ "$cmd" == *"media-builder"* ]] || [[ "$cmd" == *"next dev"* ]] || [[ "$cmd" == *"nest start"* ]]; then
                echo "  Killing PID $pid: $cmd"
                kill -9 $pid 2>/dev/null || true
            else
                echo -e "${RED}  WARNING: PID $pid is NOT a media-builder process: $cmd${NC}"
                echo -e "${RED}  Skipping this process. Please manually check.${NC}"
            fi
        done

        sleep 1
    else
        echo -e "${GREEN}Port $port is available${NC}"
    fi
}

# Check and clean ports
echo -e "\n${GREEN}Step 1: Checking and cleaning ports...${NC}"
kill_port $WEB_PORT
kill_port $API_PORT
kill_port $WS_PORT

# Wait a moment for ports to be released
sleep 2

# Verify ports are now free
echo -e "\n${GREEN}Step 2: Verifying ports are free...${NC}"
for port in $WEB_PORT $API_PORT $WS_PORT; do
    if [ ! -z "$(check_port $port)" ]; then
        echo -e "${RED}ERROR: Port $port is still in use!${NC}"
        echo "Please manually check: lsof -i:$port"
        exit 1
    fi
done
echo -e "${GREEN}All ports are available!${NC}"

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"

# Start API (port 3001)
echo -e "\n${GREEN}Step 3: Starting API on port $API_PORT...${NC}"
cd "$PROJECT_DIR"
PORT=$API_PORT pnpm --filter @media-builder/api dev > "$PROJECT_DIR/logs/api.log" 2>&1 &
API_PID=$!
echo "API started with PID: $API_PID"

# Wait for API to be ready
echo "Waiting for API to start..."
sleep 5
if ! ps -p $API_PID > /dev/null; then
    echo -e "${RED}ERROR: API failed to start. Check logs/api.log${NC}"
    tail -20 "$PROJECT_DIR/logs/api.log"
    exit 1
fi
echo -e "${GREEN}API is running!${NC}"

# Start Web (port 3000)
echo -e "\n${GREEN}Step 4: Starting Web on port $WEB_PORT...${NC}"
cd "$PROJECT_DIR/apps/web"
PORT=$WEB_PORT pnpm dev --hostname $HOST > "$PROJECT_DIR/logs/web.log" 2>&1 &
WEB_PID=$!
echo "Web started with PID: $WEB_PID"

# Wait for Web to be ready
echo "Waiting for Web to start..."
sleep 8
if ! ps -p $WEB_PID > /dev/null; then
    echo -e "${RED}ERROR: Web failed to start. Check logs/web.log${NC}"
    tail -20 "$PROJECT_DIR/logs/web.log"
    exit 1
fi
echo -e "${GREEN}Web is running!${NC}"

# Start WebSocket (port 8081) - if you have a WS service
# Uncomment when WS service is ready
# echo -e "\n${GREEN}Step 5: Starting WebSocket on port $WS_PORT...${NC}"
# cd "$PROJECT_DIR"
# PORT=$WS_PORT pnpm --filter @media-builder/ws dev > "$PROJECT_DIR/logs/ws.log" 2>&1 &
# WS_PID=$!
# echo "WebSocket started with PID: $WS_PID"

echo -e "\n${GREEN}=== All services started successfully! ===${NC}"
echo ""
echo "Services:"
echo "  Web:       http://${HOST}:${WEB_PORT} (PID: $WEB_PID)"
echo "  API:       http://${HOST}:${API_PORT} (PID: $API_PID)"
# echo "  WebSocket: ws://${HOST}:${WS_PORT} (PID: $WS_PID)"
echo ""
echo "Logs are in: $PROJECT_DIR/logs/"
echo ""
echo "To stop all services, run: ./stop-app.sh"
echo "To view logs: tail -f logs/web.log logs/api.log"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
