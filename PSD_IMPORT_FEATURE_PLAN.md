# PSD Import Feature - Implementation Plan

## Overview

This document outlines the complete implementation plan for importing PSD files and converting them into Polotno templates in the Media Builder application.

**Goal**: Enable users to upload PSD files which are automatically converted to editable Polotno templates, preserving all layers, positioning, and visual properties.

---

## Architecture Overview

### Components to Implement

1. **Backend API** (NestJS)
   - PSD upload endpoint
   - PSD-to-Polotno converter service
   - ImageMagick integration
   - Asset storage for extracted layers

2. **Frontend UI** (Next.js + React)
   - Import Template button (next to "Save as Template")
   - Import Template dialog
   - File upload component
   - Progress indicator
   - Template loading into Polotno store

3. **Utility Scripts**
   - Standalone PSD converter (Node.js)
   - Layer extraction with ImageMagick
   - Template JSON generator

---

## Implementation Phases

### Phase 1: Backend - PSD Converter Service

**Files to Create:**

- `apps/api/src/templates/psd-converter.service.ts`
- `apps/api/src/templates/dto/import-psd.dto.ts`

**Files to Modify:**

- `apps/api/src/templates/templates.controller.ts`
- `apps/api/src/templates/templates.module.ts`

**Tasks:**

#### 1.1 Install Dependencies

```bash
cd apps/api
npm install --save @webtoon/psd psd sharp
```

#### 1.2 Create PSD Converter Service

**Location**: `apps/api/src/templates/psd-converter.service.ts`

**Key Methods:**

- `convertPSDToTemplate(psdBuffer: Buffer, filename: string, teamId: string): Promise<Template>`
- `extractLayersWithImageMagick(psdPath: string, outputDir: string, maxLayers: number): Promise<LayerInfo[]>`
- `generatePolotnoJSON(layers: LayerInfo[], width: number, height: number): PolotnoDoc`
- `uploadLayerAssets(layers: LayerInfo[], teamId: string): Promise<string[]>` - Upload extracted PNGs to asset storage

**Implementation Details:**

```typescript
interface LayerInfo {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  visible: boolean
  imagePath: string // Local path to extracted PNG
  uploadedUrl?: string // URL after uploading to asset storage
}

interface PolotnoDoc {
  width: number
  height: number
  pages: Array<{
    id: string
    width: number
    height: number
    background: string
    children: PolotnoElement[]
  }>
}

interface PolotnoElement {
  id: string
  type: 'image'
  name: string
  src: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  visible: boolean
  selectable: boolean
  draggable: boolean
}
```

**ImageMagick Integration:**

```typescript
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async extractLayersWithImageMagick(
  psdPath: string,
  outputDir: string,
  maxLayers: number = 50
): Promise<LayerInfo[]> {
  // 1. Get PSD dimensions
  const { stdout: identifyOutput } = await execAsync(
    `magick identify -format "%w %h" "${psdPath}[0]"`
  )
  const [width, height] = identifyOutput.trim().split(' ').map(Number)

  // 2. Get layer count
  const { stdout: layerCountOutput } = await execAsync(
    `magick identify "${psdPath}" | wc -l`
  )
  const totalLayers = parseInt(layerCountOutput.trim())
  const layersToExtract = Math.min(totalLayers, maxLayers)

  // 3. Create composite preview
  await execAsync(
    `magick "${psdPath}" -background none -flatten "${outputDir}/composite.png"`
  )

  // 4. Extract individual layers
  const layers: LayerInfo[] = []
  for (let i = 0; i < layersToExtract; i++) {
    const layerPath = `${outputDir}/layer_${i}.png`

    try {
      // Extract layer with alpha transparency
      await execAsync(
        `magick "${psdPath}[${i}]" -background none -alpha on "${layerPath}"`
      )

      // Get layer dimensions and position using identify
      const { stdout: layerInfo } = await execAsync(
        `magick identify -format "%w %h %X %Y" "${layerPath}"`
      )
      const [w, h, x, y] = layerInfo.trim().split(' ').map(Number)

      layers.push({
        id: `layer-${i}`,
        name: `Layer ${i}`,
        x: x >= 0 ? x : 0,
        y: y >= 0 ? y : 0,
        width: w,
        height: h,
        opacity: 1,
        visible: true,
        imagePath: layerPath,
      })
    } catch (error) {
      console.warn(`Failed to extract layer ${i}:`, error.message)
      break
    }
  }

  return layers.reverse() // Reverse to match Photoshop layer order
}
```

