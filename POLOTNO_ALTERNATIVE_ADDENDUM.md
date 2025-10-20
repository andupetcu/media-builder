# Open-Source Polotno Alternative - Implementation Addendum

## Second Pass Code Analysis Findings

After thoroughly analyzing the existing Media Builder codebase, I've identified several critical implementation details and advanced features that should be incorporated into the open-source Polotno alternative plan.

## 1. Advanced Store Methods and APIs

### Core Store Methods Discovered

```javascript
// Store state management
store.loadJSON(json) // Load complete design from JSON
store.toJSON() // Export current state to JSON
store.waitLoading() // Async wait for all assets to load
store.on('change', handler) // Subscribe to store changes
store.setCustomData(data) // Store custom metadata

// Export methods
store.toDataURL({ pixelRatio, mimeType, quality }) // Canvas to data URL
store.saveAsImage({ fileName, pixelRatio, mimeType }) // Direct download
store.saveAsGIF() // Animated GIF export

// View controls
store.toggleRulers() // Show/hide rulers
store.toggleBleed() // Show/hide bleed marks
store.setUnit({ unit, dpi }) // Set measurement units (px, in, cm, mm)

// Animation controls
store.play() // Start animations
store.stop() // Stop animations

// Selection management
store.selectedElements // Array of selected elements
store.activePage // Currently active page reference
```

### Page and Element APIs

```javascript
// Page operations
store.pages // Array of all pages
store.pages[0].set(props) // Update page properties
store.pages[0].custom // Custom page metadata

// Element operations
page.addElement({ type, ...props }) // Add new element
element.set({ property: value }) // Update element properties
element.type // Element type identifier
element.custom // Custom element metadata
```

## 2. Variable System Architecture

### Variable Types and Structure

```typescript
export type VariableType = 'text' | 'number' | 'date' | 'currency' | 'image' | 'url'

export interface DesignVariable {
  name: string
  type: VariableType
  label?: string
  defaultValue?: any
  sampleValue?: any
  constraints?: {
    min?: number
    max?: number
    pattern?: string
    required?: boolean
  }
  formatter?: {
    type: 'uppercase' | 'lowercase' | 'titleCase' | 'currency' | 'date' | 'custom'
    config?: any
  }
}
```

### Variable Pattern Detection

The system uses regex pattern `{variableName}` to detect variables:

```javascript
const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g
```

### Variable Storage

Variables are stored in two locations:

1. **Page-level**: `page.custom.variables` array
2. **Element-level**:
   - Text elements: Variables embedded in `element.text`
   - Image elements: `element.custom.variable` property

## 3. Server-Side Rendering with Polotno-Node

### Key Implementation Details

```javascript
const { createInstance } = require('polotno-node')

// Initialize headless instance
const instance = await createInstance({
  key: polotnoKey,
  url: 'https://yourdomain.com', // Required for proper asset loading
})

// Render design to image
const imageBase64 = await instance.jsonToImageBase64(designJson, {
  pixelRatio: 2, // Quality multiplier
  mimeType: 'image/png',
  quality: 0.95, // JPEG quality if applicable
})

// Clean up
await instance.close()
```

### Critical Rendering Considerations

- **Domain configuration**: Must set proper URL for asset resolution
- **Memory management**: Close instances after batch operations
- **Quality settings**: Use pixelRatio=2 for high-quality exports
- **Resource limits**: Implement timeouts and memory limits

## 4. Batch Processing Queue Architecture

### BullMQ Integration

```typescript
// Queue definition
@Processor('bulk-export')
export class BulkJobProcessor {
  async process(job: Job<BulkJobData>) {
    // Process each row with template transformation
    for (const rowData of data) {
      const transformed = templateEngine.transform(design, rowData, mapping)
      const image = await renderToImage(transformed)
      await saveAsset(image)
    }
  }
}
```

### Template Transformation Engine

```javascript
// Variable replacement in text elements
if (element.type === 'text' && element.text) {
  element.text = replaceVariables(element.text, rowData)
}

// Image variable replacement
if (element.type === 'image' && element.custom?.variable) {
  const imageUrl = rowData[element.custom.variable]
  element.set({ src: imageUrl })
}
```

## 5. Asset Management Patterns

### File System Structure

```
/data/assets/
├── public/
│   └── org/{orgId}/team/{teamId}/{type}/{YYYY}/{MM}/{hash16}_{slug}.{ext}
└── private/
    └── org/{orgId}/team/{teamId}/{type}/{YYYY}/{MM}/{hash16}_{slug}.{ext}
```

### URL Generation Strategy

```javascript
// Public assets served from root
publicUrl = `/${relativePath}/${filename}` // NOT /api/assets/...

// Hash-based deduplication
const hash = crypto.createHash('sha256').update(buffer).digest('hex')
const hash16 = hash.substring(0, 16) // First 16 chars for filename
```

## 6. Element Properties and Behaviors

### Common Element Properties

```javascript
{
  type: 'text' | 'image' | 'svg' | 'figure' | 'line' | 'video',

  // Positioning
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,

  // Appearance
  opacity: number,
  visible: boolean,

  // Interaction
  locked: boolean,
  selectable: boolean,
  draggable: boolean,
  removable: boolean,
  alwaysOnTop: boolean,

  // Content editing
  contentEditable: boolean,  // For mask/crop editing

  // Custom metadata
  custom: {
    variable?: string,
    [key: string]: any
  }
}
```

### Text Element Specific

```javascript
{
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  fontStyle: string,
  textDecoration: string,
  lineHeight: number,
  letterSpacing: number,
  align: 'left' | 'center' | 'right' | 'justify',
  fill: string,  // Text color
}
```

## 7. Utility Functions from Polotno

### Image Utilities

```javascript
import { getImageSize, getCrop } from 'polotno/utils/image'
import * as svg from 'polotno/utils/svg'
import { useInfiniteAPI } from 'polotno/utils/use-api'
```

### Configuration Functions

```javascript
import { setUploadFunc } from 'polotno/config'
import { unstable_setAnimationsEnabled } from 'polotno/config'
import { unstable_renderAsCanvas } from 'polotno/core'
```

## 8. Side Panel Implementation Pattern

### Panel Structure

```typescript
interface SidePanel {
  name: string
  Tab: React.Component  // Tab button component
  Panel: React.Component  // Panel content component
}

// Example implementation
const CustomSection = {
  name: 'custom',
  Tab: (props) => (
    <SectionTab name="Custom" iconSize={22} {...props}>
      <Icon />
    </SectionTab>
  ),
  Panel: ({ store }) => (
    <div>
      {/* Panel content */}
    </div>
  )
}
```

## 9. Critical Implementation Gaps Identified

### Missing Core Features

1. **History Management**: No undo/redo implementation found
2. **Collaborative Editing**: No real-time sync discovered (planned but not implemented)
3. **Advanced Animations**: Limited to basic play/stop
4. **Layer Effects**: No blur, shadow, or filter implementations
5. **Advanced Typography**: Missing text path, vertical text, text effects
6. **Smart Guides**: Referenced but implementation not found
7. **Keyboard Shortcuts**: No comprehensive shortcut system
8. **Zoom Controls**: No zoom methods discovered in store

### Performance Optimizations Needed

1. **Virtual scrolling** for large element lists
2. **Canvas recycling** for multiple pages
3. **Asset lazy loading** with progressive enhancement
4. **Worker threads** for heavy computations
5. **WebAssembly** for image processing

## 10. Security and Validation Patterns

### Input Validation

```typescript
// DTO validation with class-validator
class BulkGenerateDto {
  @IsString()
  @IsNotEmpty()
  designId: string

  @IsObject()
  @ValidateNested()
  @Type(() => ColumnMapping)
  mapping: ColumnMapping
}
```

### File Upload Security

- SHA-256 hash verification
- MIME type validation
- File size limits
- Virus scanning integration points

## 11. Export Quality Settings

### Discovered Export Configurations

```javascript
// High-quality PNG export
{
  pixelRatio: 2,          // 2x for retina quality
  mimeType: 'image/png',
  quality: 1.0
}

// Optimized JPEG export
{
  pixelRatio: 1,
  mimeType: 'image/jpeg',
  quality: 0.85           // Balance quality/size
}

// Thumbnail generation
{
  pixelRatio: 0.3,        // Small preview
  mimeType: 'image/jpeg',
  quality: 0.8
}
```

## 12. Store Event System

### Event Types

```javascript
store.on('change', handler) // Any change
store.on('select', handler) // Selection change
store.on('page:change', handler) // Page switch
store.on('element:add', handler) // Element added
store.on('element:remove', handler) // Element removed
```

## 13. Advanced Use Cases Discovered

### Dynamic Template System

- Variables can be nested in groups
- Conditional visibility based on variables
- Dynamic page generation from data rows
- Template inheritance and composition

### Bulk Operations

- Parallel processing with worker pools
- Progress tracking with WebSocket updates
- Manifest generation for download management
- Error recovery and retry logic

## 14. Integration Points

### External Service Hooks

```javascript
// Upload function override
setUploadFunc(async file => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch('/api/upload', { method: 'POST', body: formData })
  return response.json()
})
```

### Asset Proxy Pattern

```javascript
// Transform external URLs through proxy
const proxyUrl = `/api/proxy?url=${encodeURIComponent(externalUrl)}`
```

## 15. Revised Implementation Priority

Based on the second pass analysis, here's the updated priority order:

### Phase 0: Foundation (Weeks 1-2)

- Store architecture with MobX
- Basic canvas with Konva.js
- JSON serialization/deserialization
- Element property system

### Phase 1: Core Editing (Weeks 3-4)

- Selection and transformation
- Basic elements (text, image, shapes)
- Property panels
- Layer management

### Phase 2: Advanced Editing (Weeks 5-6)

- Variable system implementation
- Custom metadata support
- Import/export with quality settings
- Server-side rendering setup

### Phase 3: Production Features (Weeks 7-8)

- Batch processing queue
- Template transformation engine
- Asset management system
- Multi-page support

### Phase 4: Polish (Weeks 9-10)

- History/undo system
- Keyboard shortcuts
- Performance optimizations
- Advanced export options

## 16. Technology Stack Refinements

### Core Dependencies Update

```json
{
  "konva": "^9.3.0", // Canvas rendering
  "mobx": "^6.13.0", // State management
  "mobx-react-lite": "^4.0.5", // React bindings
  "polotno-node": "^2.0.0", // Server-side rendering (reference)
  "bullmq": "^5.0.0", // Queue processing
  "sharp": "^0.33.0", // Image processing
  "puppeteer": "^22.0.0" // Headless rendering fallback
}
```

## 17. Critical Success Factors

1. **Performance**: Must handle 150+ elements at 60fps
2. **Compatibility**: Support all modern browsers + Safari 15+
3. **Export Quality**: Match or exceed Polotno's render quality
4. **Variable System**: Full parity with discovered implementation
5. **Extensibility**: Plugin architecture for custom elements
6. **Migration Path**: Import/export Polotno JSON format

## 18. Testing Requirements Update

### Additional Test Coverage Needed

- Variable replacement accuracy
- Batch processing error recovery
- Export quality regression tests
- Memory leak detection
- Canvas performance benchmarks
- Multi-user conflict resolution

## 19. Documentation Requirements

### Developer Documentation

- Store API reference
- Element type specifications
- Variable system guide
- Plugin development kit
- Migration guide from Polotno

### User Documentation

- Template creation guide
- Variable usage tutorial
- Batch processing walkthrough
- Export options explained

## 20. Conclusion

The second pass analysis reveals that building a Polotno alternative requires:

1. **Deep Canvas Expertise**: Konva.js mastery for performance
2. **State Management**: Complex MobX patterns for nested updates
3. **Server Rendering**: Headless browser or canvas implementation
4. **Queue Architecture**: Robust job processing for scale
5. **Variable Engine**: Sophisticated template transformation

The original 30-week timeline should be extended to **40-45 weeks** to accommodate these discoveries, with additional resources allocated to:

- Performance optimization specialist
- Canvas rendering expert
- Queue/worker infrastructure engineer
- Quality assurance team for export accuracy

This addendum should be read in conjunction with the original plan to provide a complete picture of the implementation requirements.
