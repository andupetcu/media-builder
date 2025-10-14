# Polotno Remaining Tasks & Roadmap

**Last Updated**: 2025-10-14
**Current Feature Coverage**: ~45% of Polotno capabilities
**Total Remaining Effort**: 50-70 hours (reduced after completing Sprint 2)

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

### Sprint 2: Video & Animation (COMPLETED)

- [x] Animation Support - Enabled with unstable_setAnimationsEnabled
- [x] Playback Controls - Play/Pause/Stop buttons with time display
- [x] GIF Export - Client-side animated GIF export with store.saveAsGIF()
- [x] Video Export - Client-side MP4 export with @polotno/video-export
- [x] Video Export Progress - Real-time progress indicator during rendering

---

## 🔥 Phase 2: Essential Features (HIGH PRIORITY)

### 1. Brand Kit Integration

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

## ⚡ Phase 3: Advanced Canvas Features (MEDIUM PRIORITY)

### 2. Advanced Store Management

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

### 3. Page Management Enhancements

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

### 4. Element Management API

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

## 🎬 Phase 4: Animations & Video (MEDIUM-HIGH PRIORITY) ✅ COMPLETED

### 5. Animation Support ✅

**Effort**: 6-8 hours | **Impact**: Medium-High | **Status**: ✅ COMPLETED

- [x] Enable animations - `unstable_setAnimationsEnabled(true)`
- [x] Animation UI in toolbar (automatically added by Polotno)
- [x] Element animation properties (built into Polotno toolbar)
- [x] Playback controls:
  - [x] `store.play()` - Preview animations
  - [x] `store.stop()` - Stop playback
  - [x] `store.currentTime` - Get current time
  - [x] Play/Pause/Stop buttons in UI
- [x] Real-time playback timer display
- [x] Polotno's built-in animation panels

---

### 6. Video Features ✅

**Effort**: 10-12 hours | **Impact**: High (Video workflows) | **Status**: ✅ PARTIALLY COMPLETED

#### Video Playback ✅

- [x] Video side panel (stock videos) - Automatically enabled with animations
- [x] Video element controls - Built into Polotno
- [ ] Video upload support - Can use Team Upload panel
- [ ] Video trim functionality - Future enhancement

#### Audio Support

- [ ] `store.addAudio(url)` - Add audio track
- [ ] `store.removeAudio(id)` - Remove audio track
- [ ] `store.audios` - List audio tracks
- [ ] Audio controls UI
- [ ] Volume control
- [ ] Audio trim

**Note**: Audio features are available in Polotno but UI not yet implemented. Can be added later if needed.

#### Video Export ✅

- [x] Install `@polotno/video-export` package
- [x] Client-side video export:
  ```typescript
  import { storeToVideo } from '@polotno/video-export'
  const videoBlob = await storeToVideo({
    store,
    fps: 30,
    pixelRatio: 2,
    onProgress: progress => console.log(`${Math.round(progress * 100)}%`),
  })
  ```
- [x] Export options (30 fps, 2x pixelRatio)
- [x] Progress indicator (real-time percentage display)
- [x] Export Video (MP4) button in UI
- [ ] Server-side video rendering (Cloud Render API) - Not needed for now

---

### 7. GIF Export ✅

**Effort**: 2-3 hours | **Impact**: Medium | **Status**: ✅ COMPLETED

- [x] `store.saveAsGIF()` - Animated GIF download
- [x] Export GIF button in UI
- [ ] `store.toGIFDataURL()` - GIF as base64 (available but not used)
- [ ] Frame rate configuration - Future enhancement
- [ ] Loop settings - Future enhancement
- [ ] GIF quality controls - Future enhancement
- [ ] Export options modal - Future enhancement

**Note**: Basic GIF export is complete. Advanced options can be added later if needed.

---

## 📊 Phase 5: Dynamic Templates & Bulk (HIGH IMPACT)

