# Media Builder - Project Status

**Last Updated**: 2025-10-13

## 🎯 Overall Progress: Phase 3 (Backend Complete)

### Phase 1: ✅ COMPLETE
**Repo & Auth Infrastructure**
- Monorepo with Turbo, pnpm workspaces
- Docker Compose (Postgres 16, Redis 7, Nginx)
- Prisma schema with all entities
- JWT authentication with refresh tokens
- RBAC guards (global JWT guard)
- Request ID tracking and logging
- Health check endpoints
- Seed data with demo user
- Workers scaffold with BullMQ

### Phase 2: ✅ COMPLETE
**Assets & Uploads**
- Multipart file upload (2GB max)
- SHA-256 deduplication
- Storage service with organized structure
- Asset CRUD (list, get, update, delete)
- Media processing worker
- FFprobe metadata extraction
- Image thumbnails (sharp)
- Video thumbnails + 540p proxies (ffmpeg)
- Audio waveform generation
- Automatic MIME type detection

### Phase 3: 🚧 IN PROGRESS
**Polotno Editor (Backend Complete)**

**✅ Completed**:
- Design CRUD endpoints
- Version management (save, list, restore)
- Polotno API key configured
- Environment variables set
- Design document storage

**📖 Frontend Guide Provided**:
- Complete implementation guide in `PHASE3_IMPLEMENTATION_GUIDE.md`
- Code examples for all components
- API client setup
- Editor component with autosave
- Version management UI
- Asset picker integration

### Phases 4-12: 📋 PLANNED
See `master_media_builder_plan.md` for complete specification

## 🔑 Polotno Configuration

**API Key**: `WtWR19i4P14e_UK7eUUE`
**Domain**: `https://builder.footprints.media`
**Environment**: Configured in `.env.example` and `apps/web/.env.local.example`

## 📁 Project Structure

```
media_builder_v2/
├── apps/
│   ├── api/              # NestJS API (Ports: 3001 internal, 8080 via nginx)
│   ├── web/              # Next.js Editor (Port: 3000)
│   └── workers/          # BullMQ Workers (media processing)
├── packages/
│   ├── prisma/           # Database schema & client
│   └── shared/           # Shared types & DTOs
├── docker/
│   └── nginx/            # Reverse proxy config
├── data/
│   └── assets/           # Local file storage
├── PHASE1_SUMMARY.md     # Phase 1 review
├── PHASE2_SUMMARY.md     # Phase 2 implementation details
├── PHASE3_IMPLEMENTATION_GUIDE.md  # Frontend code examples
├── SYSTEM_REQUIREMENTS.md          # FFmpeg & system setup
└── README.md             # Main documentation
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install FFmpeg (required)
brew install ffmpeg  # macOS
# or
sudo apt-get install ffmpeg  # Ubuntu

# Install Node packages
pnpm install
```

### 2. Configure Environment

```bash
# Copy env files
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local

# Polotno credentials are already set:
# NEXT_PUBLIC_POLOTNO_KEY=WtWR19i4P14e_UK7eUUE
# NEXT_PUBLIC_APP_DOMAIN=https://builder.footprints.media
```

### 3. Start Infrastructure

```bash
# Start database & Redis
docker-compose up -d postgres redis nginx

# Setup database
pnpm --filter prisma generate
pnpm --filter prisma migrate dev
pnpm --filter prisma seed
```

### 4. Start Development

```bash
# Start all services
pnpm dev

# Or individually:
pnpm --filter api dev      # API on port 3001
pnpm --filter web dev      # Web on port 3000
pnpm --filter workers dev  # Background workers
```

### 5. Test the System

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@mediabuilder.com","password":"password123"}'

# Creates will return { accessToken, refreshToken }
# Use accessToken for authenticated requests
```

## 🔗 API Endpoints

**Base URL**: `http://localhost:8080/api` (via Nginx)
**Direct**: `http://localhost:3001` (API Gateway)
**Docs**: `http://localhost:3001/docs` (Swagger UI)

### Auth
- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Designs
- `GET /teams/:teamId/designs` - List designs
- `POST /teams/:teamId/designs` - Create design
- `GET /teams/:teamId/designs/:id` - Get design
- `PUT /teams/:teamId/designs/:id` - Update design
- `DELETE /teams/:teamId/designs/:id` - Delete design
- `POST /teams/:teamId/designs/:id/versions` - Save version
- `GET /teams/:teamId/designs/:id/versions` - List versions
- `POST /teams/:teamId/designs/:id/versions/:versionId/restore` - Restore version

### Assets
- `GET /teams/:teamId/assets` - List assets
- `POST /teams/:teamId/uploads` - Upload file
- `GET /teams/:teamId/assets/:id` - Get asset
- `PUT /teams/:teamId/assets/:id` - Update asset
- `DELETE /teams/:teamId/assets/:id` - Delete asset

## 🧪 Demo Credentials

**Email**: `demo@mediabuilder.com`
**Password**: `password123`

This creates:
- 1 Organization: "Demo Organization"
- 1 Team: "Marketing Team"
- 1 Sample Design: "Welcome Banner"

## 📊 Database Schema

**Core Entities**:
- `User` - Authentication & profile
- `Org` - Organizations
- `OrgMember` - Org membership with roles
- `Team` - Teams within orgs
- `TeamMember` - Team membership
- `Design` - Polotno designs with doc JSON
- `Version` - Design snapshots
- `Asset` - Uploaded media files
- `BrandKit` - Brand colors/fonts/logos
- `Comment` - Design comments
- `BulkJob` - Bulk operations (Phase 12)
- `PublishPlan` - Approval workflow (Phase 11)
- `FeatureFlag` - Feature toggles

