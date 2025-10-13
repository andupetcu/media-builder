# Polotno Remaining Tasks & Roadmap

**Last Updated**: 2025-10-13
**Current Feature Coverage**: ~20% of Polotno capabilities
**Total Remaining Effort**: 70-92 hours

---

## ✅ Completed Features

### Phase 1: Core Integration (COMPLETED)
- [x] Custom Team Images Panel - Load team assets from API
- [x] Custom Team Upload Panel - Backend persistence with progress tracking
- [x] PNG/JPEG Export - Client-side with 2x pixelRatio
- [x] PagesTimeline Component - Multi-page support
- [x] Download Button - Enabled on Toolbar
- [x] Assets Page - View and manage team asset library
- [x] Navigation - Dashboard, Designs, and Assets pages
- [x] Auto-login - Bypass login with demo user

### Quick Wins (COMPLETED)
- [x] Rulers Toggle - Visual guides for precise positioning
- [x] Bleed Area Toggle - Print designs with crop marks
- [x] QR Code Panel - Generate QR codes in editor
- [x] Unit System - Switch between px/mm/cm/in/pt
- [x] Magic Resize - Proportional element scaling (documented)

---

## 🔥 Phase 2: Essential Features (HIGH PRIORITY)

### 1. Templates System
**Effort**: 4-6 hours | **Impact**: Very High | **Status**: Not Started

#### Backend Tasks
- [ ] Add `isTemplate` boolean field to Design model
- [ ] Add `thumbnailUrl` field to Design model
- [ ] Create `POST /designs/:id/save-as-template` endpoint
- [ ] Create `GET /teams/:teamId/templates` endpoint
- [ ] Generate thumbnail on template save (screenshot or first page render)
- [ ] Add template categories/tags support

#### Frontend Tasks
- [ ] Create custom Templates side panel component
- [ ] Template grid with thumbnails
- [ ] Template search functionality
- [ ] Template preview modal
- [ ] "Save as Template" button in editor
- [ ] "Use Template" functionality (clone design)
- [ ] Template categories filter

#### Technical Notes
```typescript
// Template Panel Structure
const TemplatesSection = {
  name: 'templates',
  Tab: (props) => <SectionTab name="Templates" {...props}><TemplateIcon /></SectionTab>,
  Panel: observer(({ store }) => {
    // Load templates from API
    // Display in grid with ImagesGrid
    // On select: clone template and load into editor
  })
}
```

---

### 2. Brand Kit Integration
**Effort**: 6-8 hours | **Impact**: High (Enterprise) | **Status**: Not Started

#### Backend Tasks (May already exist)
- [ ] Verify `GET /teams/:teamId/brand-kit` endpoint
- [ ] Ensure colors array in response
- [ ] Ensure fonts array with URLs in response
- [ ] Ensure logos array in response

#### Frontend Tasks
- [ ] Create custom Brand Colors panel
- [ ] Load brand colors from API
- [ ] Color swatches with quick apply
- [ ] Custom fonts loading with `store.addFont()`
- [ ] Font variants (bold/italic) support
- [ ] Brand logo library panel
- [ ] Optional brand enforcement toggle
- [ ] Lock brand colors/fonts when enforced

#### Technical Notes
```typescript
// Load custom fonts
brandKit.fonts.forEach(font => {
  store.addFont({
    fontFamily: font.name,
    url: font.url,
    styles: [
      { src: `url("${font.regular}")`, fontStyle: 'normal', fontWeight: 'normal' },
      { src: `url("${font.bold}")`, fontStyle: 'normal', fontWeight: 'bold' },
    ]
  })
})

// Brand Colors Panel
const BrandColorsSection = {
  name: 'brand-colors',
  Tab: (props) => <SectionTab name="Brand Colors" {...props}><PaletteIcon /></SectionTab>,
  Panel: observer(({ store }) => {
    // Display brand colors as clickable swatches
    // Apply color to selected element
  })
}
```

---

### 3. PDF Export
**Effort**: 4-5 hours | **Impact**: High (Print) | **Status**: Not Started

