# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This is a **greenfield project** - the implementation plan exists but the codebase has not been built yet. See `media_builder_implementation_plan.md` for the complete specification.

## Project Vision

Media Builder is a Canva-class media builder for images, video, and audio with:
- **Frontend**: Next.js 14 + Polotno editor + TypeScript
- **Backend**: NestJS + Node 22 + Prisma (Postgres 16) + BullMQ (Redis 7)
- **Storage**: Local filesystem (no S3/Blob) at `/data/assets/`
- **AI**: Azure OpenAI (gpt-image-1, gpt-5-mini) + local tools (rembg, Whisper, RNNoise, Tesseract, aubio, RVM)

## Architecture Overview

The system will consist of 4 main services:

1. **API Gateway** (NestJS, port 8080): REST API for auth, RBAC, designs, assets, exports, bulk operations, approvals, Azure OpenAI proxy
2. **Realtime Service** (Yjs WebSocket, port 8081): Co-editing, presence, comments
3. **Workers** (NestJS + BullMQ): Background jobs for exports (Puppeteer), video rendering (FFmpeg), media processing
4. **Web Editor** (Next.js, port 3000): Polotno-based editor UI

## Key Architectural Decisions

### Storage Strategy
- **Local filesystem** instead of S3/Blob storage
- Assets stored at `/data/assets/` with public/private separation
- Nginx serves static files from `/data/assets/public/`
- SHA-256 hashing for deduplication
- Directory structure: `org/{orgId}/team/{teamId}/{type}/YYYY/MM/{hash16}_{slug}.ext`

### Data Model (Prisma)
Core entities: User, Org, Team, BrandKit, Asset, Design, Version, Comment, BulkJob, PublishPlan

Key design choices:
- `Design.doc` field stores Polotno JSON schema
- Enums: Role (OWNER/ADMIN/DESIGNER/MEMBER/VIEWER), AssetKind (IMAGE/VIDEO/AUDIO/FONT/TEMPLATE), DesignStatus (DRAFT/IN_REVIEW/APPROVED/ARCHIVED)
- Indexes on `(teamId, createdAt)` for Design and Asset
- GIN indexes on JSON fields (Asset.meta, Design.doc)

### Polotno Integration
- `Design.doc` ↔ Polotno store state
- Autosave every 20 seconds
- Manual "Save version" for snapshots
- Smart guides, snap-to-grid, Tidy Up alignment
- Brand enforcement: optional restrict colors/fonts, locked elements immutable

### AI Features
- **Azure OpenAI**: Text generation (gpt-5-mini), image generation/edit/inpaint/outpaint (gpt-image-1)
- **Local tools**: rembg (bg removal), Tesseract (OCR), Whisper (STT), RNNoise (denoise), aubio (beat detection), RVM (video bg removal, ≤10s clips)
- Per-team quotas with 429 backoff
- Store prompt hash, init asset hash, timestamp in meta for audit

### Video/Audio Pipeline
- Multi-track timeline with transitions (crossfade/slide/wipe)
- Browser plays 540p proxies during editing
- FFmpeg worker renders final MP4 (1080p)
- Beat sync using aubio for cut alignment
- Captions: Whisper → SRT → styled burn-in or soft subs

### Security Model
- JWT + refresh tokens
- RBAC guards on all endpoints
- Org/team scoping for multi-tenancy
- Input validation (class-validator, reject unknown props)
- Signed webhooks (HMAC + timestamp)
- Nginx signed URLs for semi-private assets
- Worker sandboxing: FFmpeg seccomp, max runtime limits

## Implementation Phases

The plan defines 12 phases over 14 weeks:

1. **Repo & Auth** (Week 1): Monorepo scaffold, Postgres/Redis/Nginx compose, JWT auth, RBAC
2. **Assets & Uploads** (Week 2): tus/multipart uploads, SHA-256 dedupe, ingest pipeline (probe/thumbs/waveforms/proxies)
3. **Editor MVP** (Week 3): Polotno integration, guides/snapping, autosave, versions
4. **Export** (Week 4): PNG/JPG/SVG/PDF with Puppeteer, DPI/bleed, multi-page, queue
5. **Realtime Collab** (Week 5): Yjs persistence, presence, comment pins, @mentions
6. **Brand Kit** (Week 6): CRUD brand colors/fonts/logos, enforcement rules
7. **AI** (Week 7-8): Azure OpenAI proxy routes, Magic panels, local tools integration
8. **Timeline & Video Export** (Week 9-10): Multi-track UI, FFmpeg filtergraphs
9. **Captions & Video BG Remove** (Week 11): STT → SRT, RVM worker (feature-flagged)
10. **Bulk Create** (Week 12): CSV/XLSX import, mapping/formatters, batch export with manifest
11. **Approvals & Footprints Hooks** (Week 13): Approval workflow, publish plans, signed webhooks
12. **Hardening & UX Polish** (Week 14): Shortcuts, a11y, performance, GC/backup scripts

## API Design Patterns

Error responses follow consistent format:
```json
{
  "code": "string",
  "message": "string",
  "details": "any?",
  "requestId": "string"
}
```

Key routes:
- Auth: `/auth/login`, `/auth/refresh`
- Designs: CRUD under `/teams/:teamId/designs`, `/designs/:id`
- Assets: `/assets/uploads/start|chunk|finish`, `/assets/:id`
- Exports: `/export/:designId`, `/jobs/:jobId`
- Bulk: `/bulk/:designId/preview|run`
- AI: `/ai/text/write`, `/ai/image/generate|edit|remove-bg`, `/ai/ocr|stt|audio/denoise|beat-detect`, `/ai/video/remove-bg`
- Footprints: `/integrations/footprints/generate|webhook`

## Environment Configuration

Critical environment variables:
- `DATABASE_URL`: Postgres connection string
- `REDIS_URL`: Redis connection string
- `ASSETS_ROOT`: Local filesystem path (default: `/data/assets`)
- `PUBLIC_BASE_URL`: Base URL for serving assets
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`: Azure OpenAI credentials
- `AZURE_OPENAI_DEPLOYMENT_TEXT`: Deployment name for gpt-5-mini
- `AZURE_OPENAI_DEPLOYMENT_IMAGE`: Deployment name for gpt-image-1
- `JWT_SECRET`, `JWT_EXPIRES`, `REFRESH_EXPIRES`: Auth configuration
- Feature flags: `FF_RVM`, `FF_VIDEO_4K`

## Performance Budgets

Targets defined in the plan:
- Editor JS bundle: < 1.8 MB gzipped
- Time to Interactive: < 2.5s on mid-laptop
- Canvas: 60fps with ≤150 elements/page
- Export P95: ≤120s for ≤10 pages @300 DPI
- Video export P95: ≤8 minutes for 60s @1080p

## Code Quality Standards

- TypeScript strict mode
- ESLint + Prettier + lefthook pre-commit
- DTO validation with class-validator
- Stable error codes with requestId in logs
- Feature flags in DB with in-process cache
- OpenTelemetry tracing for export.render, ai.image, bulk.run, yjs.persist

## Testing Strategy

- **Unit**: Jest for services/guards/mappers
- **API Contract**: supertest with stable error codes
- **E2E**: Playwright for editor flows, collab, bulk, export, AI (with mocked Azure)
- **Load**: k6 for exports/AI queues
- **Visual regression**: Storybook snapshots, export pixel compare

## Deployment Target

- **Development**: docker-compose (postgres, redis, nginx, api, ws, workers, ai-helpers)
- **Production**: Kubernetes with GPU node pool, RWMany PVC/NFS for `/data/assets`, HPA on API/WS, CronJobs for GC/backup
- **CI/CD**: GitHub Actions → lint/type/test → build images → prisma migrate → deploy (Helm/Argo)

## Footprints Integration

External system integration via:
- `POST /integrations/footprints/generate`: Generate assets from templates
- `POST /integrations/footprints/webhook`: Receive signed webhooks
- Deliver public URLs (optionally signed) for generated assets
