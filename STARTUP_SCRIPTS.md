# Media Builder Startup Scripts

This directory contains convenient scripts to manage the Media Builder application services.

## Scripts

### `./start-app.sh`
Starts all Media Builder services safely:
- Checks if ports 3000, 3001, and 8081 are available
- Kills any existing media-builder processes on those ports (safely)
- Starts the Web frontend on port 3000 (10.0.0.60:3000)
- Starts the API backend on port 3001 (10.0.0.60:3001)
- Creates logs in the `logs/` directory

**Usage:**
```bash
./start-app.sh
```

**Output:**
- Web logs: `logs/web.log`
- API logs: `logs/api.log`

### `./stop-app.sh`
Safely stops all Media Builder services:
- Gracefully kills processes on ports 3000, 3001, and 8081
- Only kills media-builder related processes
- Uses SIGTERM first, then SIGKILL if needed

**Usage:**
```bash
./stop-app.sh
```

### `./status-app.sh`
Shows the current status of all services:
- Displays which services are running
- Shows PIDs and uptime
- Provides direct URLs to access services

**Usage:**
```bash
./status-app.sh
```

**Example output:**
```
=== Media Builder App Status ===

✓ Web Frontend (port 3000)
    PID: 3923334 | Uptime: 00:51
    Command: next-server (v14.2.0)

✓ API Backend (port 3001)
    PID: 3923389 | Uptime: 00:50
    Command: node --enable-source-maps /home/pixot/media-builder-v3/apps/api/dist/main

=== Summary ===
All core services are running!

Access the app at:
  https://builder.footprints.media

Or directly:
  Web: http://10.0.0.60:3000
  API: http://10.0.0.60:3001
```

## Service Ports

| Service | Port | Host | Description |
|---------|------|------|-------------|
| Web Frontend | 3000 | 10.0.0.60 | Next.js application |
| API Backend | 3001 | 10.0.0.60 | NestJS REST API |
| WebSocket | 8081 | 10.0.0.60 | Real-time collaboration (not yet implemented) |

## Common Tasks

### Start the app
```bash
./start-app.sh
```

### Check if everything is running
```bash
./status-app.sh
```

### View logs in real-time
```bash
tail -f logs/web.log logs/api.log
```

### Stop the app
```bash
./stop-app.sh
```

### Restart the app
```bash
./stop-app.sh && ./start-app.sh
```

## Troubleshooting

### Port already in use by another app
The scripts will show a warning if a port is in use by a non-media-builder process. You'll need to manually check and stop that process:

```bash
# Check what's using port 3000
ss -tlnp | grep :3000

# Or use lsof
lsof -i:3000
```

### Service won't start
Check the logs for errors:
```bash
# Web logs
cat logs/web.log

# API logs
cat logs/api.log
```

### Permission denied when running scripts
Make sure scripts are executable:
```bash
chmod +x start-app.sh stop-app.sh status-app.sh
```

## Production Deployment

For production deployment, consider using:
- PM2 for process management
- Systemd services
- Docker containers
- Kubernetes (see DEPLOYMENT.md)

These scripts are intended for development use on the staging server.