#### 1.3 Create Import DTO

**Location**: `apps/api/src/templates/dto/import-psd.dto.ts`

```typescript
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator'

export class ImportPsdDto {
  @IsString()
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsArray()
  @IsOptional()
  tags?: string[]

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false
}
```

#### 1.4 Add Controller Endpoint

**Location**: `apps/api/src/templates/templates.controller.ts`

```typescript
import { Controller, Post, UseInterceptors, UploadedFile, Body, Param } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ImportPsdDto } from './dto/import-psd.dto'

@Controller('teams/:teamId/templates')
@UseGuards(TeamMemberGuard)
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly psdConverter: PsdConverterService
  ) {}

  @Post('import-psd')
  @UseInterceptors(FileInterceptor('file'))
  async importPsd(
    @Param('teamId') teamId: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportPsdDto
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }

    if (!file.originalname.toLowerCase().endsWith('.psd')) {
      throw new BadRequestException('File must be a PSD file')
    }

    // Convert PSD to template
    const template = await this.psdConverter.convertPSDToTemplate(
      file.buffer,
      file.originalname,
      teamId,
      user.id,
      dto
    )

    return template
  }
}
```

#### 1.5 Update Templates Module

**Location**: `apps/api/src/templates/templates.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { TemplatesController } from './templates.controller'
import { TemplatesService } from './templates.service'
import { PsdConverterService } from './psd-converter.service'

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max
      },
    }),
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService, PsdConverterService],
})
export class TemplatesModule {}
```

---

### Phase 2: Frontend - Import UI Components

**Files to Create:**

- `apps/web/src/components/polotno/import-template-dialog.tsx`

**Files to Modify:**

- `apps/web/src/components/polotno-editor.tsx`

**Tasks:**

#### 2.1 Create Import Template Dialog

**Location**: `apps/web/src/components/polotno/import-template-dialog.tsx`

**Features:**

- File input for PSD files
- Drag & drop support
- Upload progress indicator
- Template name and metadata inputs
- Preview after conversion
- Load into editor button

**Component Structure:**

```typescript
interface ImportTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (template: any) => void
}

export const ImportTemplateDialog: React.FC<ImportTemplateDialogProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [convertedTemplate, setConvertedTemplate] = useState<any>(null)
  const teamId = useTeamStore(state => state.currentTeamId)

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.psd')) {
      alert('Please select a PSD file')
      return
    }
    setFile(selectedFile)
    // Auto-fill template name from filename
    const nameWithoutExt = selectedFile.name.replace(/\.psd$/i, '')
    setTemplateName(nameWithoutExt)
  }

  const handleImport = async () => {
    if (!file || !teamId) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', templateName)
      if (description) formData.append('description', description)
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags))

      const { data } = await apiClient.post(`/teams/${teamId}/templates/import-psd`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: progressEvent => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        },
      })

      setConvertedTemplate(data)
      alert('PSD imported successfully!')
    } catch (error) {
      console.error('Import failed:', error)
      alert('Failed to import PSD file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleLoadTemplate = () => {
    if (convertedTemplate) {
      onImportComplete(convertedTemplate)
      onClose()
    }
  }

  // UI rendering with file input, progress bar, and preview
  // ... (see full component in implementation)
}
```

#### 2.2 Add Import Button to Editor

**Location**: `apps/web/src/components/polotno-editor.tsx`

**Changes:**

1. Add state for import dialog:

```typescript
const [isImportTemplateDialogOpen, setIsImportTemplateDialogOpen] = useState(false)
```

2. Add handler for import complete:

```typescript
const handleImportComplete = (template: any) => {
  // Load the imported template into the editor
  if (template.doc) {
    store.loadJSON(template.doc)
  }
}
```

3. Add button next to "Save as Template" (after line 649):

```typescript
{/* Import Template Button */}
<button
  onClick={() => setIsImportTemplateDialogOpen(true)}
  className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm flex items-center gap-1"
  title="Import a PSD file as a template"
>
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
  Import Template
</button>
```

4. Add dialog component at the end:

```typescript
<ImportTemplateDialog
  isOpen={isImportTemplateDialogOpen}
  onClose={() => setIsImportTemplateDialogOpen(false)}
  onImportComplete={handleImportComplete}
/>
```

