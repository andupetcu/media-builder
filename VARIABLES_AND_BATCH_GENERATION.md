# Custom Variables and Batch Generation - Implementation Guide

## Overview

This feature enables users to create design templates with placeholder variables (text and images) and generate multiple variations by bulk-replacing those variables with data from CSV/XLSX files.

**Status**: 🟡 In Progress - Phase 1 Complete
**Priority**: High
**Estimated Effort**: 3-4 weeks
**Last Updated**: 2025-10-14

## Architecture

### Core Concept (from Polotno Docs)

Polotno supports dynamic variables through:

- **Text variables**: `{variableName}` syntax in text elements
- **Image variables**: `custom.variable` attribute on image elements
- **JSON transformation**: Modify design JSON by replacing variables with data
- **Bulk export**: Loop through data rows, transform JSON, export each variation

### Database Schema

The `BulkJob` model already exists in Prisma schema:

```prisma
model BulkJob {
  id          String        @id @default(cuid())
  designId    String
  sourceFile  String        // Path to uploaded CSV/XLSX
  mapping     Json          // Column → placeholder mapping
  formatters  Json          // Formatters config
  total       Int           @default(0)
  completed   Int           @default(0)
  failed      Int           @default(0)
  status      BulkJobStatus @default(PENDING)
  manifestUrl String?       // URL to manifest.json
  error       String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  design Design @relation(fields: [designId], references: [id])
}

enum BulkJobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}
```

### Design Storage

Variables and metadata stored in `Design.doc` JSON:

```json
{
  "pages": [...],
  "variables": [
    {
      "name": "customerName",
      "type": "text",
      "label": "Customer Name",
      "sampleValue": "John Doe",
      "defaultValue": "",
      "constraints": {
        "maxLength": 50
      }
    },
    {
      "name": "productImage",
      "type": "image",
      "label": "Product Image",
      "sampleValue": "https://example.com/sample.jpg"
    }
  ]
}
```

---

## Implementation Phases

### ✅ Phase 1: Template Variable System (Foundation)

**Goal**: Enable users to define and use variables in designs
**Status**: 🟢 **COMPLETED** (2025-10-14)

#### 1.1 Text Variable Support ✅

- [x] Create Variables panel component (`apps/web/src/components/polotno/variables-panel.tsx`)
- [x] Add UI to define new text variables (name, type, sample value)
- [x] Implement variable insertion into text elements (insert `{variableName}` at cursor)
- [x] Store variable definitions in `Design.doc.variables`
- [x] Auto-detect variables from existing text containing `{...}` pattern
- [x] Validate variable names (alphanumeric, underscore only)
- [ ] Highlight variables in text with distinct styling (future enhancement)

**Files Created**: ✅

- `apps/web/src/components/polotno/variables-panel.tsx` - Complete variables panel
- `apps/web/src/lib/variable-utils.ts` - Utilities for parsing/validation

**Files Modified**: ✅

- `apps/web/src/components/polotno-editor.tsx` - Added VariablesSection to sidebar

#### 1.2 Image Variable Support ✅

- [x] Add UI to mark images as variables (when image selected)
- [x] Show dialog to name the image variable
- [x] Set `element.custom.variable = "variableName"` on image
- [x] Add visual indicator showing variable name on selected images
- [x] List image variables in Variables panel
- [x] Support placeholder image URLs during design
- [x] Unmark image as variable functionality

**Implementation Notes**:

- Used selection tracking instead of context menu (more reliable)
- Shows blue banner when image is selected with mark/unmark button
- Displays current variable name if already marked

#### 1.3 Variable Registry & Validation ✅

- [x] Implement variable CRUD operations (create, update, delete)
- [x] Validate that all used variables are defined
- [x] Auto-detect undefined variables with "Auto-Detect" button
- [x] Support variable types: text, number, date, currency, image, url
- [x] Allow setting default values and sample values
- [x] Auto-save variable definitions with design
- [x] Extraction utilities for finding all variables in design

**Features Implemented**:

- ✅ Add Variable form with all fields (name, type, label, sample, default)
- ✅ Edit variable functionality
- ✅ Delete variable with confirmation
- ✅ Insert variable button for each variable
- ✅ Auto-detect scans design and adds missing variables
- ✅ Variable type icons for visual distinction
- ✅ Form validation with error messages
- ✅ Empty state with helpful instructions
- ✅ MobX observer for reactive updates

**Backend Changes**:

- No database schema changes needed ✅ (stored in `Design.doc` JSON)
- No API changes needed ✅ (design service already handles JSON storage)

---

### ✅ Phase 2: CSV/XLSX Import & Mapping UI

**Goal**: Upload data files and map columns to variables
**Status**: 🔴 Not Started

#### 2.1 File Upload UI