#### Backend Tasks
- [ ] Create `POST /export/pdf` endpoint
- [ ] Puppeteer worker for server-side rendering
- [ ] Load Polotno in headless browser
- [ ] Render design to PDF with options
- [ ] Support multi-page PDF
- [ ] DPI configuration (72/150/300)
- [ ] Bleed and crop marks support
- [ ] Return PDF file or URL

#### Frontend Tasks
- [ ] Add "Export PDF" button to toolbar
- [ ] PDF export modal with options:
  - DPI selector (72/150/300)
  - Bleed toggle
  - Crop marks toggle
  - Page range selector
- [ ] Client-side preview with `store.toPDFDataURL()`
- [ ] Progress indicator for server-side export
- [ ] Download PDF when ready

#### Technical Notes
```typescript
// Client-side preview
const previewPDF = async () => {
  const pdfDataUrl = await store.toPDFDataURL({
    pixelRatio: 1,
    pageIds: [store.pages[0].id] // Preview first page only
  })
  // Display in iframe
}

// Server-side high-quality
const exportPDF = async () => {
  const json = store.toJSON()
  const response = await apiClient.post('/export/pdf', {
    designDoc: json,
    dpi: 300,
    includeBleed: true,
    cropMarks: true,
    pageIds: [] // Empty = all pages
  })
  // Download result
}
```

---

## ⚡ Phase 3: Advanced Canvas Features (MEDIUM PRIORITY)

### 4. Advanced Store Management
**Effort**: 2-3 hours | **Impact**: Medium | **Status**: Partially Done

- [x] `await store.waitLoading()` - Already used in exports
- [ ] `store.setElementsPixelRatio(2)` - High-res rendering
- [ ] `store.history.transaction()` - Batch undoable operations
- [ ] `store.history.ignore()` - Non-undoable changes
- [ ] `store.history.clear()` - Clear undo stack for memory

#### Use Cases
- Batch operations without multiple undo steps
- Performance improvements for large operations
- Memory management for long editing sessions

---

### 5. Page Management Enhancements
**Effort**: 3-4 hours | **Impact**: Medium | **Status**: Not Started

- [ ] Page background images - `page.set({ background: 'url(...)' })`
- [ ] Per-page dimensions - `page.set({ width, height })`
- [ ] Page custom data - `page.set({ custom: { myData } })`
- [ ] Batch page operations
- [ ] Page duplication with modified content
- [ ] Page templates

#### Use Cases
- Different page sizes in same design
- Page-specific backgrounds
- Metadata tracking per page

---

### 6. Element Management API
**Effort**: 3-4 hours | **Impact**: Medium | **Status**: Not Started

- [ ] `store.selectElements([ids])` - Programmatic multi-select
- [ ] `store.deleteElements([ids])` - Batch delete
- [ ] `store.getElementById(id)` - Element lookup
- [ ] `store.groupElements([ids])` - Create groups
- [ ] `store.ungroupElements([ids])` - Ungroup elements
- [ ] Element custom data - `element.set({ custom: { myData } })`
- [ ] Element locking - `element.set({ locked: true })`

#### Use Cases
- Programmatic element manipulation
- Custom workflows and automation
- Template variable tracking
- Brand element protection

---

## 🎬 Phase 4: Animations & Video (MEDIUM-HIGH PRIORITY)

### 7. Animation Support
**Effort**: 6-8 hours | **Impact**: Medium-High | **Status**: Not Started

- [ ] Enable animations - `unstable_setAnimationsEnabled(true)`
- [ ] Animation UI in toolbar
- [ ] Element animation properties
- [ ] Playback controls:
  - [ ] `store.play()` - Preview animations
  - [ ] `store.stop()` - Stop playback
  - [ ] `store.currentTime` - Get current time
  - [ ] `store.setCurrentTime(time)` - Seek
- [ ] Timeline scrubbing UI
- [ ] Animation timing controls

---

### 8. Video Features
**Effort**: 10-12 hours | **Impact**: High (Video workflows) | **Status**: Not Started

#### Video Playback
- [ ] Video side panel (stock videos)
- [ ] Video upload support
- [ ] Video element controls
- [ ] Video trim functionality

#### Audio Support
- [ ] `store.addAudio(url)` - Add audio track
- [ ] `store.removeAudio(id)` - Remove audio track
- [ ] `store.audios` - List audio tracks
- [ ] Audio controls UI
- [ ] Volume control
- [ ] Audio trim

#### Video Export
- [ ] Install `@polotno/video-export` package
- [ ] Client-side video export:
  ```typescript
  import { storeToVideo } from '@polotno/video-export'
  const videoBlob = await storeToVideo({
    store,
    fps: 30,
    pixelRatio: 2,
    onProgress: (progress) => console.log(`${Math.round(progress * 100)}%`)
  })
  ```
- [ ] Server-side video rendering (Cloud Render API)
- [ ] Export options UI (fps, quality, format)
- [ ] Progress indicator

---

### 9. GIF Export
**Effort**: 2-3 hours | **Impact**: Medium | **Status**: Not Started

- [ ] `store.saveAsGIF()` - Animated GIF download
- [ ] `store.toGIFDataURL()` - GIF as base64
- [ ] Frame rate configuration
- [ ] Loop settings
- [ ] GIF quality controls
- [ ] Export options modal

---

## 📊 Phase 5: Dynamic Templates & Bulk (HIGH IMPACT)

### 10. Dynamic Template Variables
**Effort**: 8-10 hours | **Impact**: High (Bulk workflows) | **Status**: Not Started

#### Variable System
- [ ] Variable syntax convention - `{variableName}`
- [ ] Text variable replacement
- [ ] Image variables - `element.custom.variable`
- [ ] Variable detection in text elements
- [ ] Variable preview mode

#### Bulk Generation
- [ ] CSV/XLSX import for bulk data
- [ ] Data mapping UI (map CSV columns to variables)
- [ ] Batch template processing
- [ ] Preview each variation
- [ ] Batch export to PNG/PDF
- [ ] Export manifest/index file

#### Technical Notes
```typescript
// Template with variables
store.activePage.addElement({
  type: 'text',
  text: 'Hello {name}!',
  custom: { hasVariables: true }
})

// Bulk generation
const template = store.toJSON()
const data = [
  { name: 'John', company: 'Acme Inc' },
  { name: 'Jane', company: 'Tech Corp' }
]

for (const row of data) {
  const json = replaceVariables(template, row)
  const design = await renderDesign(json)
  await exportDesign(design, row.name)
}
```

---

## 🎨 Phase 6: Toolbar Customization (LOW PRIORITY)

### 11. Custom Toolbar Components
**Effort**: 4-5 hours | **Impact**: Low-Medium | **Status**: Not Started

- [ ] Override toolbar sections with `components` prop
- [ ] Custom text controls:
  - [ ] `TextFontFamily`
  - [ ] `TextFontSize`
  - [ ] `TextFill`
  - [ ] `TextAlign`
- [ ] Custom image controls:
  - [ ] `ImageFlip`
  - [ ] `ImageFilters`
  - [ ] `ImageCrop`
  - [ ] `ImageRemoveBackground` (disable if not implemented)
- [ ] Custom SVG controls - `SvgColors`
- [ ] Custom figure controls - `FigureFill`
- [ ] Add custom action buttons
- [ ] Remove unwanted controls

#### Technical Notes
```typescript
<Toolbar
  store={store}
  downloadButtonEnabled
  components={{
    // Disable features we don't support
    ImageRemoveBackground: () => null,

    // Add custom controls
    ActionControls: () => (
      <button onClick={customAction}>Custom Action</button>
    )
  }}
/>
```

---

## 🔐 Phase 7: User Roles & Permissions (MEDIUM PRIORITY - Enterprise)

### 12. Role-Based Features
**Effort**: 3-4 hours | **Impact**: Medium (Enterprise) | **Status**: Not Started

- [ ] Set user role - `store.setRole('admin')` or `store.setRole('user')`
- [ ] Role-based UI visibility
- [ ] Toolbar restrictions by role
- [ ] Side panel restrictions by role
- [ ] Element locking for non-admins
- [ ] Read-only mode for viewers
- [ ] Brand element protection
- [ ] Permission checks on actions

#### Technical Notes
```typescript
// Set role on editor load
useEffect(() => {
  const userRole = user.role // from auth store
  store.setRole(userRole === 'OWNER' || userRole === 'ADMIN' ? 'admin' : 'user')
}, [user, store])

// Lock brand elements
if (brandKit.enforced) {
  brandElements.forEach(el => {
    el.set({ locked: true, selectable: false })
  })
}
```

---

## ✨ Phase 8: Additional Features (LOW PRIORITY)

### 13. SVG & HTML Export
**Effort**: 2-3 hours | **Impact**: Low | **Status**: Not Started

- [ ] `store.saveAsSVG()` - SVG download
- [ ] `store.toSVG()` - SVG string
- [ ] `store.saveAsHTML()` - HTML export (experimental)
- [ ] `store.toHTML()` - HTML string (experimental)
- [ ] Export options UI

---

### 14. Custom Elements
**Effort**: 8-10 hours | **Impact**: Low (Advanced) | **Status**: Not Started

- [ ] Register new element types
- [ ] Custom element rendering logic
- [ ] Custom element properties
- [ ] Custom element toolbar
- [ ] Custom element serialization

#### Use Cases
- Chart elements
- Custom widgets
- Interactive elements
- Third-party integrations

---

### 15. Context Menu & Tooltips
**Effort**: 3-4 hours | **Impact**: Low | **Status**: Not Started

- [ ] Right-click context menu customization
- [ ] Element hover tooltips
- [ ] Custom menu items
- [ ] Keyboard shortcut hints
- [ ] Action shortcuts in menu

---

### 16. Theme Support
**Effort**: 2-3 hours | **Impact**: Low | **Status**: Not Started

- [ ] Light/dark mode toggle
- [ ] Custom theme colors
- [ ] Workspace background color customization
- [ ] Selection color customization
- [ ] Theme persistence

---

## 📈 Priority Summary

### Must Have (Production Critical) - 14-19 hours
1. **Templates System** (4-6h) - Users need starting points
2. **Brand Kit Integration** (6-8h) - Enterprise requirement
3. **PDF Export** (4-5h) - Print workflow essential

### Should Have (Enhanced Experience) - 34-44 hours
4. Advanced Store Management (2-3h)
5. Page Management (3-4h)
6. Element Management (3-4h)
7. Animation Support (6-8h)
8. Video Features (10-12h)
9. GIF Export (2-3h)
10. Dynamic Templates & Bulk (8-10h)

### Nice to Have (Polish & Advanced) - 22-29 hours
11. Toolbar Customization (4-5h)
12. User Roles (3-4h)
13. SVG/HTML Export (2-3h)
14. Custom Elements (8-10h)
15. Context Menu (3-4h)
16. Theme Support (2-3h)

---

## 🎯 Recommended Implementation Order

### Sprint 1: Core Production Features (2-3 weeks)
1. Templates System
2. Brand Kit Integration
3. PDF Export

**Outcome**: Production-ready editor for most use cases

### Sprint 2: Video & Animation (2-3 weeks)
4. Animation Support
5. Video Features
6. GIF Export

**Outcome**: Full multimedia design capabilities

### Sprint 3: Power User Features (1-2 weeks)
7. Dynamic Templates & Bulk
8. Advanced Store/Page/Element Management

**Outcome**: Advanced workflows and automation

### Sprint 4: Polish & Enterprise (1 week)
9. User Roles & Permissions
10. Toolbar Customization
11. Theme Support

**Outcome**: Enterprise-grade product

---

## 📝 Notes

- All estimates assume familiarity with Polotno APIs
- Backend work may be needed for some features
- Testing time not included in estimates
- Some features may require additional packages
- Video features are the most complex (10-12h)
- Quick wins already completed saved ~2 hours

---

## 🔗 References

- [Polotno Documentation](https://polotno.com/docs)
- [POLOTNO_IMPLEMENTATION_GAP_ANALYSIS.md](./POLOTNO_IMPLEMENTATION_GAP_ANALYSIS.md)
- [Implementation Plan](./media_builder_implementation_plan.md)