---

### Phase 3: Standalone Converter Script

**Files to Create:**

- `scripts/psd-converter/psd-to-polotno.js`
- `scripts/psd-converter/package.json`
- `scripts/psd-converter/README.md`

**Purpose**:

- Standalone CLI tool for batch PSD conversion
- Testing and development
- Manual template generation

**Location**: `scripts/psd-converter/psd-to-polotno.js`

**Usage:**

```bash
cd scripts/psd-converter
npm install
node psd-to-polotno.js /path/to/design.psd ./output
```

**Features:**

- Command-line arguments for PSD path and output directory
- Progress logging
- Error handling
- JSON output with template structure
- Assets directory with extracted layers

---

## Technical Requirements

### System Dependencies

#### ImageMagick 7+

```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y imagemagick

# Verify installation
magick --version  # Should show 7.x.x
```

#### Node.js Dependencies

```json
{
  "dependencies": {
    "@webtoon/psd": "^0.4.0",
    "psd": "^3.2.0",
    "sharp": "^0.33.0"
  }
}
```

### Environment Variables

Add to `.env`:

```bash
# PSD Import Settings
PSD_TEMP_DIR=/tmp/psd-imports
PSD_MAX_LAYERS=50
PSD_MAX_FILE_SIZE=500  # MB
```

---

## API Documentation

### POST /api/teams/:teamId/templates/import-psd

Import a PSD file and convert it to a template.

**Request:**

```
POST /api/teams/{teamId}/templates/import-psd
Content-Type: multipart/form-data
Authorization: Bearer YOUR_TOKEN

Form Data:
- file: PSD file (required, max 500MB)
- name: Template name (required)
- description: Template description (optional)
- tags: JSON array of tags (optional)
- isPublic: Boolean (optional, default: false)
```

**Response:**

```json
{
  "id": "cm1abc123def456",
  "teamId": "team_123",
  "createdBy": "user_456",
  "name": "Imported Design",
  "description": "Converted from PSD",
  "doc": {
    "width": 1920,
    "height": 1080,
    "pages": [
      {
        "id": "page-xyz",
        "width": 1920,
        "height": 1080,
        "background": "#ffffff",
        "children": [
          {
            "id": "layer-0",
            "type": "image",
            "name": "Background",
            "src": "/assets/team_123/layer_0.png",
            "x": 0,
            "y": 0,
            "width": 1920,
            "height": 1080,
            "opacity": 1,
            "visible": true,
            "selectable": true,
            "draggable": true
          }
        ]
      }
    ]
  },
  "thumbnail": "data:image/jpeg;base64,...",
  "width": 1920,
  "height": 1080,
  "tags": ["imported", "psd"],
  "isPublic": false,
  "createdAt": "2025-10-21T12:00:00.000Z",
  "updatedAt": "2025-10-21T12:00:00.000Z"
}
```

---

## File Structure

```
media-builder-v3/
├── apps/
│   ├── api/
│   │   └── src/
│   │       └── templates/
│   │           ├── templates.controller.ts        [MODIFY]
│   │           ├── templates.service.ts
│   │           ├── templates.module.ts            [MODIFY]
│   │           ├── psd-converter.service.ts       [NEW]
│   │           └── dto/
│   │               ├── create-template.dto.ts
│   │               └── import-psd.dto.ts          [NEW]
│   └── web/
│       └── src/
│           └── components/
│               ├── polotno-editor.tsx             [MODIFY]
│               └── polotno/
│                   ├── save-template-dialog.tsx
│                   └── import-template-dialog.tsx [NEW]
├── scripts/
│   └── psd-converter/
│       ├── package.json                           [NEW]
│       ├── psd-to-polotno.js                      [NEW]
│       └── README.md                              [NEW]
├── PSD_IMPORT_IMPLEMENTATION_GUIDE.md
├── PSD_IMPORT_FEATURE_PLAN.md                     [THIS FILE]
└── TEMPLATE_JSON_STRUCTURE.md
```

---

## Testing Strategy

### 1. Unit Tests

**Backend Service Tests** (`psd-converter.service.spec.ts`):

- Test layer extraction with ImageMagick
- Test JSON generation
- Test asset upload integration
- Test error handling (invalid PSD, missing ImageMagick, etc.)

**Frontend Component Tests**:

- Test file upload validation
- Test progress indicator
- Test template loading into store