- [ ] Create batch generation route (`apps/web/src/app/designs/[id]/batch/page.tsx`)
- [ ] Add "Generate Batch" button to design detail page
- [ ] Implement file upload component for CSV/XLSX
- [ ] Parse CSV using `csv-parser` or similar
- [ ] Parse XLSX using `xlsx` package
- [ ] Display file info (name, size, row count, columns)
- [ ] Show first 5 rows as preview table

**Dependencies to Add**:

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",
    "csv-parser": "^3.0.0",
    "papaparse": "^5.4.1"
  }
}
```

**Files to Create**:

- `apps/web/src/app/designs/[id]/batch/page.tsx`
- `apps/web/src/components/batch/file-upload.tsx`
- `apps/web/src/lib/csv-parser.ts`

#### 2.2 Column Mapping Interface

- [ ] Create mapping component with two-column layout
- [ ] Left side: List of variables from design
- [ ] Right side: List of CSV columns
- [ ] Drag-and-drop or dropdown to map columns to variables
- [ ] Show data type validation (text variable shouldn't map to numeric column)
- [ ] Support unmapped variables (use default values)
- [ ] Show preview of first 3 rows with mappings applied
- [ ] Save mapping configuration

**Files to Create**:

- `apps/web/src/components/batch/column-mapper.tsx`
- `apps/web/src/components/batch/mapping-preview.tsx`

#### 2.3 Data Formatters

- [ ] Implement formatter functions in backend
- [ ] **Text formatters**:
  - `uppercase`, `lowercase`, `titlecase`
  - `truncate(length)`, `trim`
  - `regex(pattern, replacement)`
  - `prepend(text)`, `append(text)`
- [ ] **Number formatters**:
  - `currency(symbol, decimals)`
  - `decimal(places)`
  - `thousands(separator)`
  - `round`, `floor`, `ceil`
- [ ] **Date formatters**:
  - `dateFormat(format)` (e.g., MM/DD/YYYY, YYYY-MM-DD)
  - `dateAdd(days)`, `dateSub(days)`
- [ ] Add formatter UI to mapping interface
- [ ] Support chaining multiple formatters
- [ ] Test each formatter with sample data

**Files to Create**:

- `apps/api/src/bulk/formatters.ts` (formatter functions)
- `apps/web/src/components/batch/formatter-builder.tsx` (UI)

**Example Formatter Implementation**:

```typescript
// apps/api/src/bulk/formatters.ts
export const formatters = {
  uppercase: (value: string) => value.toUpperCase(),
  lowercase: (value: string) => value.toLowerCase(),
  titlecase: (value: string) =>
    value.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
  truncate: (value: string, length: number) =>
    value.length > length ? value.substring(0, length) + '...' : value,
  currency: (value: number, symbol = '$', decimals = 2) => `${symbol}${value.toFixed(decimals)}`,
  dateFormat: (value: string, format: string) => {
    // Use date-fns or similar
    return format // TODO: implement
  },
  regex: (value: string, pattern: string, replacement: string) =>
    value.replace(new RegExp(pattern, 'g'), replacement),
}
```

#### 2.4 Conditional Logic

- [ ] Add conditional visibility support to elements
- [ ] UI to set conditions: "Show element if {column} {operator} {value}"
- [ ] Supported operators: `==`, `!=`, `contains`, `isEmpty`, `>`, `<`, `>=`, `<=`
- [ ] Support multiple conditions with AND/OR logic
- [ ] Store conditions in `element.custom.conditionalVisibility`
- [ ] Preview shows elements correctly hidden/shown per row

**Files to Create**:

- `apps/web/src/components/batch/conditional-builder.tsx`
- `apps/api/src/bulk/conditional-evaluator.ts`

**Conditional Storage Format**:

```json
{
  "type": "image",
  "src": "...",
  "custom": {
    "conditionalVisibility": {
      "rules": [{ "column": "status", "operator": "==", "value": "premium" }],
      "logic": "AND"
    }
  }
}
```

---

### ✅ Phase 3: Backend API & Processing Engine

**Goal**: Transform templates with data and generate outputs
**Status**: 🔴 Not Started

#### 3.1 Bulk Job API Endpoints

- [ ] Create bulk module (`apps/api/src/bulk/bulk.module.ts`)
- [ ] Implement controller with 5 endpoints:

**Endpoints to Implement**:

```typescript
// apps/api/src/bulk/bulk.controller.ts

// Upload CSV and preview first 10 rows
POST /teams/:teamId/designs/:designId/bulk/preview
Body: { file: File, mapping: object, formatters: object }
Response: { rows: PreviewRow[], warnings: string[] }

// Start bulk generation job
POST /teams/:teamId/designs/:designId/bulk/start
Body: { file: File, mapping: object, formatters: object, options: object }
Response: { jobId: string }

// Get job status and progress
GET /teams/:teamId/bulk-jobs/:jobId
Response: { id, status, total, completed, failed, error?, manifestUrl? }

// Download manifest.json
GET /teams/:teamId/bulk-jobs/:jobId/manifest
Response: JSON file download

// Download ZIP of all outputs
GET /teams/:teamId/bulk-jobs/:jobId/download
Response: ZIP file download
```

- [ ] Add RBAC guards (DESIGNER role or higher)
- [ ] Validate file size limits (max 10MB for CSV/XLSX)
- [ ] Validate row limits (max 1000 rows per batch)
- [ ] Store uploaded CSV/XLSX to `/data/assets/private/bulk/uploads/`

**Files to Create**:

- `apps/api/src/bulk/bulk.module.ts`
- `apps/api/src/bulk/bulk.controller.ts`
- `apps/api/src/bulk/bulk.service.ts`
- `apps/api/src/bulk/dto/preview-bulk.dto.ts`
- `apps/api/src/bulk/dto/start-bulk.dto.ts`

#### 3.2 Template Engine (Core Logic)

- [ ] Implement JSON transformation engine
- [ ] Load design JSON from database
- [ ] Parse CSV/XLSX data with column mapping
- [ ] Deep traverse JSON tree to find all elements
- [ ] **Text replacement**:
  - Find all text elements containing `{variableName}`
  - Replace with mapped column data
  - Apply formatters in order
- [ ] **Image replacement**:
  - Find all image elements with `custom.variable`
  - Replace `src` with mapped column value (URL or upload)
  - Validate image URLs are accessible
- [ ] **Conditional visibility**:
  - Evaluate conditions for each element
  - Set `visible: false` if conditions not met
- [ ] Return modified JSON for each row

**Files to Create**:

- `apps/api/src/bulk/template-engine.ts`

**Template Engine Implementation**:

```typescript
// apps/api/src/bulk/template-engine.ts

export class TemplateEngine {
  // Deep traversal helper
  private forEveryChild(node: any, callback: (node: any) => void) {
    if (node.children) {
      node.children.forEach((child: any) => {
        callback(child)
        this.forEveryChild(child, callback)
      })
    }
  }

  // Main transformation function
  transformDesign(
    designJson: any,
    rowData: Record<string, any>,
    mapping: Record<string, string>, // variable -> column
    formatters: Record<string, any[]>
  ): { json: any; warnings: string[] } {
    const json = JSON.parse(JSON.stringify(designJson)) // deep clone
    const warnings: string[] = []

    json.pages.forEach((page: any) => {
      this.forEveryChild(page, element => {
        // Handle text variables
        if (element.type === 'text' && element.text) {
          element.text = this.replaceTextVariables(
            element.text,
            rowData,
            mapping,
            formatters,
            warnings
          )

          // Check for overflow
          const overflow = this.checkTextOverflow(element)
          if (overflow) {
            warnings.push(`Text overflow in element ${element.id}`)
          }
        }

        // Handle image variables
        if (element.type === 'image' && element.custom?.variable) {
          const varName = element.custom.variable
          const column = mapping[varName]
          if (column && rowData[column]) {
            element.src = rowData[column]
          }
        }

        // Handle conditional visibility
        if (element.custom?.conditionalVisibility) {
          const visible = this.evaluateConditions(element.custom.conditionalVisibility, rowData)
          if (!visible) {
            element.visible = false
          }
        }
      })
    })

    return { json, warnings }
  }

  private replaceTextVariables(
    text: string,
    rowData: Record<string, any>,
    mapping: Record<string, string>,
    formatters: Record<string, any[]>,
    warnings: string[]
  ): string {
    // Find all {variable} patterns
    const variablePattern = /\{([a-zA-Z0-9_]+)\}/g

    return text.replace(variablePattern, (match, varName) => {
      const column = mapping[varName]
      if (!column) {
        warnings.push(`Variable ${varName} not mapped`)
        return match
      }

      let value = rowData[column]
      if (value === undefined || value === null) {
        warnings.push(`No data for variable ${varName} in column ${column}`)
        return ''
      }

      // Apply formatters
      const varFormatters = formatters[varName] || []
      for (const formatter of varFormatters) {
        value = this.applyFormatter(value, formatter)
      }

      return String(value)
    })
  }

  private applyFormatter(value: any, formatter: any): any {
    // Import and apply formatter function
    // Implementation depends on formatter structure
    return value
  }

  private checkTextOverflow(element: any): boolean {
    // This is complex - may need to render or estimate
    // For now, return false
    return false
  }

  private evaluateConditions(conditions: any, rowData: Record<string, any>): boolean {
    // Evaluate conditional logic
    // Implementation in conditional-evaluator.ts
    return true
  }
}
```

#### 3.3 BullMQ Worker for Batch Export

- [ ] Create queue: `bulk-generation`
- [ ] Implement processor in workers package
- [ ] Job flow:
  1. Load BulkJob from database
  2. Load design JSON
  3. Parse CSV/XLSX file
  4. For each row:
     - Transform JSON with template engine
     - Call existing export worker (PNG/PDF)
     - Store output file
     - Update progress: `BulkJob.completed++`
  5. Generate manifest.json
  6. Create ZIP file with all outputs
  7. Update `BulkJob.status = COMPLETED`
- [ ] Handle errors gracefully (update `BulkJob.failed++`)
- [ ] Set timeout per row (max 2 minutes)
- [ ] Add retry logic (max 3 retries per row)

**Files to Create**:

- `apps/api/src/workers/processors/bulk-generation.processor.ts`
- `apps/api/src/workers/queues/bulk-generation.queue.ts`

**Worker Implementation Outline**:

```typescript
// apps/api/src/workers/processors/bulk-generation.processor.ts

