---
docId: media-builder-master-plan
title: Media Builder — Single Master Implementation Plan (Polotno + Node 22 + Postgres + Azure OpenAI + Local Storage)
phase: Foundation
status: Approved
owners: [andrei, core-eng]
lastUpdated: 2025-10-12
dependsOn: []
references: []
---

# Media Builder — Single Master Implementation Plan
*A unified, implementation‑ready plan for an AI coding assistant.*  
**Stack anchors:** Next.js (React + Polotno), NestJS (Node 22, TypeScript), Postgres 16, Redis 7, local filesystem storage, Yjs realtime, FFmpeg, Puppeteer, Azure OpenAI (gpt‑5‑mini for text; gpt‑image‑1 for images). This master plan consolidates and supersedes prior versions and deltas. It preserves UX goals of a Canva‑class editor (images, video, audio) and keeps storage local (no S3/Blob). fileciteturn0file0 fileciteturn0file1 fileciteturn0file3

---

## 1) Goal & Non‑Negotiables
- **Goal:** Ship a cloud‑agnostic media builder for images/video/audio with smooth UX, enterprise‑ready APIs, and bulk automation. fileciteturn0file0
- **Must use:** **Postgres** (source of truth), **Azure OpenAI** for AI, **local filesystem** for assets. fileciteturn0file1
- **Editor:** **Polotno** as core canvas; Next.js 14 frontend. fileciteturn0file0
- **Realtime:** Yjs (collab, presence, comments). fileciteturn0file0
- **Media:** FFmpeg (video render), Puppeteer (image/PDF export). fileciteturn0file0

---

## 2) High‑Level Architecture

### Clients
- **Web Editor** (Next.js, TS, Polotno): full design surface, AI panels, bulk mapper, approvals. fileciteturn0file0
- **Lightweight Presenter/Q&A** (optional): slides/live reactions. fileciteturn0file0

### Backend
- **API Gateway** (NestJS): auth, RBAC, designs, assets, exports, bulk, approvals, publish hooks, Azure OpenAI proxy, quotas. fileciteturn0file0
- **Realtime** (Yjs WS): co‑editing, presence, comments. fileciteturn0file0
- **Workers** (BullMQ): exports (Puppeteer), video renders (FFmpeg), probes, thumbnails, waveforms, GC. fileciteturn0file0
- **AI Helpers (local):** rembg (bg remove), Whisper (STT), RNNoise (denoise), Tesseract (OCR), aubio (beat), RVM (short video bg remove). fileciteturn0file0

### State
- **Postgres 16**: users/teams/brand kits/designs/versions/assets/jobs/quotas. fileciteturn0file0
- **Redis 7**: queues, rate‑limits, sessions. fileciteturn0file0
- **Local FS**: persistent volume `/data/assets` (public + private trees) behind Nginx static. fileciteturn0file0 fileciteturn0file1

---

## 3) Environment & Configuration (definitive)

```bash
# Core
NODE_ENV=production
PORT_API=8090
PORT_WS=8091
PORT_WEB=3555

# Database/Cache
DATABASE_URL=postgres://user:pass@host:5432/media          # Postgres 16
REDIS_URL=redis://host:6379/0

# Auth
JWT_SECRET=<secret>
JWT_EXPIRES=15m
REFRESH_EXPIRES=30d

# Filesystem (no S3/Blob)
ASSETS_ROOT=/data/assets
PUBLIC_BASE_URL=https://media.example.com   # served by Nginx (read-only)

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_API_KEY=<secret>
AZURE_OPENAI_API_VERSION=2024-XX-XX
AZURE_OPENAI_DEPLOYMENT_TEXT=gpt-5-mini
AZURE_OPENAI_DEPLOYMENT_IMAGE=gpt-image-1

# Export/Queues
EXPORT_CONCURRENCY=2
EXPORT_TIMEOUT_SEC=900
QUEUE_CONCURRENCY_DEFAULT=4

# Feature Flags
FF_RVM=true
FF_VIDEO_4K=false
```

---

## 4) Local Storage Layout & Nginx