### 2. Integration Tests

**E2E Test Scenarios**:

1. Upload small PSD (< 10MB) → verify template created
2. Upload large PSD (> 100MB) → verify progress tracking
3. Invalid file type → verify error message
4. Missing ImageMagick → verify graceful degradation
5. Import template → load into editor → save as design

### 3. Manual Testing Checklist

- [ ] Upload a simple PSD with 5-10 layers
- [ ] Verify all layers are extracted correctly
- [ ] Check layer positioning matches Photoshop
- [ ] Verify layer opacity is preserved
- [ ] Test with CMYK PSD (should convert to RGB)
- [ ] Test with very large PSD (> 500MB)
- [ ] Test with PSD containing text layers (should become images)
- [ ] Import template and edit in Polotno editor
- [ ] Save imported template as a design
- [ ] Export imported template as PNG/JPEG

---

## Known Limitations

1. **Text Layers**: Text layers are rasterized as images (not editable text)
   - **Future Enhancement**: Parse text layer metadata and create Polotno text elements

2. **Layer Effects**: Photoshop effects (shadows, glows, etc.) are flattened
   - Effects are preserved visually but not editable

3. **Smart Objects**: Smart objects are rasterized
   - No support for editing embedded content

4. **Adjustment Layers**: Adjustment layers are merged during export
   - Color adjustments are baked into layer images

5. **Vector Shapes**: Vector shapes are rasterized
   - **Future Enhancement**: Convert simple vectors to SVG elements

6. **Layer Groups**: Layer groups are flattened
   - **Future Enhancement**: Preserve grouping structure

7. **Blend Modes**: Advanced blend modes may not render identically
   - ImageMagick has limited blend mode support

---

## Performance Considerations

### Optimization Strategies

1. **Parallel Layer Extraction**: Process multiple layers concurrently
2. **Image Compression**: Use Sharp to compress extracted PNGs
3. **Streaming Upload**: Stream large files to prevent memory issues
4. **Progress Callbacks**: Real-time progress updates for UX
5. **Cleanup**: Delete temporary files after conversion
6. **Caching**: Cache converted templates for re-import

### Resource Limits

```typescript
// Recommended limits
const LIMITS = {
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_LAYERS: 50, // Extract first 50 layers
  UPLOAD_TIMEOUT: 600000, // 10 minutes
  CONVERSION_TIMEOUT: 300000, // 5 minutes
  TEMP_DIR_CLEANUP_INTERVAL: 3600000, // 1 hour
}
```

---

## Error Handling

### Error Codes

