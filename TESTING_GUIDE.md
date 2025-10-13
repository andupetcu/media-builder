# Comprehensive Testing Guide

This guide will test every component of the Media Builder system to ensure it's "Fully Ready" for production use.

## Prerequisites Check

Before starting, verify you have:

- [ ] Node.js 22+ installed
- [ ] pnpm 9+ installed
- [ ] Docker & Docker Compose installed
- [ ] FFmpeg & ffprobe installed
- [ ] At least 5GB free disk space

Run this check:

```bash
node --version    # Should be v22.x.x
pnpm --version    # Should be 9.x.x
docker --version
ffmpeg -version
```

---

## Test 1: Clean Installation

Start from a clean state:

```bash
# Navigate to project
cd /Users/andrei/Downloads/Projects/media_builder_v2

# Clean everything
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm -rf .turbo
rm -rf apps/*/.next
rm -rf apps/*/dist

# Install dependencies
pnpm install

# Expected: No errors, all packages installed
# Look for: "Progress: resolved X, reused Y, downloaded Z"
```

**✅ Success criteria**:

- No installation errors
- All workspaces linked correctly
- `node_modules` folders created

**❌ If fails**: Check error messages, verify pnpm version

---

## Test 2: Infrastructure Services

Start Docker services:

```bash
# Clean any existing containers
docker-compose down -v

# Start services
docker-compose up -d postgres redis nginx

# Wait 10 seconds for services to be ready
sleep 10

# Check status
docker-compose ps

# Expected output:
# NAME                      STATUS
# mediabuilder-postgres     Up (healthy)
# mediabuilder-redis        Up (healthy)
# mediabuilder-nginx        Up (healthy)
```

**Test Postgres connection**:

```bash
docker exec mediabuilder-postgres pg_isready -U mediabuilder
# Expected: /var/run/postgresql:5432 - accepting connections
```

**Test Redis connection**:

```bash
docker exec mediabuilder-redis redis-cli ping
# Expected: PONG
```

**✅ Success criteria**:

- All containers running
- Health checks passing
- Postgres accepting connections
- Redis responding to ping

**❌ If fails**:

- Check Docker is running: `docker info`
- Check logs: `docker-compose logs`
- Check ports not in use: `lsof -i :5432`, `lsof -i :6379`

---

## Test 3: Database Setup

Generate Prisma client and run migrations:

```bash
# Generate Prisma client
pnpm --filter prisma generate

# Expected: Generated Prisma Client

# Run migrations
pnpm --filter prisma migrate dev --name init

# Expected: Migration successful, tables created

# Seed database
pnpm --filter prisma seed

# Expected output:
# Starting seed...
# Created user: demo@mediabuilder.com
# Created organization: Demo Organization
# Created team: Marketing Team
# Created design: Welcome Banner
# Seed completed successfully!
```

**Verify database**:

```bash
# Open Prisma Studio (in a new terminal)
pnpm --filter prisma studio

# Opens http://localhost:5555
# Check: User, Org, Team, Design tables have data
```

**✅ Success criteria**:

- Prisma client generated
- All migrations applied
- Seed data created
- Can view data in Prisma Studio

**❌ If fails**:

- Check DATABASE_URL in .env
- Verify Postgres is running
- Check migration files exist

---

## Test 4: API Gateway

Start the API server:

```bash
# In a new terminal
pnpm --filter api dev

# Expected output:
# API Gateway running on port 3001
```

**Test health check** (in another terminal):

```bash
curl http://localhost:3001/health

# Expected:
# {
#   "status": "ok",
#   "timestamp": "2025-10-13T...",
#   "database": "connected"
# }
```

**Test Swagger UI**:
Open browser: http://localhost:3001/docs

- [ ] Swagger UI loads
- [ ] All endpoints visible
- [ ] Can expand endpoint details

**✅ Success criteria**:

- API starts without errors
- Health check returns "ok"
- Database shows "connected"
- Swagger UI accessible

**❌ If fails**:

- Check port 3001 not in use
- Verify Postgres connection
- Check logs for errors

---

## Test 5: Authentication Flow

Test the complete auth flow:

```bash
# Register new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "name": "Test User"
  }'

# Expected: Returns accessToken and refreshToken
# Save the accessToken for next tests

# Login with demo user
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@mediabuilder.com",
    "password": "password123"
  }'

# Expected: Returns accessToken and refreshToken

# Save token for next commands
export TOKEN="<paste-your-access-token>"

# Get current user
curl http://localhost:3001/users/me \
  -H "Authorization: Bearer $TOKEN"

# Expected: Returns user object with id, email, name

# Test token refresh
export REFRESH_TOKEN="<paste-your-refresh-token>"

curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"

# Expected: Returns new accessToken and refreshToken
```

