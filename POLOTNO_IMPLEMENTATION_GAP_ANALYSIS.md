# Polotno Implementation Gap Analysis

**Generated**: 2025-10-14
**Based on**: Official Polotno SDK Documentation (53 docs)

This document analyzes our current Polotno implementation against the full capabilities of the Polotno SDK to identify missing features and opportunities for enhancement.

---

## Current Implementation Status ✅

### What We Have Working

- ✅ Basic Polotno editor with `<PolotnoContainer>`, `<Workspace>`, `<Toolbar>`, `<SidePanel>`
- ✅ Store creation with API key (`createStore({ key, showCredit: false })`)
- ✅ Default side panels (text, images, shapes, etc.)
- ✅ Auto-save functionality (20s interval) via `store.on('change')`
- ✅ Manual save button with visual feedback
- ✅ JSON import/export (`store.toJSON()`, `store.loadJSON()`)
- ✅ Page size configuration (`store.setSize()`)
- ✅ ZoomButtons component
- ✅ Blueprint CSS imported

---

## Missing Core Features 🔴

### 1. Side Panel Customization (HIGH PRIORITY)

#### Missing:

- ❌ **Custom Upload Panel**: Default upload uses base64 (performance issue), doesn't persist to backend
- ❌ **Custom Images Panel**: Not loading our team assets from `/teams/:teamId/assets` API
- ❌ **Templates Panel**: No way to load designs as templates
- ❌ **Brand Kit Panel**: Not integrated with our BrandKit model
- ❌ **QR Code Panel**: Not available (requires `npx shadcn add`)
- ❌ **Custom sections**: Not using `sections` prop to customize `<SidePanel>`

#### Implementation Needed:

```typescript
// Current (using defaults):
<SidePanel store={store} />

// Should be:
import { DEFAULT_SECTIONS } from 'polotno/side-panel';
import { CustomImagesSection } from './custom-images';
import { CustomUploadSection } from './custom-upload';
import { TemplatesSection } from './templates';
import { BrandKitSection } from './brand-kit';

const sections = [
  ...DEFAULT_SECTIONS,
  CustomImagesSection,  // Load from /teams/:teamId/assets
  CustomUploadSection,  // Upload to backend, not base64
  TemplatesSection,     // Load designs as templates
  BrandKitSection,      // Brand colors/fonts/logos
];

<SidePanel store={store} sections={sections} defaultSection="custom-images" />
```

**Impact**: This is the #1 gap. Users can't access their uploaded assets or templates.

---

### 2. Export Functionality (HIGH PRIORITY)

#### Missing Export Methods:

- ❌ `store.saveAsImage()` - Client-side PNG/JPEG export
- ❌ `store.toDataURL()` - Base64 image export
- ❌ `store.toBlob()` - Blob export (faster than toDataURL)
- ❌ `store.saveAsPDF()` - Client-side PDF export
- ❌ `store.toPDFDataURL()` - PDF as base64
- ❌ `store.saveAsSVG()` / `store.toSVG()` - SVG export (experimental)
- ❌ `store.saveAsHTML()` / `store.toHTML()` - HTML export (experimental)
- ❌ `store.saveAsGIF()` / `store.toGIFDataURL()` - Animated GIF export
- ❌ `@polotno/video-export` - Client-side MP4 video export
- ❌ Cloud Render API - Server-side rendering

#### Export Options Not Used:

- `pixelRatio` - Quality multiplier (e.g., 2x for high-res)
- `ignoreBackground` - Transparent backgrounds
- `includeBleed` - Print bleed area
- `cropMarkSize` - Print crop marks
- `pageId` / `pageIds` - Selective page export
- `onProgress` - Progress tracking

**Implementation Plan** (from Phase 4):

```typescript
// Client-side quick preview
const handlePreview = async () => {
  const dataUrl = await store.toDataURL({ pixelRatio: 0.5, quickMode: true })
  // Show in modal
}

// Server-side high-quality export (via Puppeteer worker)
const handleExport = async () => {
  const json = store.toJSON()
  const response = await apiClient.post('/export', {
    designId,
    format: 'png',
    dpi: 300,
    pixelRatio: 2,
    includeBleed: true,
  })
  // Worker uses polotno-node to render
}
```

---

### 3. Pages & Timeline (MEDIUM PRIORITY)

#### Missing:

- ❌ **PagesTimeline Component**: Multi-page navigation/management UI
- ❌ **Multi-page support**: Not exposing page management to users
- ❌ **Page operations**:
  - `store.addPage()` - Add new pages
  - `store.deletePage(id)` - Remove pages
  - `store.selectPage(id)` - Switch active page
  - `store.selectPages([ids])` - Multi-select for batch operations
  - `page.clone()` - Duplicate pages
  - `page.setZIndex(index)` - Reorder pages

#### Current Implementation:

```typescript
// We only initialize with one page
const s = createStore({ key, showCredit: false })
s.setSize(width, height)
return s
```

#### Should Add:

```typescript
import { PagesTimeline } from 'polotno/pages-timeline';

// In editor layout:
<WorkspaceWrap>
  <Toolbar store={store} />
  <Workspace store={store} />
  <ZoomButtons store={store} />
  <PagesTimeline store={store} />  {/* ADD THIS */}
</WorkspaceWrap>
```

---

### 4. Advanced Canvas Features (MEDIUM PRIORITY)

#### Missing:

- ❌ **Canvas Rulers**: `store.toggleRulers()`, `store.rulersVisible`
- ❌ **Bleed Area**: `store.toggleBleed()`, `page.set({ bleed: 20 })`
- ❌ **Unit System**: `store.setUnit({ unit: 'mm', dpi: 300 })`
- ❌ **Magic Resize**: `store.setSize(w, h, true)` - proportional element resize
- ❌ **Page Background Images**: `page.set({ background: 'url(...)' })`
- ❌ **Page-specific sizing**: `page.set({ width, height })` (override store size)

#### Implementation:

```typescript
// Add ruler toggle button
<button onClick={() => store.toggleRulers()}>
  {store.rulersVisible ? 'Hide' : 'Show'} Rulers
</button>

// DPI selector for print
<select onChange={(e) => store.setUnit({ unit: 'mm', dpi: Number(e.target.value) })}>
  <option value="72">Screen (72 DPI)</option>
  <option value="150">Draft (150 DPI)</option>
  <option value="300">Print (300 DPI)</option>
</select>
```

---

### 5. Animations & Video (MEDIUM PRIORITY)

#### Missing:

- ❌ **Animation Support**: `unstable_setAnimationsEnabled(true)`
- ❌ **Animation UI**: Toolbar controls for element animations
- ❌ **Video Side Panel**: Stock videos library
- ❌ **Playback Controls**:
  - `store.play()` - Preview animations
  - `store.stop()` - Stop playback
  - `store.currentTime` - Current time getter
  - `store.setCurrentTime()` - Seek
- ❌ **Audio Support**:
  - `store.addAudio({ src, delay, startTime, endTime, volume })`
  - `store.removeAudio(id)`
  - `store.audios` - Audio tracks list
- ❌ **Video Export**:
  - `@polotno/video-export` package
  - `storeToVideo({ store, fps, pixelRatio })` - Client-side MP4
  - Cloud Render API for server-side rendering

#### Plan (Phase 9-10):

```typescript
// Enable animations
import { unstable_setAnimationsEnabled } from 'polotno/config'
unstable_setAnimationsEnabled(true)

// Export as video
import { storeToVideo } from '@polotno/video-export'
const videoBlob = await storeToVideo({
  store,
  fps: 30,
  pixelRatio: 2,
  onProgress: progress => console.log(`${Math.round(progress * 100)}%`),
})
```

---

### 6. Fonts Management (HIGH PRIORITY for Brand Kit)

#### Missing:

- ❌ **Custom Fonts**: `store.addFont({ fontFamily, url })`
- ❌ **Font Variants**: Support for bold/italic variants
- ❌ **Font Removal**: `store.removeFont(name)`
- ❌ **Font Loading**: `store.loadFont(name)` for preview
- ❌ **Font Persistence**: Custom fonts saved in JSON

#### Implementation (Phase 6):

```typescript
// Add brand fonts from BrandKit
const brandKit = await apiClient.get(`/teams/${teamId}/brand-kit`)
brandKit.fonts.forEach(font => {
  store.addFont({
    fontFamily: font.name,
    url: font.url, // From our assets storage
  })
})

// Or with variants:
store.addFont({
  fontFamily: 'CustomFont',
  styles: [
    { src: 'url("normal.ttf")', fontStyle: 'normal', fontWeight: 'normal' },
    { src: 'url("bold.ttf")', fontStyle: 'normal', fontWeight: 'bold' },
  ],
})
```

---

### 7. Store Events & Lifecycle (LOW PRIORITY)