### 8. Dynamic Template Variables

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
  custom: { hasVariables: true },
})

// Bulk generation
const template = store.toJSON()
const data = [
  { name: 'John', company: 'Acme Inc' },
  { name: 'Jane', company: 'Tech Corp' },
]

for (const row of data) {
  const json = replaceVariables(template, row)
  const design = await renderDesign(json)
  await exportDesign(design, row.name)
}
```

---

## 🎨 Phase 6: Toolbar Customization (LOW PRIORITY)

### 9. Custom Toolbar Components

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

### 10. Role-Based Features

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

### 11. PDF Export

**Effort**: 4-5 hours | **Impact**: Medium (Print) | **Status**: Not Started

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
    pageIds: [store.pages[0].id], // Preview first page only
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
    pageIds: [], // Empty = all pages
  })
  // Download result
}
```

---

### 12. SVG & HTML Export

**Effort**: 2-3 hours | **Impact**: Low | **Status**: Not Started

- [ ] `store.saveAsSVG()` - SVG download
- [ ] `store.toSVG()` - SVG string
- [ ] `store.saveAsHTML()` - HTML export (experimental)
- [ ] `store.toHTML()` - HTML string (experimental)
- [ ] Export options UI

---

### 13. Custom Elements

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

### 14. Context Menu & Tooltips

**Effort**: 3-4 hours | **Impact**: Low | **Status**: Not Started

- [ ] Right-click context menu customization
- [ ] Element hover tooltips
- [ ] Custom menu items
- [ ] Keyboard shortcut hints
- [ ] Action shortcuts in menu

---

### 15. Theme Support

**Effort**: 2-3 hours | **Impact**: Low | **Status**: Not Started

- [ ] Light/dark mode toggle
- [ ] Custom theme colors
- [ ] Workspace background color customization
- [ ] Selection color customization
- [ ] Theme persistence

---

## 📈 Priority Summary

### Must Have (Production Critical) - 6-8 hours

1. **Brand Kit Integration** (6-8h) - Enterprise requirement

### Should Have (Enhanced Experience) - 21-31 hours

2. Advanced Store Management (2-3h)
3. Page Management (3-4h)
4. Element Management (3-4h)
5. ~~Animation Support~~ ✅ COMPLETED
6. ~~Video Features~~ ✅ COMPLETED
7. ~~GIF Export~~ ✅ COMPLETED
8. Dynamic Templates & Bulk (8-10h)

### Nice to Have (Polish & Advanced) - 26-33 hours

9. **PDF Export** (4-5h) - Moved from Must Have
10. Toolbar Customization (4-5h)
11. User Roles (3-4h)
12. SVG/HTML Export (2-3h)
13. Custom Elements (8-10h)
14. Context Menu (3-4h)
15. Theme Support (2-3h)

---

## 🎯 Recommended Implementation Order

### Sprint 1: Core Production Features (2-3 weeks)

1. Brand Kit Integration
2. PDF Export (moved to Nice to Have)

**Outcome**: Production-ready editor for most use cases

### Sprint 2: Video & Animation (2-3 weeks) ✅ COMPLETED

4. Animation Support ✅
5. Video Features ✅
6. GIF Export ✅

**Outcome**: Full multimedia design capabilities ✅ ACHIEVED

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
- ~~Video features are the most complex (10-12h)~~ ✅ COMPLETED
- Quick wins already completed saved ~2 hours
- **Sprint 2 (Video & Animation) completed** - Saved 18-23 hours from remaining work
- Current progress: 45% of Polotno features implemented
- Remaining critical path: Brand Kit Integration (6-8h)

---

## 🔗 References

- [Polotno Documentation](https://polotno.com/docs)
- [POLOTNO_IMPLEMENTATION_GAP_ANALYSIS.md](./POLOTNO_IMPLEMENTATION_GAP_ANALYSIS.md)
- [Implementation Plan](./media_builder_implementation_plan.md)