```
/data/assets/
  public/
    org/{orgId}/team/{teamId}/
      image/YYYY/MM/{hash16}_{slug}.png|jpg|webp
      video/YYYY/MM/{hash16}_{slug}.mp4|webm
      audio/YYYY/MM/{hash16}_{slug}.mp3|wav
      doc/{designId}/exports/{file}
  private/
    uploads/tmp/{uploadId}/chunks/*
    thumbs/{assetId}_512.webp
    waveforms/{assetId}.json|.png
    proxies/{assetId}/proxy_540p.mp4
```
- Client SHA‑256 for dedupe; probe (ffprobe/sharp), generate thumbs/waveforms/proxies; move to `public/` when publishable. Serve `public/` via Nginx; use optional short‑lived signed URLs for semi‑private assets. fileciteturn0file1 fileciteturn0file0

---

## 5) Data Model (Prisma, consolidated)

Key enums: `Role`, `AssetKind`, `DesignStatus`, `JobState`. Core entities: `User`, `Org`, `Team`, `BrandKit`, `Asset` (with `path` for local file), `Design` (stores Polotno doc), `Version`, `Comment`, `BulkJob`, `PublishPlan`. Include indexes on `(teamId, createdAt)` and GIN on selected JSON keys. fileciteturn0file0 fileciteturn0file3

**Notes:** Replace `s3Key` with `path` to reflect local storage; keep meta JSON (width/height/duration/codec/hash/tags). fileciteturn0file0 fileciteturn0file3

---

## 6) API (finalized surface)

Auth & Profile
- `POST /auth/login`, `POST /auth/refresh`, `GET /me`. fileciteturn0file0

Designs & Comments
- `GET /teams/:teamId/designs`, `POST /teams/:teamId/designs`, `GET/PUT /designs/:id`  
- `POST /designs/:id/version`, `POST /designs/:id/approve`  
- `POST /designs/:id/comments`, `PUT /comments/:id` (resolve). fileciteturn0file0

Uploads & Assets (local FS; tus or multipart)
- `POST /assets/uploads/start {filename,size,sha256,kind} -> {uploadId}`  
- `PUT /assets/uploads/:id/chunk` (tus/multipart)  
- `POST /assets/uploads/:id/finish -> {assetId, publicUrl, meta}`  
- `GET /assets/:id`. fileciteturn0file0 fileciteturn0file1

Exports & Jobs
- `POST /export/:designId {format,pages,quality,videoTimeline?} -> {jobId}`  
- `GET /jobs/:jobId -> {state,url?,progress?,errors?}`. fileciteturn0file0

Bulk Create
- `POST /bulk/:designId/preview {mapping,data}`  
- `POST /bulk/:designId/run {mapping,dataRef} -> {jobId}`. fileciteturn0file0

AI (Azure + local tools)
- `POST /ai/text/write` (gpt‑5‑mini via Azure)  
- `POST /ai/image/generate|edit` (gpt‑image‑1 generate/edit/inpaint/outpaint)  
- `POST /ai/image/remove-bg` (rembg), `POST /ai/ocr` (Tesseract), `POST /ai/stt` (Whisper), `POST /ai/audio/denoise` (RNNoise), `POST /ai/audio/beat-detect` (aubio), `POST /ai/video/remove-bg` (RVM). fileciteturn0file0 fileciteturn0file1

Footprints Hooks
- `POST /integrations/footprints/generate` & `POST /integrations/footprints/webhook` (HMAC, path‑based URLs). fileciteturn0file0

**Error model (stable):** `{ code, message, details?, requestId }`. fileciteturn0file0 fileciteturn0file2

---

## 7) Editor (Next.js + Polotno)

- Layout: Left (Assets/Brand/Templates/Magic), Center (Canvas with pages/zoom/rulers/guides/grids/bleed), Right (Properties). Autosave 20s; manual “Save version”. Smart alignment, tidy spacing. Curved text, effects, masks/frames, filters, transparency. Comments with pins and @mentions. Brand enforcement: restrict colors/fonts, locked elements. fileciteturn0file0 fileciteturn0file2

---

## 8) Video/Audio Timeline

- Multi‑track timeline (drag/trim/split/ripple delete), transitions (crossfade/slide/wipe), overlays, beat‑sync. Browser preview via 540p proxy; export via FFmpeg from Timeline JSON → MP4 (1080p), thumbnails & poster. Captions: Whisper → SRT; styled burn‑in or soft subs. fileciteturn0file0 fileciteturn0file2

---

## 9) AI Features (Final)

**Text (Magic Write):** Azure chat/completions (gpt‑5‑mini); brand voice system prompts; tone/length presets; per‑team quotas. fileciteturn0file0 fileciteturn0file1

