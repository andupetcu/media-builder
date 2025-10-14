#!/bin/bash

# Media Builder App Stop Script
# Safely stops all media-builder services

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
WEB_PORT=3000
API_PORT=3001
WS_PORT=8081

echo -e "${GREEN}=== Stopping Media Builder App ===${NC}"

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)

    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}Stopping services on port $port...${NC}"

        for pid in $pids; do
            # Check if it's a media-builder process
            local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "")
            if [[ "$cmd" == *"media-builder"* ]] || [[ "$cmd" == *"next dev"* ]] || [[ "$cmd" == *"nest start"* ]]; then
                echo "  Killing PID $pid"
                kill -15 $pid 2>/dev/null || true
            else
                echo -e "${RED}  WARNING: PID $pid is NOT a media-builder process${NC}"
                echo -e "${RED}  Skipping: $cmd${NC}"
            fi
        done

        # Wait a moment
        sleep 2

        # Force kill if still running
        pids=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pids" ]; then
            echo -e "${YELLOW}Force killing remaining processes on port $port...${NC}"
            for pid in $pids; do
                local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "")
                if [[ "$cmd" == *"media-builder"* ]] || [[ "$cmd" == *"next dev"* ]] || [[ "$cmd" == *"nest start"* ]]; then
                    kill -9 $pid 2>/dev/null || true
                fi
            done
        fi

        echo -e "${GREEN}Port $port is now free${NC}"
    else
        echo -e "${GREEN}No process running on port $port${NC}"
    fi
}

# Stop all services
kill_port $WEB_PORT
kill_port $API_PORT
kill_port $WS_PORT

echo -e "\n${GREEN}=== All services stopped ===${NC}"