@Processor('bulk-generation')
export class BulkGenerationProcessor {
  @Process()
  async processBulkJob(job: Job) {
    const { bulkJobId } = job.data

    // Load bulk job
    const bulkJob = await this.prisma.bulkJob.findUnique({
      where: { id: bulkJobId },
      include: { design: true },
    })

    // Update status
    await this.prisma.bulkJob.update({
      where: { id: bulkJobId },
      data: { status: 'RUNNING' },
    })

    try {
      // Parse CSV
      const rows = await this.parseDataFile(bulkJob.sourceFile)
      const designJson = bulkJob.design.doc
      const mapping = bulkJob.mapping
      const formatters = bulkJob.formatters

      // Update total
      await this.prisma.bulkJob.update({
        where: { id: bulkJobId },
        data: { total: rows.length },
      })

      const results = []

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        try {
          const rowData = rows[i]

          // Transform design
          const { json, warnings } = this.templateEngine.transformDesign(
            designJson,
            rowData,
            mapping,
            formatters
          )

          // Export to PNG
          const exportResult = await this.exportService.exportJson(json, {
            format: 'png',
            quality: 1,
          })

          results.push({
            rowIndex: i,
            data: rowData,
            outputs: [{ url: exportResult.url, type: 'png', page: 1 }],
            warnings,
            error: null,
          })

          // Update progress
          await this.prisma.bulkJob.update({
            where: { id: bulkJobId },
            data: { completed: { increment: 1 } },
          })
        } catch (error) {
          results.push({
            rowIndex: i,
            data: rows[i],
            outputs: [],
            warnings: [],
            error: error.message,
          })

          await this.prisma.bulkJob.update({
            where: { id: bulkJobId },
            data: { failed: { increment: 1 } },
          })
        }

        // Report progress
        job.progress(((i + 1) / rows.length) * 100)
      }

      // Generate manifest
      const manifest = this.createManifest(bulkJob, results)
      const manifestPath = await this.saveManifest(manifest)

      // Create ZIP
      const zipPath = await this.createZip(results, manifestPath)

      // Update job
      await this.prisma.bulkJob.update({
        where: { id: bulkJobId },
        data: {
          status: 'COMPLETED',
          manifestUrl: this.getPublicUrl(zipPath),
        },
      })
    } catch (error) {
      await this.prisma.bulkJob.update({
        where: { id: bulkJobId },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      })
      throw error
    }
  }
}
```

#### 3.4 Overflow Handling

- [ ] Detect text overflow (text exceeds element bounds)
- [ ] **Auto-shrink mode**: Reduce font size to fit (with min size limit)
- [ ] **Ellipsis mode**: Truncate text with `...`
- [ ] **Strict mode**: Fail row if overflow detected
- [ ] Make overflow policy configurable in bulk job options
- [ ] Log overflow warnings in manifest per row
- [ ] Add visual indicator in preview when overflow detected

**Files to Modify**:

- `apps/api/src/bulk/template-engine.ts` (add overflow detection)
- `apps/api/src/bulk/overflow-handler.ts` (new - handle different policies)

**Overflow Detection**:

```typescript
// This is complex and may require:
// 1. Estimate based on text length vs element width
// 2. Use canvas measureText() API
// 3. Render with Puppeteer and check bounds
// Start with simple estimation for MVP
```

---

### ✅ Phase 4: Job Management & Results

**Goal**: Track progress and deliver results
**Status**: 🔴 Not Started

#### 4.1 Progress Tracking UI

- [ ] Create bulk job status page
- [ ] Poll `/bulk-jobs/:jobId` endpoint every 2 seconds
- [ ] Show progress bar: `(completed + failed) / total * 100%`
- [ ] Display status badge (PENDING, RUNNING, COMPLETED, FAILED)
- [ ] Show completed/failed/total counts
- [ ] Estimate time remaining based on avg time per row
- [ ] Show real-time updates (use React state or Zustand)
- [ ] Add "Cancel Job" button (queue job cancellation)

**Files to Create**:

- `apps/web/src/app/designs/[id]/batch/[jobId]/page.tsx` (job status page)
- `apps/web/src/components/batch/job-progress.tsx`

**Progress UI Example**:

```tsx
// apps/web/src/components/batch/job-progress.tsx
export function JobProgress({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<BulkJob | null>(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await apiClient.get(`/bulk-jobs/${jobId}`)
      setJob(data)

      // Stop polling when complete or failed
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        clearInterval(interval)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId])

  if (!job) return <div>Loading...</div>

  const progress = job.total > 0 ? ((job.completed + job.failed) / job.total) * 100 : 0

  return (
    <div>
      <h2>Batch Generation Progress</h2>
      <div className="progress-bar">
        <div style={{ width: `${progress}%` }} />
      </div>
      <p>
        {job.completed} completed, {job.failed} failed, {job.total} total
      </p>
      <p>Status: {job.status}</p>
      {job.manifestUrl && <a href={job.manifestUrl}>Download Results</a>}
    </div>
  )
}
```

#### 4.2 Manifest Generation

- [ ] Create manifest service
- [ ] Manifest format:
  ```json
  {
    "bulkJobId": "cuid",
    "designId": "cuid",
    "designName": "Customer Cards",
    "createdAt": "2025-10-14T12:00:00Z",
    "total": 100,
    "completed": 98,
    "failed": 2,
    "processingTime": 120.5,
    "rows": [
      {
        "rowIndex": 0,
        "data": {
          "name": "John Doe",
          "company": "Acme Corp",
          "email": "john@acme.com"
        },
        "outputs": [
          {
            "url": "https://.../row-0-page-1.png",
            "type": "png",
            "page": 1,
            "sizeBytes": 125000
          }
        ],
        "warnings": ["name field truncated to 50 chars"],
        "error": null
      },
      {
        "rowIndex": 1,
        "data": {...},
        "outputs": [],
        "warnings": [],
        "error": "Failed to load image from URL"
      }
    ]
  }
  ```
- [ ] Save manifest to `/data/assets/private/bulk/{jobId}/manifest.json`
- [ ] Generate public URL for manifest
- [ ] Include summary statistics (success rate, common errors)

**Files to Create**:

- `apps/api/src/bulk/manifest.service.ts`

#### 4.3 ZIP Download

- [ ] Install `archiver` package for ZIP creation
- [ ] Bundle all generated outputs into ZIP
- [ ] Structure:
  ```
  bulk-job-{jobId}.zip
  ├── manifest.json
  ├── row-0-page-1.png
  ├── row-1-page-1.png
  ├── row-2-page-1.png
  └── ...
  ```
- [ ] For multi-page designs:
  ```
  ├── row-0/
  │   ├── page-1.png
  │   └── page-2.png
  ├── row-1/
  │   ├── page-1.png
  │   └── page-2.png
  ```
- [ ] Store ZIP in `/data/assets/private/bulk/{jobId}/output.zip`
- [ ] Set `BulkJob.manifestUrl` to ZIP download URL
- [ ] Stream ZIP download (don't load entire file in memory)

**ZIP Creation Implementation**:

```typescript
// apps/api/src/bulk/zip.service.ts
import archiver from 'archiver'
import { createWriteStream } from 'fs'