**Images (Magic Media):** gpt‑image‑1 generate (1024/2048, 1–4 variants), edit/inpaint/outpaint; store prompt hash, init asset hash, and parameters for approximate reproducibility (non‑deterministic). fileciteturn0file1

**Local Tools:** rembg (bg remove), Tesseract (OCR), Whisper (STT), RNNoise (denoise), RVM (short clips). fileciteturn0file0

**Safety & Quotas:** Per‑team daily caps; Azure content filter handling; redact prompts in logs; 429 backoff. fileciteturn0file0 fileciteturn0file1

---

## 10) Bulk Create & Data Integration

- CSV/XLSX import, preview grid; map fields to elements (text/image/visibility/number); formatters (price/date/upper/truncate/regex); conditionals (“show if”). Preview per row; server batch export to zip + manifest `{row, outputs:[{url,type,page}], warnings:[]}`; overflow policy (auto‑shrink → ellipsis + warnings). fileciteturn0file0 fileciteturn0file2

---

## 11) Security

- JWT + refresh; RBAC; org/team scoping; DTO validation; MIME sniff; optional ClamAV; rate‑limits; AI quotas; signed webhooks (HMAC + timestamp); Nginx signed URLs for semi‑private assets; worker sandboxing (ffmpeg seccomp). fileciteturn0file0 fileciteturn0file2

---

## 12) Observability & Performance Budgets

- **Tracing:** OpenTelemetry (spans: export.render, ai.image, bulk.run, yjs.persist).  
- **Metrics/Logs:** Prometheus + Grafana; Loki/ELK.  
- **Editor budgets:** initial JS < 1.8 MB gz; TTI < 2.5s; canvas 60fps at ≤150 elems/page.  
- **Export P95:** ≤120s (≤10 pages @300 DPI); Video 60s@1080p P95 ≤8m. fileciteturn0file0

---

## 13) DevOps & Deployment

- **Compose:** postgres, redis, nginx, api, ws, workers, ai‑helpers.  
- **K8s (optional):** GPU pool for AI; RWMany PVC / NFS for `/data/assets`; HPA; CronJobs (GC/backup).  
- **CI/CD:** GitHub Actions → lint/type/test → build images → prisma migrate → deploy.  
- **Backups:** nightly `pg_dump`; rsync snapshots of `/data/assets` → NAS; restore runbook. fileciteturn0file0 fileciteturn0file1

---

## 14) Engineering Guardrails (must‑follow)

- TS strict everywhere; ESLint + Prettier; Lefthook pre‑commit. Stable error codes.  
- DTO validation; reject unknown props. Feature flags in DB + in‑proc cache.  
- Request `requestId` propagation end‑to‑end; consistent error envelope. fileciteturn0file2

---

## 15) Implementation Phases (single canonical schedule)

**Phase 1 — Repo & Auth (Week 1)**  
Monorepo scaffold (apps: web, api; services: ws, workers); Postgres/Redis/Nginx/files volume; JWT auth, Users/Teams/Org, RBAC.  
*Agent prompt:* “Scaffold NestJS+Prisma with User/Org/Team, JWT, role guards, tests, docker‑compose.” fileciteturn0file0

**Phase 2 — Assets & Uploads (Week 2)**  
tus/multipart uploads → `/data/assets/private/uploads/tmp`; ingest: probe meta, dedupe, move to public; thumbs/waveforms/proxies jobs.  
*Agent prompt:* “Implement local uploads (no S3), SHA‑256 dedupe, ffprobe/sharp, thumb/waveform/proxy generation.” fileciteturn0file0 fileciteturn0file1

**Phase 3 — Editor MVP (Week 3)**  
Polotno integration; pages/elements; guides/snap/tidy; autosave; version snapshot.  
*Agent prompt:* “Wire Polotno to API; implement guides/snapping/tidy; autosave + versions.” fileciteturn0file0

**Phase 4 — Export (Week 4)**  
PNG/JPG/SVG/PDF with DPI/bleed; multi‑page; queue with progress; exports under `public/doc/{designId}/exports`.  
*Agent prompt:* “Add /export worker (Puppeteer/pdfkit), quality params, job polling.” fileciteturn0file0

**Phase 5 — Realtime Collab (Week 5)**  
Yjs WS; presence; comment pins; @mentions (email); periodic persistence.  
*Agent prompt:* “Attach Yjs to design store; comment API & UI; periodic persistence.” fileciteturn0file0

