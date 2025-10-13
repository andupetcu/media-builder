# System Requirements

## Required Software

### Node.js 22+

```bash
# Check version
node --version

# Install with nvm
nvm install 22
nvm use 22
```

### pnpm 9+

```bash
# Check version
pnpm --version

# Install
npm install -g pnpm@9
```

### Docker & Docker Compose

Required for Postgres, Redis, and Nginx services.

```bash
# Check versions
docker --version
docker-compose --version
```

### FFmpeg (Required for Phase 2+)

FFmpeg is required for video/audio processing, thumbnails, proxies, and waveforms.

#### macOS

```bash
# Install via Homebrew
brew install ffmpeg

# Verify installation
ffmpeg -version
ffprobe -version
```

#### Ubuntu/Debian

```bash
# Install
sudo apt-get update
sudo apt-get install ffmpeg

# Verify installation
ffmpeg -version
ffprobe -version
```

#### Windows

```bash
# Install via Chocolatey
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
```

#### Docker (Alternative)

If you don't want to install ffmpeg locally, the workers can run in Docker with ffmpeg pre-installed:

```dockerfile
# Add to apps/workers/Dockerfile
FROM node:22-alpine AS base
RUN apk add --no-cache ffmpeg
...
```

## Optional Tools

### Sharp Dependencies (Usually auto-installed)

Sharp is used for image processing. On some systems, you may need additional libraries:

#### Linux

```bash
# Ubuntu/Debian
sudo apt-get install libvips-dev

# Alpine
apk add vips-dev
```

### PostgreSQL Client (Optional)

For direct database access outside of Prisma Studio:

```bash
# macOS
brew install postgresql

# Ubuntu
sudo apt-get install postgresql-client
```

### Redis CLI (Optional)

For debugging Redis queues:

```bash
# macOS
brew install redis

# Ubuntu
sudo apt-get install redis-tools

# Then connect
redis-cli -h localhost -p 6379
```

## Verification Script

Run this to verify all dependencies:

```bash
#!/bin/bash
echo "Checking system requirements..."

# Node.js
if command -v node &> /dev/null; then
    echo "✓ Node.js $(node --version)"
else
    echo "✗ Node.js not found"
fi

# pnpm
if command -v pnpm &> /dev/null; then
    echo "✓ pnpm $(pnpm --version)"
else
    echo "✗ pnpm not found"
fi

# Docker
if command -v docker &> /dev/null; then
    echo "✓ Docker $(docker --version)"
else
    echo "✗ Docker not found"
fi

# FFmpeg
if command -v ffmpeg &> /dev/null; then
    echo "✓ ffmpeg $(ffmpeg -version | head -n1)"
else
    echo "✗ ffmpeg not found (required for Phase 2+)"
fi

# ffprobe
if command -v ffprobe &> /dev/null; then
    echo "✓ ffprobe $(ffprobe -version | head -n1)"
else
    echo "✗ ffprobe not found (required for Phase 2+)"
fi

echo ""
echo "System check complete!"
```

Save as `check-requirements.sh` and run:

```bash
chmod +x check-requirements.sh
./check-requirements.sh
```

## Disk Space Requirements

### Development

- **Node modules**: ~2GB
- **Docker images**: ~1GB
- **Build artifacts**: ~500MB
- **Asset storage**: Variable (depends on uploads)
- **Total minimum**: ~5GB free space recommended

### Production

- **Application**: ~500MB
- **Database**: Depends on usage (start with 10GB)
- **Asset storage**: Depends on usage (recommend 100GB+)
- **Logs**: 1-10GB (with rotation)

## Memory Requirements

### Development

- **Node.js processes**: 512MB - 1GB each
- **Docker services**:
  - Postgres: 256MB
  - Redis: 128MB
  - Nginx: 64MB
- **Workers**: 512MB - 2GB (for video processing)
- **Total minimum**: 4GB RAM

### Production

- **API Gateway**: 1-2GB per instance
- **Workers**: 2-4GB per instance (for video processing)
- **Database**: 2GB minimum
- **Redis**: 512MB minimum
- **Total minimum**: 8GB RAM

## Port Requirements

Make sure these ports are available:

- **3000**: Next.js web editor
- **3001**: NestJS API Gateway (internal)
- **5432**: PostgreSQL
- **6379**: Redis
- **8080**: Nginx (public API)
- **8081**: WebSocket server

Check for conflicts:

```bash
lsof -i :3000
lsof -i :3001
lsof -i :5432
lsof -i :6379
lsof -i :8080
lsof -i :8081
```

## Troubleshooting

### FFmpeg Not Found

If workers fail with "ffmpeg not found":

1. Install ffmpeg (see above)
2. Restart workers: `pnpm --filter workers dev`
3. Check PATH: `echo $PATH`

### Sharp Installation Issues

If sharp fails to install:

```bash
# Clear cache and reinstall
rm -rf node_modules
pnpm install --force
```

### Docker Services Won't Start

```bash
# Check Docker is running
docker info

# Check logs
docker-compose logs postgres
docker-compose logs redis

# Reset containers
docker-compose down -v
docker-compose up -d
```

### Port Already in Use

```bash
# Find process using port
lsof -i :PORT_NUMBER

# Kill process
kill -9 PID
```

## Performance Tuning

### For Video Processing

If processing large videos:

1. **Increase Node.js memory**:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

2. **Increase worker concurrency**:

```typescript
// apps/workers/src/main.ts
connection,
concurrency: 4, // Increase from 2
```

3. **Use SSD for /tmp**:
   FFmpeg writes temporary files, SSD significantly speeds up processing.

## Next Steps

Once all requirements are installed:

1. Copy `.env.example` to `.env`
2. Update environment variables
3. Run `pnpm install`
4. Start development: `pnpm dev`

See `README.md` for complete setup instructions.