| Code                    | Description                   | Resolution                           |
| ----------------------- | ----------------------------- | ------------------------------------ |
| `PSD_INVALID_FILE`      | File is not a valid PSD       | Upload a valid PSD file              |
| `PSD_TOO_LARGE`         | File exceeds size limit       | Reduce file size or increase limit   |
| `PSD_NO_LAYERS`         | PSD has no extractable layers | Check PSD file structure             |
| `IMAGEMAGICK_NOT_FOUND` | ImageMagick not installed     | Install ImageMagick 7+               |
| `IMAGEMAGICK_ERROR`     | ImageMagick command failed    | Check logs for details               |
| `UPLOAD_FAILED`         | Layer asset upload failed     | Check storage permissions            |
| `CONVERSION_TIMEOUT`    | Conversion took too long      | Try smaller file or increase timeout |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Invalid PSD file",
  "error": "PSD_INVALID_FILE",
  "details": {
    "filename": "design.psd",
    "reason": "Unable to parse PSD header"
  }
}
```

---

## Security Considerations

### File Validation

1. **Magic Number Check**: Verify PSD file signature (`8BPS`)
2. **Size Limits**: Enforce maximum file size (500MB)
3. **Extension Validation**: Only accept `.psd` files
4. **Content Scanning**: Scan for embedded malware (future)

### Sandboxing

1. **Temp Directory**: Use isolated temp directory for processing
2. **Process Timeout**: Kill long-running ImageMagick processes
3. **Resource Limits**: Limit CPU/memory usage via cgroups (production)

### Access Control

1. **Team Isolation**: Ensure users can only import to their teams
2. **RBAC**: Check user permissions before import
3. **Asset URLs**: Generate signed URLs for semi-private templates

---

## Future Enhancements

### v1.1 - Advanced Layer Support

- [ ] Parse and convert text layers to Polotno text elements
- [ ] Preserve layer groups as Polotno groups
- [ ] Extract and apply basic layer effects (shadows, strokes)

### v1.2 - Vector Support

- [ ] Convert vector shapes to SVG elements
- [ ] Preserve vector paths and fills
- [ ] Support for clipping masks

### v1.3 - Batch Import

- [ ] Upload multiple PSDs at once
- [ ] Bulk convert to templates
- [ ] Template organization and tagging

### v1.4 - Figma/Sketch Support

- [ ] Support Figma file import (via Figma API)
- [ ] Support Sketch file import (via sketch-parser)
- [ ] Unified design file importer

---

## Implementation Checklist

### Phase 1: Backend (Week 1)

- [ ] Install ImageMagick on development machine
- [ ] Install Node.js dependencies (@webtoon/psd, sharp)
- [ ] Create `PsdConverterService` with layer extraction logic
- [ ] Implement `convertPSDToTemplate` method
- [ ] Create `ImportPsdDto` for validation
- [ ] Add `/import-psd` endpoint to `TemplatesController`
- [ ] Update `TemplatesModule` with Multer configuration
- [ ] Test layer extraction with sample PSD files
- [ ] Test template creation and storage
- [ ] Add error handling and logging

### Phase 2: Frontend (Week 1)

- [ ] Create `ImportTemplateDialog` component
- [ ] Add file input with drag & drop support
- [ ] Implement upload progress indicator
- [ ] Add template metadata form (name, description, tags)
- [ ] Add "Import Template" button to editor toolbar
- [ ] Implement template loading into Polotno store
- [ ] Add loading states and error messages
- [ ] Style dialog to match existing UI
- [ ] Test file upload flow end-to-end
- [ ] Test template loading and editing

### Phase 3: Standalone Script (Week 2)

- [ ] Create `scripts/psd-converter` directory
- [ ] Write `psd-to-polotno.js` CLI script
- [ ] Add command-line argument parsing
- [ ] Implement batch conversion support
- [ ] Add progress logging
- [ ] Write README with usage instructions
- [ ] Test with various PSD files
- [ ] Document limitations and troubleshooting

### Phase 4: Testing & Documentation (Week 2)

- [ ] Write unit tests for `PsdConverterService`
- [ ] Write E2E tests for import flow
- [ ] Test with various PSD files (sizes, layers, formats)
- [ ] Document API endpoint in OpenAPI/Swagger
- [ ] Update user documentation
- [ ] Create video tutorial (optional)
- [ ] Performance testing with large files
- [ ] Security review and validation

---

## Success Criteria

✅ **Feature Complete When:**

1. Users can upload PSD files via the editor UI
2. PSD files are converted to Polotno templates automatically
3. All layers are extracted and positioned correctly
4. Templates can be loaded into the editor and edited
5. Imported templates can be saved and reused
6. Error messages are clear and actionable
7. Progress is shown during upload/conversion
8. Performance is acceptable for files up to 500MB
9. Documentation is complete and accurate
10. Tests pass with 80%+ coverage

---

## Timeline Estimate

| Phase             | Duration   | Start | End   |
| ----------------- | ---------- | ----- | ----- |
| Phase 1: Backend  | 3 days     | Day 1 | Day 3 |
| Phase 2: Frontend | 2 days     | Day 4 | Day 5 |
| Phase 3: Script   | 1 day      | Day 6 | Day 6 |
| Phase 4: Testing  | 2 days     | Day 7 | Day 8 |
| **Total**         | **8 days** |       |       |

---

## Support and Resources

### Documentation

- [ImageMagick PSD Support](https://imagemagick.org/script/formats.php#PSD)
- [Polotno Template Format](./TEMPLATE_JSON_STRUCTURE.md)
- [PSD Implementation Guide](./PSD_IMPORT_IMPLEMENTATION_GUIDE.md)

### Libraries

- [@webtoon/psd](https://github.com/webtoon/psd) - PSD parsing
- [psd.js](https://github.com/meltingice/psd.js) - Alternative PSD parser
- [Sharp](https://sharp.pixelplumbing.com/) - Image processing

### Tools

- [ImageMagick](https://imagemagick.org/) - Layer extraction
- [Polotno Studio](https://studio.polotno.com/) - Test templates

---

**Last Updated**: October 21, 2025
**Version**: 1.0.0
**Author**: Claude Code
**Status**: Ready for Implementation