**Key Indexes**:
- `(teamId, createdAt)` on designs and assets
- `(hash)` on assets for deduplication
- `(tags)` GIN index on assets
- `(meta)` GIN index on assets
- `(doc)` GIN index on designs

## 🛠️ Technology Stack

**Backend**:
- NestJS 10.4
- Node.js 22
- Prisma 5.20 (PostgreSQL 16)
- BullMQ (Redis 7)
- Passport JWT
- Multer (uploads)
- Sharp (images)
- FFmpeg (video/audio)

**Frontend**:
- Next.js 14.2 (App Router)
- React 18.3
- Polotno 4.0
- MobX 6.13
- Axios 1.7
- Tailwind CSS 3.4

**Infrastructure**:
- Docker & Docker Compose
- Nginx (reverse proxy)
- Turbo (monorepo build tool)
- pnpm 9 (package manager)

## 🎨 Asset Processing Pipeline

When a file is uploaded:

1. **Upload**: File temporarily stored in `/tmp`
2. **Hash**: SHA-256 computed for deduplication
3. **Dedupe Check**: If hash exists in team, reuse
4. **Store**: Move to `/data/assets/org/{orgId}/team/{teamId}/...`
5. **Queue**: Add to `media-processing` queue
6. **Worker Processes**:
   - **Images**: Extract metadata, generate thumbnail
   - **Videos**: Extract metadata, generate thumbnail, create 540p proxy
   - **Audio**: Extract metadata, generate waveform
7. **Update DB**: Save URLs and metadata
8. **Complete**: Asset ready for use

## 📝 Design Workflow

1. **Create Design**:
```bash
POST /teams/{teamId}/designs
{
  "name": "My Banner",
  "width": 1920,
  "height": 1080
}
```

2. **Edit in Polotno**: Frontend editor loads design, user makes changes

3. **Autosave**: Every 20 seconds, design doc saved automatically

4. **Manual Version**: User clicks "Save Version" to create snapshot

5. **Restore**: User can restore from any previous version

6. **Export**: (Phase 4) Export to PNG/PDF/etc

## 📖 Documentation

- **README.md** - Main project documentation
- **PHASE1_SUMMARY.md** - Auth & infrastructure review
- **PHASE2_SUMMARY.md** - Assets & uploads details
- **PHASE3_IMPLEMENTATION_GUIDE.md** - **⭐ Frontend code examples**
- **SYSTEM_REQUIREMENTS.md** - FFmpeg installation guide
- **CLAUDE.md** - Project instructions for AI assistance
- **master_media_builder_plan.md** - Complete 12-phase specification

## 🔍 Troubleshooting

### FFmpeg Not Found
```bash
# Install FFmpeg
brew install ffmpeg  # macOS
sudo apt-get install ffmpeg  # Ubuntu

# Verify
ffmpeg -version
ffprobe -version

# Restart workers
pnpm --filter workers dev
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### Port Already in Use
```bash
# Find process
lsof -i :3000
lsof -i :3001
lsof -i :8080

# Kill process
kill -9 <PID>
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Regenerate Prisma client
pnpm --filter prisma generate
```

## 🚀 Next Steps

### Immediate: Complete Phase 3 Frontend

Follow `PHASE3_IMPLEMENTATION_GUIDE.md` to implement:

1. Create API client (`apps/web/src/lib/api-client.ts`)
2. Create editor component (`apps/web/src/components/editor/PolotnoEditor.tsx`)
3. Create editor page (`apps/web/src/app/(dashboard)/editor/[id]/page.tsx`)
4. Test autosave functionality
5. Test version management
6. Integrate asset picker

### Then: Phase 4 - Export

- Puppeteer for PNG/JPG/PDF export
- DPI and bleed settings
- Multi-page export
- Export queue with BullMQ worker

### Future Phases

- Phase 5: Realtime collaboration with Yjs
- Phase 6: Brand Kit CRUD and enforcement
- Phase 7-8: Azure OpenAI integration
- Phase 9-10: Video timeline and export
- Phase 11: Captions & STT
- Phase 12: Bulk operations
- Phase 13: Approvals workflow
- Phase 14: Polish & hardening

## 💡 Tips

1. **Use Swagger**: http://localhost:3001/docs for API testing
2. **Check Logs**: All services log to console
3. **Prisma Studio**: `pnpm --filter prisma studio` for DB GUI
4. **Redis CLI**: `redis-cli` to inspect queues
5. **Asset Storage**: Check `/data/assets/` for uploaded files

## 📞 Support

- Check documentation files for detailed guides
- Review error logs for specific issues
- Verify system requirements are met
- Ensure all services are running

## ✅ Production Readiness

**Current Status**: Development/MVP

**Before Production**:
- [ ] Add comprehensive tests (Phase 14)
- [ ] Set up CI/CD pipeline
- [ ] Configure production environment variables
- [ ] Set up monitoring and logging
- [ ] Implement rate limiting
- [ ] Add HTTPS/SSL
- [ ] Configure CDN for assets
- [ ] Set up backup strategy
- [ ] Security audit
- [ ] Performance optimization

**Deployment Target**: Kubernetes with GPU node pool for video processing

---

**Status**: ✅ Backend infrastructure complete through Phase 3
**Next**: Implement Polotno frontend using provided guide
**Timeline**: Phase 3 frontend → Phase 4 export → Phase 5 collab