export class ZipService {
  async createZip(outputFiles: string[], manifestPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', () => resolve())
      archive.on('error', err => reject(err))

      archive.pipe(output)

      // Add manifest
      archive.file(manifestPath, { name: 'manifest.json' })

      // Add all output files
      outputFiles.forEach((file, index) => {
        archive.file(file, { name: `row-${index}.png` })
      })

      archive.finalize()
    })
  }
}
```

**Dependencies**:

```json
{
  "dependencies": {
    "archiver": "^6.0.1"
  },
  "devDependencies": {
    "@types/archiver": "^6.0.2"
  }
}
```

#### 4.4 Bulk Jobs Management UI

- [ ] Add "Batch Jobs" tab to design detail page
- [ ] List all bulk jobs for the design
- [ ] Show job metadata:
  - Created date/time
  - Status badge
  - Progress (completed/total)
  - File name
- [ ] Actions per job:
  - View details (navigate to job page)
  - Download results (if completed)
  - Download manifest JSON
  - Delete job
- [ ] Filter jobs by status (All, Running, Completed, Failed)
- [ ] Sort by creation date (newest first)
- [ ] Pagination (10 jobs per page)

**Files to Create**:

- `apps/web/src/components/batch/jobs-list.tsx`
- `apps/web/src/app/designs/[id]/batch/jobs/page.tsx`

**API Endpoint**:

```typescript
GET /teams/:teamId/designs/:designId/bulk-jobs
Query: ?status=COMPLETED&page=1&limit=10
Response: {
  jobs: BulkJob[],
  total: number,
  page: number,
  limit: number
}
```

---

### ✅ Phase 5: UX Enhancements

**Goal**: Polish the user experience
**Status**: 🔴 Not Started

#### 5.1 Preview Grid

- [ ] Show visual preview of first 5-10 generated designs
- [ ] Render previews using Polotno on client side
- [ ] Use `store.toDataURL()` to generate thumbnails
- [ ] Layout as grid (2-3 columns)
- [ ] Click thumbnail to view full preview in modal
- [ ] Show which variables are being used in each preview
- [ ] Navigate between preview rows (prev/next buttons)
- [ ] Add "Looks good, start batch" confirmation button

**Implementation**:

```tsx
// apps/web/src/components/batch/preview-grid.tsx
export function PreviewGrid({ designJson, rows, mapping, formatters }: PreviewGridProps) {
  const [previews, setPreviews] = useState<string[]>([])
  const previewRows = rows.slice(0, 10) // First 10 rows

  useEffect(() => {
    // Create temporary Polotno stores for each row
    const generatePreviews = async () => {
      const urls = []

      for (const row of previewRows) {
        // Transform design JSON with row data
        const transformedJson = transformDesign(designJson, row, mapping, formatters)

        // Create temporary store
        const tempStore = createStore({ key: POLOTNO_KEY })
        tempStore.loadJSON(transformedJson)

        // Render to data URL
        const dataUrl = await tempStore.toDataURL({ pixelRatio: 0.5 })
        urls.push(dataUrl)
      }

      setPreviews(urls)
    }

    generatePreviews()
  }, [designJson, previewRows, mapping, formatters])

  return (
    <div className="grid grid-cols-3 gap-4">
      {previews.map((preview, index) => (
        <div key={index} className="border rounded-lg overflow-hidden">
          <img src={preview} alt={`Preview ${index + 1}`} />
          <div className="p-2 text-sm">
            Row {index + 1}: {JSON.stringify(previewRows[index]).slice(0, 50)}...
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### 5.2 Variable Picker UI

- [ ] Add "Insert Variable" button to text editing toolbar
- [ ] Show dropdown list of available variables when button clicked
- [ ] Display variable name, type, and sample value
- [ ] Click to insert `{variableName}` at cursor position
- [ ] Keyboard shortcut: `Ctrl+K` or `Cmd+K` to open picker
- [ ] Filter variables by typing (search)
- [ ] Group variables by type (Text, Number, Date, Image)

**Implementation Note**:
Polotno doesn't have built-in toolbar customization for text editing. May need to:

- Use Polotno's `Tooltip` component to add custom button
- Or add a floating button when text element is selected
- Or use side panel section that appears when text is selected

#### 5.3 Sample Data for Preview

- [ ] When defining variables, allow setting sample values
- [ ] Use sample data in editor to preview design appearance
- [ ] Toggle "Preview Mode" to see design with sample data filled in
- [ ] Store sample values in `Design.doc.variables[].sampleValue`
- [ ] Apply sample data non-destructively (don't modify actual design)

**Implementation**:

```tsx
// Preview mode toggle
const [previewMode, setPreviewMode] = useState(false);

useEffect(() => {
  if (previewMode) {
    // Get current JSON
    const currentJson = store.toJSON();

    // Transform with sample data
    const sampleData = design.variables.reduce((acc, v) => {
      acc[v.name] = v.sampleValue || '';
      return acc;
    }, {});

    const transformedJson = transformDesign(currentJson, sampleData, ...);

    // Load transformed JSON (temporarily)
    store.loadJSON(transformedJson);
  } else {
    // Restore original design
    store.loadJSON(design.doc);
  }
}, [previewMode]);
```

#### 5.4 Comprehensive Validation

- [ ] Validate all variables are mapped before starting batch
- [ ] Check data types match (number column for numeric variable)
- [ ] Validate CSV has at least 1 data row
- [ ] Enforce row limit (max 1000 rows per batch)
- [ ] Check for missing required columns
- [ ] Warn about duplicate row data (same data generates same design)
- [ ] Validate image URLs are accessible (ping URLs)
- [ ] Check file size limits (total output won't exceed storage quota)
- [ ] Show validation errors in UI before allowing batch start
- [ ] Add warning modal summarizing issues before proceeding

**Files to Create**:

- `apps/api/src/bulk/validators/batch-validator.ts`
- `apps/web/src/components/batch/validation-errors.tsx`

**Validation Rules**:

```typescript
// apps/api/src/bulk/validators/batch-validator.ts
export class BatchValidator {
  validate(data: ValidateInput): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check row count
    if (data.rows.length === 0) {
      errors.push('CSV file is empty')
    }
    if (data.rows.length > 1000) {
      errors.push('Maximum 1000 rows allowed per batch')
    }

    // Check all variables are mapped
    const unmappedVars = data.variables.filter(v => !data.mapping[v.name])
    if (unmappedVars.length > 0) {
      errors.push(`Unmapped variables: ${unmappedVars.map(v => v.name).join(', ')}`)
    }

    // Check for duplicate rows
    const uniqueRows = new Set(data.rows.map(r => JSON.stringify(r)))
    if (uniqueRows.size < data.rows.length) {
      warnings.push(`${data.rows.length - uniqueRows.size} duplicate rows detected`)
    }

    // Validate data types
    for (const variable of data.variables) {
      const column = data.mapping[variable.name]
      if (column) {
        const columnValues = data.rows.map(r => r[column])
        if (variable.type === 'number') {
          const nonNumeric = columnValues.filter(v => isNaN(Number(v)))
          if (nonNumeric.length > 0) {
            warnings.push(
              `Variable ${variable.name} expects numbers, but column ${column} contains non-numeric values`
            )
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}
```

---

### ✅ Phase 6: Advanced Features (Optional/Future)

**Goal**: Additional capabilities for power users
**Status**: 🔴 Not Started
**Priority**: Low (implement after core features are stable)

#### 6.1 Image URL Support in CSV

- [ ] Support image URLs in CSV data
- [ ] Download images from URLs during processing
- [ ] Validate URLs return valid image content (check content-type)
- [ ] Cache downloaded images to avoid re-downloading
- [ ] Support both public URLs and signed URLs
- [ ] Handle image download errors gracefully
- [ ] Support base64 data URLs as well
- [ ] Resize large images to reasonable dimensions

#### 6.2 Dynamic QR Code Generation

- [ ] Integrate with existing QR code feature
- [ ] Mark QR elements as variables
- [ ] QR data comes from CSV column
- [ ] Each generated design has unique QR code
- [ ] Support QR customization (color, logo, error correction)

#### 6.3 Multi-page Export Support

- [ ] Export all pages for each row in batch
- [ ] Manifest includes all page outputs per row
- [ ] ZIP structure: `row-{index}/page-{page}.{ext}`
- [ ] Option to export as multi-page PDF per row
- [ ] Handle page-specific variables (different data per page)

#### 6.4 Scheduling & Automation

- [ ] Schedule bulk generation jobs (cron-like)
- [ ] Recurring jobs (daily, weekly, monthly)
- [ ] Webhook triggers on completion
- [ ] Email notifications when job completes
- [ ] Integration with Footprints for automated delivery
- [ ] API endpoint for external systems to trigger batch generation

---

## Testing Strategy

### Unit Tests

- [ ] Formatter functions (`formatters.ts`)
- [ ] Template engine (`template-engine.ts`)
- [ ] Conditional evaluator (`conditional-evaluator.ts`)
- [ ] Variable validation utilities
- [ ] Manifest generation logic

### Integration Tests

- [ ] API endpoints (supertest)
  - Preview bulk generation
  - Start bulk generation
  - Get job status
  - Download manifest/ZIP
- [ ] BullMQ worker processing
- [ ] File upload and parsing (CSV/XLSX)

### E2E Tests (Playwright)

- [ ] Create design with variables
- [ ] Upload CSV and map columns
- [ ] Preview generated designs
- [ ] Start batch generation
- [ ] Monitor progress
- [ ] Download results
- [ ] Complete end-to-end workflow

### Performance Tests

- [ ] Batch generation with 100 rows
- [ ] Batch generation with 1000 rows (max)
- [ ] Large image replacement (5MB images)
- [ ] Complex formatters and conditionals
- [ ] Concurrent bulk jobs

---

## Dependencies to Add

**Frontend**:

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",
    "papaparse": "^5.4.1",
    "react-dropzone": "^14.2.3"
  }
}
```

**Backend**:

```json
{
  "dependencies": {
    "archiver": "^6.0.1",
    "csv-parser": "^3.0.0",
    "xlsx": "^0.18.5",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/archiver": "^6.0.2",
    "@types/papaparse": "^5.3.7"
  }
}
```

---

## Files Summary

### New Files to Create

**Frontend (Web App)**:

1. `apps/web/src/components/polotno/variables-panel.tsx` - Variables sidebar panel
2. `apps/web/src/lib/variable-utils.ts` - Variable parsing/validation helpers
3. `apps/web/src/app/designs/[id]/batch/page.tsx` - Batch generation main page
4. `apps/web/src/app/designs/[id]/batch/[jobId]/page.tsx` - Job status page
5. `apps/web/src/app/designs/[id]/batch/jobs/page.tsx` - Jobs list page
6. `apps/web/src/components/batch/file-upload.tsx` - CSV/XLSX upload component
7. `apps/web/src/components/batch/column-mapper.tsx` - Mapping interface
8. `apps/web/src/components/batch/mapping-preview.tsx` - Preview mapped data
9. `apps/web/src/components/batch/formatter-builder.tsx` - Formatter UI
10. `apps/web/src/components/batch/conditional-builder.tsx` - Conditional logic UI
11. `apps/web/src/components/batch/preview-grid.tsx` - Visual preview grid
12. `apps/web/src/components/batch/job-progress.tsx` - Progress tracking
13. `apps/web/src/components/batch/jobs-list.tsx` - Jobs list component
14. `apps/web/src/components/batch/validation-errors.tsx` - Validation display
15. `apps/web/src/lib/csv-parser.ts` - CSV parsing utilities

**Backend (API)**:

1. `apps/api/src/bulk/bulk.module.ts` - Bulk module
2. `apps/api/src/bulk/bulk.controller.ts` - REST endpoints
3. `apps/api/src/bulk/bulk.service.ts` - Business logic
4. `apps/api/src/bulk/template-engine.ts` - JSON transformation engine
5. `apps/api/src/bulk/formatters.ts` - Formatter functions
6. `apps/api/src/bulk/conditional-evaluator.ts` - Conditional logic
7. `apps/api/src/bulk/manifest.service.ts` - Manifest generation
8. `apps/api/src/bulk/zip.service.ts` - ZIP creation
9. `apps/api/src/bulk/overflow-handler.ts` - Text overflow handling
10. `apps/api/src/bulk/validators/batch-validator.ts` - Validation logic
11. `apps/api/src/bulk/dto/preview-bulk.dto.ts` - Preview DTO
12. `apps/api/src/bulk/dto/start-bulk.dto.ts` - Start job DTO
13. `apps/api/src/workers/processors/bulk-generation.processor.ts` - Worker
14. `apps/api/src/workers/queues/bulk-generation.queue.ts` - Queue setup

### Files to Modify

1. `apps/web/src/components/polotno-editor.tsx` - Add variables section
2. `apps/web/src/app/designs/[id]/page.tsx` - Add "Generate Batch" button
3. `apps/api/src/app.module.ts` - Import BulkModule
4. `apps/api/src/workers/workers.module.ts` - Register bulk queue

**Total**: 15 frontend files + 14 backend files = **29 new files**
**Modified**: 4 files

---

## Success Criteria

✅ **Phase 1 Complete** when:

- Users can define text and image variables
- Variables are stored in design JSON
- Variables panel shows all defined variables
- Text elements can contain `{variable}` syntax
- Images can be marked with variable names

✅ **Phase 2 Complete** when:

- Users can upload CSV/XLSX files
- Column mapping interface works smoothly
- Formatters can be applied and tested
- Preview shows first 3 rows with mappings

✅ **Phase 3 Complete** when:

- Template engine correctly transforms JSON
- Bulk job worker processes batches
- Exports are generated successfully
- Errors are handled and logged

✅ **Phase 4 Complete** when:

- Job progress updates in real-time
- Manifest.json is generated correctly
- ZIP download contains all outputs
- Jobs list UI shows all jobs

✅ **Phase 5 Complete** when:

- Preview grid shows visual thumbnails
- Validation catches all common errors
- UX is smooth and intuitive
- Edge cases are handled gracefully

✅ **Phase 6 Complete** when:

- Advanced features work as expected
- Documentation is complete
- Performance meets targets
- Ready for production use

---

## Performance Targets

- **Preview generation**: < 2 seconds for 10 previews
- **Single row export**: < 3 seconds (PNG, 1080p)
- **Batch of 100 rows**: < 5 minutes (P95)
- **Batch of 1000 rows**: < 45 minutes (P95)
- **ZIP creation**: < 30 seconds for 1000 files
- **Job status polling**: < 200ms response time

---

## Security Considerations

- [ ] Validate file uploads (MIME type, size, extension)
- [ ] Sanitize CSV/XLSX data to prevent injection attacks
- [ ] Rate limit bulk job creation (max 5 concurrent jobs per team)
- [ ] Validate image URLs don't point to internal services (SSRF protection)
- [ ] Store bulk data files in private directory (not publicly accessible)
- [ ] Clean up temporary files after job completion
- [ ] Add RBAC: DESIGNER role or higher to create bulk jobs
- [ ] Audit log all bulk job creations and completions

---

## Next Steps

**Recommended Start**: Phase 1 - Template Variable System

1. Create variables panel component
2. Implement variable definition UI
3. Add variable insertion for text elements
4. Test with sample design containing multiple variables
5. Move to Phase 2 once variables work correctly

**Estimated Timeline**:

- Phase 1: 1 week
- Phase 2: 1 week
- Phase 3: 1.5 weeks
- Phase 4: 3-4 days
- Phase 5: 3-4 days
- Phase 6: 1 week (optional)

**Total**: 3-4 weeks for core features (Phases 1-5)

---

## Questions / Decisions Needed

- [ ] What export formats to support in batch? (PNG, PDF, both?)
- [ ] Max file size for CSV/XLSX uploads? (Suggested: 10MB)
- [ ] Max rows per batch? (Suggested: 1000)
- [ ] Should we support video export in batch? (Not in MVP)
- [ ] Retention policy for bulk job outputs? (Suggested: 30 days)
- [ ] Pricing/quota model for bulk generation? (TBD)

---

## References

- [Polotno Dynamic Template Variables Docs](polotno-docs/Dynamic%20Template%20Variables-20251014-005524.md)
- [Master Implementation Plan - Phase 10](master_media_builder_plan.md#10-bulk-create--data-integration)
- [Prisma Schema - BulkJob Model](../packages/prisma/schema.prisma)
- [CLAUDE.md - Project Instructions](CLAUDE.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-14
**Owner**: Media Builder Team