**✅ Success criteria**:

- Can register new user
- Can login with credentials
- Token works for authenticated endpoints
- Can refresh token
- Invalid token returns 401

**❌ If fails**:

- Check JWT_SECRET in .env
- Verify bcrypt is working
- Check database has user data

---

## Test 6: Organizations & Teams

Get orgs and teams:

```bash
# Get user's organizations
curl http://localhost:3001/orgs \
  -H "Authorization: Bearer $TOKEN"

# Expected: Array with Demo Organization

# Save the first team ID
export TEAM_ID=$(curl -s http://localhost:3001/orgs \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.[0].teams[0].id')

echo "Team ID: $TEAM_ID"
```

**✅ Success criteria**:

- Returns organizations
- Can extract team ID
- Team membership verified

---

## Test 7: Asset Upload & Processing

Create a test image and upload it:

```bash
# Create a simple test image (requires ImageMagick, or use any image file)
# If you have ImageMagick:
convert -size 800x600 xc:blue test-image.jpg

# Or just use any image file you have
# cp ~/Pictures/some-image.jpg test-image.jpg

# Upload the image
curl -X POST http://localhost:3001/teams/$TEAM_ID/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg" \
  -F "tags=test,demo"

# Expected: Returns asset object with:
# - id
# - publicUrl
# - thumbnailUrl (will be null initially, processed by worker)
# - meta with width/height

# Save asset ID
export ASSET_ID="<paste-asset-id-from-response>"

# List assets
curl http://localhost:3001/teams/$TEAM_ID/assets \
  -H "Authorization: Bearer $TOKEN"

# Expected: Array with your uploaded asset

# Get specific asset
curl http://localhost:3001/teams/$TEAM_ID/assets/$ASSET_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: Full asset details
```

**Test asset storage**:

```bash
# Check file was stored
ls -la data/assets/public/org/

# Expected: Directory structure created with your file
```

**✅ Success criteria**:

- File uploads successfully
- Asset record created in database
- File stored in correct directory structure
- SHA-256 hash computed
- Can list and retrieve asset

**❌ If fails**:

- Check ASSETS_ROOT in .env
- Verify /data/assets directory exists
- Check file size limits
- Verify mime type detection

---

## Test 8: Media Processing Worker

Start the workers to process uploaded assets:

```bash
# In a new terminal
pnpm --filter workers dev

# Expected output:
# Workers started successfully
# - Export worker: ready (not implemented)
# - Video worker: ready (not implemented)
# - Media processing worker: ready
# - Bulk operations worker: ready (not implemented)

# After starting, it should process any pending assets
# Look for: "Processing asset <id> (IMAGE)"
# Look for: "Generated image thumbnail for <id>"
# Look for: "Completed processing asset <id>"
```

**Wait 10 seconds**, then check asset again:

```bash
curl http://localhost:3001/teams/$TEAM_ID/assets/$ASSET_ID \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.thumbnailUrl'

# Expected: Should now have thumbnailUrl populated
```

**Verify thumbnail file**:

```bash
ls -la data/assets/public/thumbnails/

# Expected: <asset-id>.jpg exists
```

**Test with video** (if you have a video file):

```bash
# Upload a small video
curl -X POST http://localhost:3001/teams/$TEAM_ID/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-video.mp4"

# Watch worker logs for:
# - Thumbnail generation
# - 540p proxy generation
# - Metadata extraction

# Check proxy was created
ls -la data/assets/public/proxies/
```

**✅ Success criteria**:

- Workers start successfully
- Assets processed automatically
- Thumbnails generated
- Proxies generated for videos
- Metadata extracted and saved
- No errors in worker logs

**❌ If fails**:

- Verify FFmpeg installed: `ffmpeg -version`
- Check Redis connection
- Check worker logs for errors
- Verify sharp is installed

---

## Test 9: Design CRUD Operations

Test complete design workflow:

```bash
# Create a new design
curl -X POST http://localhost:3001/teams/$TEAM_ID/designs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Banner",
    "width": 1920,
    "height": 1080
  }'

# Expected: Returns design object with:
# - id
# - doc (Polotno JSON with empty page)
# - slug: "test-banner"

# Save design ID
export DESIGN_ID="<paste-design-id>"

# List designs
curl http://localhost:3001/teams/$TEAM_ID/designs \
  -H "Authorization: Bearer $TOKEN"

# Expected: Array with your designs

# Get specific design
curl http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: Full design with versions array

# Update design doc (simulating editor save)
curl -X PUT http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doc": {
      "pages": [{
        "id": "page1",
        "children": [{
          "type": "text",
          "x": 100,
          "y": 100,
          "text": "Hello World",
          "fontSize": 48
        }]
      }]
    }
  }'

# Expected: Returns updated design

# Update design name
curl -X PUT http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Banner"
  }'

# Expected: Name updated, slug automatically updated to "updated-banner"

# Change status
curl -X PUT http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_REVIEW"
  }'

# Expected: Status updated
```