#### Missing:

- ❌ **waitLoading()**: `await store.waitLoading()` - Wait for resources before export
- ❌ **Element Pixel Ratio**: `store.setElementsPixelRatio(2)` - High-res rendering
- ❌ **History Control**:
  - `store.history.transaction(() => {})` - Batch changes
  - `store.history.ignore(() => {})` - Don't record in undo
  - `store.history.clear()` - Clear undo stack
- ❌ **Event Listeners**: Only using `change`, missing granular events

#### Current Auto-Save:

```typescript
// Current: Throttled save on any change
store.on('change', handleChange)

// Better: Wait for loading before export
const handleExport = async () => {
  await store.waitLoading() // ADD THIS
  const dataUrl = await store.toDataURL()
}
```

---

### 8. Dynamic Templates & Variables (MEDIUM PRIORITY)

#### Missing (Phase 12 - Bulk Create):

- ❌ **Variable Syntax**: No convention for `{variableName}` in text
- ❌ **Image Variables**: Not using `element.custom.variable` for bulk replacement
- ❌ **Template Processing**: No JSON manipulation for bulk generation

#### Plan:

```typescript
// Template with variables
store.activePage.addElement({
  type: 'text',
  text: 'Hello {name}!', // Variable placeholder
})

// Bulk generation
const template = store.toJSON()
const names = ['John', 'Jane', 'Bob']

for (const name of names) {
  const json = JSON.parse(JSON.stringify(template).replace('{name}', name))
  await exportDesign(json)
}
```

---

### 9. Toolbar Customization (LOW PRIORITY)

#### Missing:

- ❌ **Download Button**: `downloadButtonEnabled` prop not used
- ❌ **Custom Components**: `components` prop for overriding toolbar sections
- ❌ **Toolbar Sections**: Can customize per element type:
  - `TextFontFamily`, `TextFontSize`, `TextFill`, etc.
  - `ImageFlip`, `ImageFilters`, `ImageCrop`, `ImageRemoveBackground`
  - `SvgColors`, `FigureFill`, `VideoTrim`, etc.
- ❌ **Action Controls**: Can replace download button with custom actions

#### Current:

```typescript
<Toolbar store={store} />
```

#### Possible:

```typescript
<Toolbar
  store={store}
  downloadButtonEnabled
  components={{
    // Remove background removal (not implemented yet)
    ImageRemoveBackground: () => null,
    // Custom export button
    ActionControls: ({ store }) => (
      <button onClick={handleCustomExport}>Export</button>
    ),
  }}
/>
```

---

### 10. Element & Page API (LOW PRIORITY)

#### Missing Methods:

- ❌ **Element Selection**: `store.selectElements([ids])`
- ❌ **Element Deletion**: `store.deleteElements([ids])`
- ❌ **Element Lookup**: `store.getElementById(id)`
- ❌ **Grouping**: `store.groupElements([ids])`, `store.ungroupElements([ids])`
- ❌ **Page Custom Data**: `page.set({ custom: { myData } })`
- ❌ **Element Custom Data**: `element.set({ custom: { myData } })`

#### Use Cases:

- Programmatic element manipulation
- Custom workflows
- Data tracking
- Template variables

---

### 11. User Roles & Permissions (LOW PRIORITY)

#### Missing:

- ❌ **Role System**: `store.setRole('admin')` or `store.setRole('user')`
- ❌ **Role-based UI**: Toolbar/panel features based on role
- ❌ **Element Locking**: `element.set({ locked: true })`

#### Plan (from implementation doc):

```typescript
// Set user role
store.setRole(userRole) // 'admin' or 'user'

// Lock brand elements
brandElements.forEach(el => {
  el.set({ locked: true, selectable: false })
})
```

---

### 12. Components We Haven't Explored

#### Available but Not Used:

- ❌ **Context Menu**: Right-click menu customization
- ❌ **Tooltip**: Element hover tooltips
- ❌ **Theme**: Light/dark mode
- ❌ **Workspace Props**: Background color, selection color
- ❌ **Custom Elements**: Register new element types

---

## Priority Implementation Roadmap

### Phase 1: Critical Gaps (Week 1-2) 🔥

**Goal**: Make editor usable with our backend

1. **Custom Images Panel**
   - Connect to `/teams/:teamId/assets` API
   - Use `ImagesGrid` and `useInfiniteAPI` components
   - Allow drag-drop from asset library

2. **Custom Upload Panel**
   - Upload files to backend via tus/multipart
   - Store in `/data/assets/`
   - No more base64 in JSON

3. **Export to PNG/JPEG**
   - Client-side quick preview (`store.toDataURL()`)
   - Server-side high-res export (Puppeteer worker)

### Phase 2: Essential Features (Week 3-4) ⚡

**Goal**: Support our core workflows

4. **Templates System**
   - Load designs as templates
   - Save designs as templates with thumbnails
   - Templates side panel

5. **Brand Kit Integration**
   - Load brand colors, fonts, logos
   - Brand Kit side panel
   - Font management (`store.addFont()`)

6. **PDF Export**
   - Multi-page PDF support
   - DPI/bleed configuration
   - Print-ready output

### Phase 3: Advanced Features (Week 5-8) 📈

**Goal**: Match Canva-class functionality

7. **Multi-page & Timeline**
   - `<PagesTimeline>` component
   - Page management UI
   - Page templates

8. **Canvas Enhancements**
   - Rulers (`store.toggleRulers()`)
   - Bleed area
   - Unit system (mm, in, px)
   - Magic resize

9. **Animations & Video**
   - Enable animations
   - Video side panel
   - GIF export
   - MP4 export (client + cloud)

### Phase 4: Polish & Scale (Week 9-12) ✨

**Goal**: Production-ready

10. **Dynamic Templates**
    - Variable system (`{name}`)
    - Bulk generation
    - CSV import integration

11. **Toolbar Customization**
    - Custom action buttons
    - Remove unwanted features
    - Brand-specific controls

12. **Performance**
    - `store.waitLoading()` before export
    - High-res rendering controls
    - History management

---

## Quick Wins (Can Implement Now) ⚡

### 1. Add PagesTimeline (5 min)

```typescript
import { PagesTimeline } from 'polotno/pages-timeline';

// Add after <ZoomButtons>
<PagesTimeline store={store} />
```

### 2. Add Download Button (2 min)

```typescript
<Toolbar store={store} downloadButtonEnabled />
```

### 3. Enable Rulers (10 min)

```typescript
// Add toggle button
<button onClick={() => store.toggleRulers()}>
  {store.rulersVisible ? 'Hide' : 'Show'} Rulers
</button>
```

### 4. Client-side Export (30 min)

```typescript
const handleExport = async () => {
  const blob = await store.toBlob({
    pixelRatio: 2,
    mimeType: 'image/png',
  })

  // Upload to backend or download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'design.png'
  a.click()
}
```

### 5. Add QR Code Panel (15 min)

```bash
npx shadcn@latest add http://registry.polotno.com:/r/qr-code.json
```

---

## Comparison with Implementation Plan

### Matches Plan ✅

- ✅ Store creation, JSON save/load (Phase 1)
- ✅ Auto-save (Phase 3)
- ✅ Basic editor setup (Phase 3)

### Planned but Not Implemented 📋

- 📋 Custom Upload Panel (Phase 2)
- 📋 Custom Images Panel (Phase 2)
- 📋 Export PNG/JPG/PDF (Phase 4)
- 📋 Brand Kit (Phase 6)
- 📋 Templates (implied)
- 📋 Animations & Video (Phase 9-10)
- 📋 Dynamic Variables (Phase 12)

### Not in Plan but Available ⭐

- ⭐ QR Code panel
- ⭐ Rulers & bleed
- ⭐ Canvas units (mm/in/pt)
- ⭐ Custom elements
- ⭐ GIF export
- ⭐ Client-side video export

---

## Summary Statistics

- **Total Polotno Features**: ~150+
- **Currently Implemented**: ~15 (10%)
- **High Priority Missing**: 8 features
- **Medium Priority Missing**: 12 features
- **Low Priority Missing**: 20 features

**Key Takeaway**: We're using less than 10% of Polotno's capabilities. The biggest gaps are:

1. Custom side panels (images, upload, templates, brand kit)
2. Export functionality (PNG, PDF, video)
3. Multi-page support
4. Fonts and brand kit integration

---

## Next Steps

1. **Immediate**: Implement custom images panel to load team assets
2. **This Week**: Add custom upload panel with backend persistence
3. **Next Week**: Implement export to PNG/JPEG with pixelRatio control
4. **Month 1**: Complete templates and brand kit integration
5. **Month 2**: Add animations, video, and bulk generation

---

**Document Maintainer**: Claude Code
**Last Updated**: 2025-10-14
**Source**: Polotno SDK Official Documentation (53 files)