**Phase 6 — Brand Kit (Week 6)**  
Brand colors/fonts/logos; locked elements; optional restrictions; enforcement on save/export with warnings.  
*Agent prompt:* “CRUD BrandKit; expose in editor; enforce color/font rules.” fileciteturn0file0

**Phase 7 — AI (Azure + Local) (Week 7–8)**  
Magic Write (gpt‑5‑mini); Magic Media: generate/edit/inpaint/outpaint (gpt‑image‑1); rembg/Tesseract/Whisper/RNNoise; quotas & errors.  
*Agent prompt:* “Implement Azure OpenAI proxy routes, Magic panels; wire rembg/ocr/stt/denoise.” fileciteturn0file1 fileciteturn0file0

**Phase 8 — Timeline & Video Export (Week 9–10)**  
Multi‑track UI; transitions; beat‑sync; overlays; FFmpeg renderer; proxies/posters.  
*Agent prompt:* “Timeline model + React UI; FFmpeg filtergraphs; job with progress.” fileciteturn0file0 fileciteturn0file2

**Phase 9 — Captions & Video BG Remove (Week 11)**  
SRT import/export; styled captions; RVM for short clips (flag‑gated).  
*Agent prompt:* “STT → SRT pipeline; captions overlay; optional RVM worker.” fileciteturn0file0

**Phase 10 — Bulk Create (Week 12)**  
CSV/XLSX import; mapping/formatters; row preview; batch export zip + manifest; overflow handling.  
*Agent prompt:* “Server batch pipeline with retries; manifest generation.” fileciteturn0file0 fileciteturn0file2

**Phase 11 — Approvals & Footprints Hooks (Week 13)**  
Approvals with re‑approval on change; publish plans; signed webhooks + sample client.  
*Agent prompt:* “Implement approvals; /integrations/footprints/generate & webhook (HMAC).” fileciteturn0file0

**Phase 12 — Hardening & UX Polish (Week 14)**  
Shortcuts; onboarding; accessibility; perf passes; GC/backup scripts.  
*Agent prompt:* “Finalize UX micro‑interactions, a11y checker, quotas UI, GC/backup cron.” fileciteturn0file0

---

## 16) Testing Strategy (end‑to‑end)

- **Unit:** services/guards/mappers (Jest).  
- **API contract:** supertest; stable error codes.  
- **E2E:** Playwright (editor flows, collab, bulk, export, AI panels with Azure mocks).  
- **Load:** k6 for exports/AI queues.  
- **Visual regression:** Storybook snapshots; export pixel compare. fileciteturn0file0

---

## 17) Runbooks

**Backup/Restore** — nightly `pg_dump` + rsync snapshots `/data/assets` → NAS; restore DB + FS, then rebuild thumbs/proxies. fileciteturn0file0 fileciteturn0file1

**JWT Rotation** — dual‑sign 24h, cutover, invalidate old refresh; propagate via config. fileciteturn0file0

**Low Disk** — GC: temp uploads >48h, failed exports >24h, proxies >7d; watermark 80% → purge oldest proxies; admin alert. fileciteturn0file0

---

## 18) MVP Acceptance

- Create/edit designs with Polotno; collab; comments; brand rules.  
- Export PNG, PDF 300 DPI with bleed; MP4 (1080p) timeline.  
- AI: bg‑remove, inpaint, text‑to‑image (gpt‑image‑1), Magic Write (gpt‑5‑mini), OCR, STT.  
- Bulk: 300 rows; zip with manifest; overflow handled.  
- Approvals; webhook delivering public URLs to Footprints. fileciteturn0file0

---

## 19) De‑risking Notes

- gpt‑image‑1 is non‑deterministic; store full inputs (prompt, mask, init asset hashes) to approximate reproducibility; offer “Regenerate similar.” fileciteturn0file1
- One media node or RWMany storage for workers to share `/data/assets`. fileciteturn0file1
- Clear quota/error UX on Azure 429/content filters; local tools provide instant wins (rembg/STT). fileciteturn0file1

---

## 20) Developer Tactics (for the AI coding assistant)
- Use **strict TypeScript**, **stable error envelope**, and **requestId** logging.  
- Generate code in **iterative PR‑sized chunks** per phase with acceptance checks.  
- Prefer **pure functions** for mappers; keep I/O at edges (controllers/services/workers).  
- Adhere to **performance budgets** and **feature flags** during development. fileciteturn0file2 fileciteturn0file0

> This document is the **single source of truth**. All subsequent tickets and prompts should reference section and phase IDs from here.
