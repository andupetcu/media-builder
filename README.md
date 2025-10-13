# Media Builder

A Canva-class media builder for images, video, and audio with collaborative editing, AI features, and export capabilities.

## Architecture

- **Frontend**: Next.js 14 + Polotno editor + TypeScript
- **Backend**: NestJS + Node 22 + Prisma (Postgres 16) + BullMQ (Redis 7)
- **Storage**: Local filesystem at `/data/assets/`
- **AI**: Azure OpenAI + local tools (rembg, Whisper, RNNoise, Tesseract, aubio, RVM)

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose
- **FFmpeg & ffprobe** (required for Phase 2+)

**📖 System Requirements**: See `SYSTEM_REQUIREMENTS.md` for detailed installation instructions.

Quick install FFmpeg:

```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg
```

### Installation

1. Clone the repository and navigate to the project directory:

```bash
cd media_builder_v2
```

2. Install dependencies:

```bash
pnpm install
```

3. Copy environment variables:

```bash
cp .env.example .env
```

4. Update `.env` with your configuration (especially Azure OpenAI credentials when available)

5. Start the development environment:

```bash
# Start infrastructure (Postgres, Redis, Nginx)
docker-compose up -d postgres redis nginx

# Generate Prisma client
pnpm --filter prisma generate

# Run database migrations
pnpm --filter prisma migrate

# Seed the database (optional)
pnpm --filter prisma seed

# Start development servers
pnpm dev
```

This will start:

- API Gateway on http://localhost:3001
- Web Editor on http://localhost:3000
- Nginx reverse proxy on http://localhost:8080

Or start services individually:

```bash
# API only
pnpm --filter api dev

# Web only
pnpm --filter web dev

# Workers only
pnpm --filter workers dev

# WebSocket server
pnpm --filter api dev:ws
```

### Project Structure

```
media_builder_v2/
├── apps/
│   ├── api/          # NestJS API Gateway
│   ├── web/          # Next.js Web Editor
│   └── workers/      # Background workers (to be implemented)
├── packages/
│   ├── prisma/       # Database schema and client
│   └── shared/       # Shared types, DTOs, utilities
├── docker/
│   └── nginx/        # Nginx configuration
└── data/
    └── assets/       # Local asset storage
```

## Phase 1 Complete ✓

Phase 1 (Repo & Auth) is now complete with:

- [x] Monorepo structure with Turbo
- [x] Docker Compose setup (Postgres, Redis, Nginx)
- [x] Prisma schema with all core entities
- [x] NestJS API Gateway with modules
- [x] JWT authentication (login, register, refresh)
- [x] RBAC guards and decorators (global JWT guard with @Public decorator)
- [x] Global exception filter with consistent error formatting
- [x] Request ID middleware and logging interceptor
- [x] Health check endpoint
- [x] Seed data script with demo user/org/team
- [x] Workers scaffold with BullMQ
- [x] WebSocket server scaffold (ws.main.ts)
- [x] Next.js web editor scaffold

## Phase 2 Complete ✓

Phase 2 (Assets & Uploads) is now complete with:

- [x] Multipart file upload with multer (up to 2GB)
- [x] SHA-256 hashing for deduplication
- [x] Storage service with directory structure: `org/{orgId}/team/{teamId}/{type}/YYYY/MM/{hash16}_{slug}.ext`
- [x] Asset CRUD endpoints (list, get, update, delete)
- [x] Media processing worker with BullMQ
- [x] ffprobe service for video/audio metadata extraction
- [x] Thumbnail generation for images (sharp) and videos (ffmpeg)
- [x] Waveform generation for audio files
- [x] 540p proxy generation for video editing
- [x] Automatic asset kind detection from MIME type
- [x] Tag support for asset organization

## API Documentation

Once the API is running, visit:

- Swagger UI: http://localhost:3001/docs
- Health check: http://localhost:3001/health

### Demo Credentials

If you ran the seed script:

- Email: `demo@mediabuilder.com`
- Password: `password123`

### Key API Endpoints

All endpoints (except auth and health) require JWT Bearer token authentication:

- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout
- `GET /health` - Health check
- `GET /users/me` - Get current user
- `GET /orgs` - List user's organizations
- `GET /orgs/:orgId/teams` - List org teams
- `GET /teams/:teamId/designs` - List team designs
- `GET /teams/:teamId/assets` - List team assets (supports ?kind= filter)
- `GET /teams/:teamId/assets/:id` - Get asset details
- `PUT /teams/:teamId/assets/:id` - Update asset metadata
- `DELETE /teams/:teamId/assets/:id` - Delete asset
- `POST /teams/:teamId/uploads` - Upload asset file (multipart/form-data)

## Development

### Running Tests

```bash
pnpm test
```

### Linting & Formatting

```bash
pnpm lint
pnpm format
```

### Database Migrations

```bash
# Create a new migration
pnpm --filter prisma migrate

# Apply migrations
pnpm --filter prisma migrate:deploy

# Open Prisma Studio
pnpm --filter prisma studio
```

## Phase 3: In Progress 🚧

Phase 3 (Polotno Editor) - **Backend Complete, Frontend Guide Provided**:

**✅ Completed (Backend)**:

- [x] Design CRUD endpoints (create, read, update, delete)
- [x] Version management (save, list, restore)
- [x] Polotno credentials configured
- [x] Design document storage (Polotno JSON)
- [x] Status management (DRAFT, IN_REVIEW, APPROVED, ARCHIVED)

**📖 Frontend Implementation Guide**:

- [ ] Polotno editor component integration
- [ ] Design autosave (every 20 seconds)
- [ ] Manual version snapshots UI
- [ ] Smart guides and snap-to-grid (Polotno built-in)
- [ ] Asset picker with team uploads
- [ ] Toolbar customization

**See `PHASE3_IMPLEMENTATION_GUIDE.md` for complete frontend code examples and setup instructions.**

## Next Steps (Phase 4)

Phase 4 will implement:

- Export to PNG/JPG/SVG/PDF with Puppeteer
- DPI and bleed settings
- Multi-page export
- Export queue with BullMQ

## File Uploads (Phase 2)

Upload and process media assets with automatic thumbnail/proxy generation:

### Upload an Asset

```bash
curl -X POST http://localhost:3001/teams/{teamId}/uploads \
  -H "Authorization: Bearer {token}" \
  -F "file=@image.jpg" \
  -F "tags=marketing,banner"
```

### What Happens After Upload

1. File temporarily stored in `/tmp`
2. SHA-256 hash computed for deduplication
3. File moved to `/data/assets/` with organized structure
4. Asset queued for background processing
5. Worker generates thumbnail, metadata, proxies
6. Asset ready for use in editor

### Supported Formats

- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Videos**: MP4, WebM, MOV, AVI (auto-generates 540p proxy)
- **Audio**: MP3, WAV, OGG, M4A (auto-generates waveform)
- **Fonts**: TTF, OTF, WOFF, WOFF2

See `PHASE2_SUMMARY.md` for complete upload documentation.

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:

- `DATABASE_URL`: Postgres connection string
- `REDIS_URL`: Redis connection string
- `ASSETS_ROOT`: Local storage path (default: `/data/assets`)
- `PUBLIC_BASE_URL`: Base URL for serving assets
- `JWT_SECRET`: Secret for JWT signing
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI endpoint (when available)
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API key (when available)

## Contributing

Please follow the existing code style and run linting before committing.

## License

Proprietary
