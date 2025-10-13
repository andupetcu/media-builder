# Phase 3 Implementation Guide: Polotno Editor Integration

## Status: API Complete, Frontend Implementation Guide Provided

## Polotno Credentials
- **API Key**: `WtWR19i4P14e_UK7eUUE`
- **Domain**: `https://builder.footprints.media`
- **Environment variables set**: `.env.example` and `apps/web/.env.local.example`

## ✅ Completed (API Backend)

### 1. Design CRUD Endpoints
**Location**: `apps/api/src/designs/`

All design management endpoints are implemented:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teams/:teamId/designs` | List designs (supports ?status= filter) |
| GET | `/teams/:teamId/designs/:id` | Get design with versions |
| POST | `/teams/:teamId/designs` | Create new design |
| PUT | `/teams/:teamId/designs/:id` | Update design (name, status, doc, thumbnail) |
| DELETE | `/teams/:teamId/designs/:id` | Delete design |
| POST | `/teams/:teamId/designs/:id/versions` | Save version snapshot |
| GET | `/teams/:teamId/designs/:id/versions` | List versions |
| POST | `/teams/:teamId/designs/:id/versions/:versionId/restore` | Restore version |

### 2. Design Service Features
- Create design with default blank page
- Update design doc (Polotno JSON)
- Status management (DRAFT, IN_REVIEW, APPROVED, ARCHIVED)
- Version snapshots with optional labels
- Version restore functionality
- Automatic slug generation

## 🔧 Frontend Implementation (To Be Done)

### Required Files Structure

```
apps/web/src/
├── lib/
│   ├── api-client.ts          # Axios client with auth
│   └── auth-store.ts          # Auth state management
├── components/
│   ├── editor/
│   │   ├── PolotnoEditor.tsx  # Main editor component
│   │   ├── Toolbar.tsx        # Custom toolbar
│   │   ├── AssetPanel.tsx     # Asset picker
│   │   └── VersionPanel.tsx   # Version management
│   └── ui/
│       └── ...                # UI components
└── app/
    ├── (auth)/
    │   ├── login/
    │   └── register/
    └── (dashboard)/
        ├── designs/
        │   └── page.tsx       # Design list
        └── editor/
            └── [id]/
                └── page.tsx   # Editor page
```

### 1. API Client (`apps/web/src/lib/api-client.ts`)

```typescript
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token refresh on 401
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          })
          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)

          // Retry original request
          error.config.headers.Authorization = `Bearer ${data.accessToken}`
          return axios(error.config)
        } catch {
          // Refresh failed, redirect to login
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Design API
export const designsApi = {
  list: (teamId: string, status?: string) =>
    apiClient.get(`/teams/${teamId}/designs`, { params: { status } }),

  get: (teamId: string, id: string) =>
    apiClient.get(`/teams/${teamId}/designs/${id}`),

  create: (teamId: string, data: { name: string; width?: number; height?: number }) =>
    apiClient.post(`/teams/${teamId}/designs`, data),

  update: (teamId: string, id: string, data: any) =>
    apiClient.put(`/teams/${teamId}/designs/${id}`, data),

  delete: (teamId: string, id: string) =>
    apiClient.delete(`/teams/${teamId}/designs/${id}`),

  saveVersion: (teamId: string, id: string, label?: string) =>
    apiClient.post(`/teams/${teamId}/designs/${id}/versions`, { label }),

  getVersions: (teamId: string, id: string) =>
    apiClient.get(`/teams/${teamId}/designs/${id}/versions`),

  restoreVersion: (teamId: string, id: string, versionId: string) =>
    apiClient.post(`/teams/${teamId}/designs/${id}/versions/${versionId}/restore`),
}

// Assets API
export const assetsApi = {
  list: (teamId: string, kind?: string) =>
    apiClient.get(`/teams/${teamId}/assets`, { params: { kind } }),

  upload: (teamId: string, file: File, tags?: string[]) => {
    const formData = new FormData()
    formData.append('file', file)
    if (tags) {
      tags.forEach(tag => formData.append('tags', tag))
    }
    return apiClient.post(`/teams/${teamId}/uploads`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
```

### 2. Polotno Editor Component (`apps/web/src/components/editor/PolotnoEditor.tsx`)

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno'
import { Toolbar } from 'polotno/toolbar/toolbar'
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons'
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel'
import { Workspace } from 'polotno/canvas/workspace'
import { createStore } from 'polotno/model/store'
import { setTranslations } from 'polotno/config'
import { designsApi } from '@/lib/api-client'

// Configure Polotno
setTranslations({
  // Customize labels as needed
})

interface PolotnoEditorProps {
  designId: string
  teamId: string
  initialDoc?: any
}

export const PolotnoEditor = observer(({ designId, teamId, initialDoc }: PolotnoEditorProps) => {
  const [store] = useState(() => createStore({
    key: process.env.NEXT_PUBLIC_POLOTNO_KEY,
    showCredit: false,
  }))

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const autoSaveTimerRef = useRef<NodeJS.Timeout>()
  const lastSavedRef = useRef<string>('')

  // Load initial design
  useEffect(() => {
    if (initialDoc) {
      store.loadJSON(initialDoc)
      lastSavedRef.current = JSON.stringify(initialDoc)
      setLoading(false)
    }
  }, [initialDoc, store])

  // Auto-save every 20 seconds
  useEffect(() => {
    const autoSave = async () => {
      const currentDoc = store.toJSON()
      const currentStr = JSON.stringify(currentDoc)

      // Only save if changed
      if (currentStr !== lastSavedRef.current && !saving) {
        try {
          setSaving(true)
          await designsApi.update(teamId, designId, { doc: currentDoc })
          lastSavedRef.current = currentStr
          console.log('Design auto-saved')
        } catch (error) {
          console.error('Failed to auto-save:', error)
        } finally {
          setSaving(false)
        }
      }
    }

    // Start auto-save timer
    autoSaveTimerRef.current = setInterval(autoSave, 20000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [store, designId, teamId, saving])

  // Manual save
  const handleSave = async () => {
    try {
      setSaving(true)
      const currentDoc = store.toJSON()
      await designsApi.update(teamId, designId, { doc: currentDoc })
      lastSavedRef.current = JSON.stringify(currentDoc)
      alert('Design saved successfully!')
    } catch (error) {
      alert('Failed to save design')
    } finally {
      setSaving(false)
    }
  }

  // Save version snapshot
  const handleSaveVersion = async () => {
    const label = prompt('Enter version label (optional):')
    try {
      await designsApi.saveVersion(teamId, designId, label || undefined)
      alert('Version saved successfully!')
    } catch (error) {
      alert('Failed to save version')
    }
  }

  // Enable snap to grid and smart guides
  useEffect(() => {
    store.setScale(1)
    store.setSize(1920, 1080)
  }, [store])

  if (loading) {
    return <div>Loading editor...</div>
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{ padding: '10px', borderBottom: '1px solid #ccc', display: 'flex', gap: '10px' }}>
        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={handleSaveVersion}>Save Version</button>
        <span style={{ marginLeft: 'auto', color: '#666' }}>
          {saving ? 'Saving...' : 'Saved'}
        </span>
      </div>

      {/* Polotno Editor */}
      <PolotnoContainer style={{ flex: 1 }}>
        <SidePanelWrap>
          <SidePanel store={store} sections={DEFAULT_SECTIONS} />
        </SidePanelWrap>
        <WorkspaceWrap>
          <Toolbar store={store} />
          <Workspace
            store={store}

            // Enable snap features
            snapToObjects={true}
            snapToGrid={true}
            gridSize={10}
          />
          <ZoomButtons store={store} />
        </WorkspaceWrap>
      </PolotnoContainer>
    </div>
  )
})
```

### 3. Editor Page (`apps/web/src/app/(dashboard)/editor/[id]/page.tsx`)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { designsApi } from '@/lib/api-client'
import { PolotnoEditor } from '@/components/editor/PolotnoEditor'

export default function EditorPage() {
  const params = useParams()
  const designId = params.id as string
  const [design, setDesign] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // TODO: Get teamId from auth context/store
  const teamId = 'YOUR_TEAM_ID' // Replace with actual team ID

  useEffect(() => {
    const loadDesign = async () => {
      try {
        const { data } = await designsApi.get(teamId, designId)
        setDesign(data)
      } catch (error) {
        console.error('Failed to load design:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDesign()
  }, [designId, teamId])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!design) {
    return <div>Design not found</div>
  }

  return (
    <PolotnoEditor
      designId={design.id}
      teamId={teamId}
      initialDoc={design.doc}
    />
  )
}
```

### 4. Custom Asset Panel (Optional)

```typescript
import { observer } from 'mobx-react-lite'
import { SectionTab } from 'polotno/side-panel'
import { ImagesGrid } from 'polotno/side-panel/images-grid'
import { assetsApi } from '@/lib/api-client'

export const CustomAssetSection = {
  name: 'my-assets',
  Tab: (props: any) => (
    <SectionTab name="My Assets" {...props}>
      <MdImage />
    </SectionTab>
  ),
  Panel: observer(({ store }: any) => {
    const [assets, setAssets] = useState([])
    const teamId = 'YOUR_TEAM_ID' // Get from context

    useEffect(() => {
      assetsApi.list(teamId, 'IMAGE').then(({ data }) => {
        setAssets(data.map((asset: any) => ({
          url: asset.publicUrl,
          preview: asset.thumbnailUrl,
          width: asset.meta.width,
          height: asset.meta.height,
        })))
      })
    }, [teamId])

    return (
      <div>
        <ImagesGrid
          images={assets}
          getPreview={(image) => image.preview}
          isLoading={false}
          onSelect={async (image, pos) => {
            store.activePage.addElement({
              type: 'image',
              src: image.url,
              ...pos,
            })
          }}
        />
      </div>
    )
  }),
}
```

## Key Features to Implement

### 1. Autosave (20 seconds)
✅ Implemented in `PolotnoEditor` component above
- Uses `setInterval` to save every 20 seconds
- Only saves if document changed
- Shows save status in UI

### 2. Manual Version Snapshots
✅ Implemented via `handleSaveVersion` function
- Prompts for optional label
- Saves via `POST /teams/:teamId/designs/:id/versions`
- Can restore via version panel

### 3. Smart Guides & Snap to Grid
✅ Enabled in Workspace component:
```typescript
<Workspace
  store={store}
  snapToObjects={true}
  snapToGrid={true}
  gridSize={10}
/>
```

### 4. Tidy Up Alignment
Polotno has built-in alignment tools in the toolbar. To add custom "Tidy Up":

```typescript
import { alignElements } from 'polotno/utils/align'

const tidyUp = () => {
  const elements = store.activePage.children

  // Distribute horizontally
  alignElements(elements, 'distribute-horizontal')

  // Or distribute vertically
  alignElements(elements, 'distribute-vertical')

  // Or align to center
  alignElements(elements, 'center-horizontal')
}
```

### 5. Brand Kit Enforcement
To be implemented in Phase 6, but you can start with:

```typescript
// Restrict colors
store.on('change', () => {
  const brandColors = ['#FF0000', '#00FF00', '#0000FF']

  store.activePage.children.forEach(element => {
    if (element.type === 'text' && !brandColors.includes(element.fill)) {
      // Warn user or prevent change
      console.warn('Color not in brand kit')
    }
  })
})
```

## Installation Steps

1. **Install dependencies**:
```bash
cd apps/web
pnpm install
```

2. **Set environment variables**:
```bash
# Copy example
cp .env.local.example .env.local

# Already contains:
# NEXT_PUBLIC_POLOTNO_KEY=WtWR19i4P14e_UK7eUUE
# NEXT_PUBLIC_APP_DOMAIN=https://builder.footprints.media
```

3. **Create the files listed above** in the specified locations

4. **Start development server**:
```bash
pnpm --filter web dev
```

5. **Access editor**:
- Navigate to `/editor/[designId]`
- Replace `YOUR_TEAM_ID` with actual team ID from your auth context

## Testing Checklist

- [ ] Editor loads with Polotno
- [ ] Can add elements (text, images, shapes)
- [ ] Autosave triggers every 20 seconds
- [ ] Manual save works
- [ ] Save version creates snapshot
- [ ] Snap to grid/objects works
- [ ] Can upload assets from asset panel
- [ ] Design persists after refresh

## Next Steps

1. Implement auth context to get teamId
2. Create design list page
3. Add asset picker integration
4. Customize toolbar
5. Add export functionality (Phase 4)

## Reference Links

- Polotno Docs: https://polotno.com/docs
- Polotno GitHub: https://github.com/lavrton/polotno
- API Endpoints: See `apps/api/src/designs/designs.controller.ts`

## Notes

- Polotno key is for domain `https://builder.footprints.media`
- For local development, Polotno should work without domain restriction in dev mode
- All API endpoints are protected by JWT authentication
- Design `doc` field stores Polotno JSON format