**✅ Success criteria**:

- Can create designs
- Can update design doc
- Can update name and slug
- Can change status
- Can list designs
- Slug generation works
- Default Polotno structure created

---

## Test 10: Version Management

Test version snapshots and restore:

```bash
# Save a version
curl -X POST http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID/versions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Before big changes"
  }'

# Expected: Returns version object with snapshot of current doc

# Save version ID
export VERSION_ID="<paste-version-id>"

# Make more changes to design
curl -X PUT http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doc": {
      "pages": [{
        "id": "page1",
        "children": [{
          "type": "text",
          "x": 200,
          "y": 200,
          "text": "Different content",
          "fontSize": 64
        }]
      }]
    }
  }'

# List all versions
curl http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID/versions \
  -H "Authorization: Bearer $TOKEN"

# Expected: Array of versions ordered by date

# Restore previous version
curl -X POST http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID/versions/$VERSION_ID/restore \
  -H "Authorization: Bearer $TOKEN"

# Expected: Design doc restored to previous state

# Verify restoration
curl http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.doc'

# Expected: Should match the original version's doc
```

**✅ Success criteria**:

- Can save versions
- Versions store complete doc snapshot
- Can list versions
- Can restore to any version
- Versions ordered by date

---

## Test 11: Asset Update & Delete

Test asset management:

```bash
# Update asset metadata
curl -X PUT http://localhost:3001/teams/$TEAM_ID/assets/$ASSET_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "tags": ["updated", "test"]
  }'

# Expected: Asset updated, slug automatically updated

# Verify update
curl http://localhost:3001/teams/$TEAM_ID/assets/$ASSET_ID \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{name, slug, tags}'

# Delete asset
curl -X DELETE http://localhost:3001/teams/$TEAM_ID/assets/$ASSET_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 204 No Content

# Verify deletion
curl http://localhost:3001/teams/$TEAM_ID/assets/$ASSET_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 404 Not Found
```

**✅ Success criteria**:

- Can update asset name/tags
- Slug updates automatically
- Can delete asset
- Files removed from storage
- 404 after deletion

---

## Test 12: Design Delete

```bash
# Delete design
curl -X DELETE http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 204 No Content

# Verify deletion
curl http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 404 Not Found

# Versions should be cascade deleted
curl http://localhost:3001/teams/$TEAM_ID/designs/$DESIGN_ID/versions \
  -H "Authorization: Bearer $TOKEN"

# Expected: 404 Not Found
```

**✅ Success criteria**:

- Can delete design
- Versions cascade deleted
- 404 after deletion

---

## Test 13: Deduplication

Test SHA-256 deduplication:

```bash
# Upload the same file twice
curl -X POST http://localhost:3001/teams/$TEAM_ID/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg"

# Save first asset ID
export ASSET_ID_1="<paste-id>"

# Upload again
curl -X POST http://localhost:3001/teams/$TEAM_ID/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg"

# Save second asset ID
export ASSET_ID_2="<paste-id>"

# Compare IDs - should be the SAME
echo "First:  $ASSET_ID_1"
echo "Second: $ASSET_ID_2"

# Expected: Asset IDs are identical (deduplication worked)

# Check file storage
ls -la data/assets/public/org/

# Expected: Only ONE file stored despite two uploads
```

**✅ Success criteria**:

- Same file returns same asset
- No duplicate storage
- Hash computed correctly

---

## Test 14: Error Handling

Test various error scenarios:

```bash
# Test invalid credentials
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "wrong@example.com",
    "password": "wrongpass"
  }'

# Expected: 401 with error message

# Test invalid token
curl http://localhost:3001/users/me \
  -H "Authorization: Bearer invalid-token"

# Expected: 401 Unauthorized

# Test accessing non-existent resource
curl http://localhost:3001/teams/$TEAM_ID/designs/non-existent-id \
  -H "Authorization: Bearer $TOKEN"

# Expected: 404 Not Found

# Test invalid file type
echo "not an image" > test.txt
curl -X POST http://localhost:3001/teams/$TEAM_ID/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt"

# Expected: 400 Bad Request (invalid file type)

# Test missing required fields
curl -X POST http://localhost:3001/teams/$TEAM_ID/designs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 400 with validation errors
```

**✅ Success criteria**:

- Proper error codes returned
- Error messages are clear
- Request IDs in responses
- No server crashes

---

## Test 15: Swagger UI Testing

Open http://localhost:3001/docs

Test each endpoint group:

**Auth**:

- [ ] POST /auth/register - Try it out
- [ ] POST /auth/login - Try it out
- [ ] POST /auth/refresh - Try it out

**Users**:

- [ ] Click "Authorize" button
- [ ] Paste your access token
- [ ] GET /users/me - Try it out

**Designs**:

- [ ] GET /teams/:teamId/designs
- [ ] POST /teams/:teamId/designs
- [ ] GET /teams/:teamId/designs/:id
- [ ] PUT /teams/:teamId/designs/:id
- [ ] DELETE /teams/:teamId/designs/:id
- [ ] POST /teams/:teamId/designs/:id/versions

**Assets**:

- [ ] GET /teams/:teamId/assets
- [ ] POST /teams/:teamId/uploads (upload form)
- [ ] PUT /teams/:teamId/assets/:id
- [ ] DELETE /teams/:teamId/assets/:id

**✅ Success criteria**:

- All endpoints documented
- Can execute requests from Swagger
- Authorization works
- Request/response schemas shown

---

## Test 16: Performance & Stress Test

Test system under load:

```bash
# Upload 10 images rapidly
for i in {1..10}; do
  curl -X POST http://localhost:3001/teams/$TEAM_ID/uploads \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test-image.jpg" &
done
wait

# Expected: All uploads succeed, workers process all

# Create 20 designs rapidly
for i in {1..20}; do
  curl -X POST http://localhost:3001/teams/$TEAM_ID/designs \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Design $i\"}" &
done
wait

# List all designs
curl http://localhost:3001/teams/$TEAM_ID/designs \
  -H "Authorization: Bearer $TOKEN" \
  | jq 'length'

# Expected: Returns 20+ designs
```

**✅ Success criteria**:

- Handles concurrent requests
- No race conditions
- Workers process queue
- Database constraints work

---

## Test 17: Data Integrity

Check database consistency:

```bash
# Open Prisma Studio
pnpm --filter prisma studio

# Verify:
- [ ] All users have valid emails
- [ ] All teams have valid orgId
- [ ] All designs have valid teamId and createdBy
- [ ] All assets have valid hash
- [ ] All versions have valid designId
- [ ] No orphaned records

# Check file storage matches database
# Count assets in DB
curl -s http://localhost:3001/teams/$TEAM_ID/assets \
  -H "Authorization: Bearer $TOKEN" \
  | jq 'length'

# Count files in storage
find data/assets/public -type f -name "*.jpg" -o -name "*.png" | wc -l

# Numbers should roughly match (accounting for thumbnails/proxies)
```

**✅ Success criteria**:

- Database referential integrity maintained
- No orphaned records
- File storage matches database records
- All foreign keys valid

---

## Final Checklist

Mark each as complete:

### Infrastructure

- [ ] Docker containers running and healthy
- [ ] Postgres accepting connections
- [ ] Redis responding to commands
- [ ] Nginx proxying correctly

### API

- [ ] API starts without errors
- [ ] Health check passes
- [ ] Swagger UI accessible
- [ ] All endpoints documented

### Authentication

- [ ] Can register new users
- [ ] Can login with credentials
- [ ] Tokens work for auth
- [ ] Token refresh works
- [ ] Logout invalidates tokens

### Assets

- [ ] Can upload files (images, videos, audio)
- [ ] Files stored correctly
- [ ] SHA-256 deduplication works
- [ ] Can list, get, update, delete assets
- [ ] MIME type detection works

### Media Processing

- [ ] Workers start successfully
- [ ] Image thumbnails generated
- [ ] Video thumbnails generated
- [ ] Video proxies (540p) generated
- [ ] Audio waveforms generated
- [ ] Metadata extracted correctly

### Designs

- [ ] Can create designs
- [ ] Can update design doc
- [ ] Can update name/status
- [ ] Can delete designs
- [ ] Slug generation works

### Versions

- [ ] Can save version snapshots
- [ ] Can list versions
- [ ] Can restore versions
- [ ] Versions store complete doc

### Error Handling

- [ ] Invalid credentials return 401
- [ ] Invalid tokens return 401
- [ ] Missing resources return 404
- [ ] Invalid data returns 400
- [ ] Errors have consistent format

### Performance

- [ ] Handles concurrent uploads
- [ ] Handles concurrent requests
- [ ] Workers process queue
- [ ] No memory leaks

### Data Integrity

- [ ] Foreign keys enforced
- [ ] No orphaned records
- [ ] File storage consistent with DB
- [ ] Cascade deletes work

---

## Known Issues / Limitations

Document any issues found during testing:

1.
2.
3.

---

## Sign-Off

**Date**: **\*\***\_\_\_**\*\***

**Tester**: **\*\***\_\_\_**\*\***

**Status**: [ ] Fully Ready [ ] Issues Found

**Notes**:
