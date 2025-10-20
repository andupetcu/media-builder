# Export Design Templates - API Usage Examples

This document shows how to export existing design templates in JSON format using the new API endpoints.

## API Endpoints

### 1. Export Single Design as Template

```http
GET /teams/{teamId}/designs/{designId}/export/template
```

**Response:**

```json
{
  "name": "My Design",
  "description": "Template created from design: My Design",
  "width": 1920,
  "height": 1080,
  "unit": "px",
  "doc": {
    "pages": [
      {
        "id": "page1",
        "children": [
          {
            "id": "text-1",
            "type": "text",
            "x": 100,
            "y": 100,
            "text": "Hello {name}",
            "fontSize": 48,
            "fontFamily": "Inter"
          }
        ]
      }
    ]
  },
  "metadata": {
    "originalDesignId": "design_123",
    "createdAt": "2025-10-16T10:00:00Z",
    "updatedAt": "2025-10-16T12:00:00Z",
    "createdBy": "John Doe",
    "version": "1.0.0",
    "tags": []
  }
}
```

### 2. Get Design JSON Only

```http
GET /teams/{teamId}/designs/{designId}/export/json
```

**Response:**

```json
{
  "pages": [
    {
      "id": "page1",
      "children": [
        {
          "id": "text-1",
          "type": "text",
          "x": 100,
          "y": 100,
          "text": "Hello {name}",
          "fontSize": 48,
          "fontFamily": "Inter"
        }
      ]
    }
  ]
}
```

### 3. Export Multiple Designs as Templates

```http
POST /teams/{teamId}/designs/export/templates
Content-Type: application/json

{
  "designIds": ["design_123", "design_456"]  // Optional: if not provided, exports all designs
}
```

**Response:**

```json
{
  "templates": [
    {
      "name": "Design 1",
      "description": "Template created from design: Design 1",
      "width": 1920,
      "height": 1080,
      "unit": "px",
      "doc": { ... },
      "metadata": { ... }
    },
    {
      "name": "Design 2",
      "description": "Template created from design: Design 2",
      "width": 1920,
      "height": 1080,
      "unit": "px",
      "doc": { ... },
      "metadata": { ... }
    }
  ],
  "count": 2,
  "exportedAt": "2025-10-16T12:00:00Z"
}
```

## JavaScript/TypeScript Usage Examples

### Using fetch API

```javascript
// Export single design as template
async function exportSingleTemplate(teamId, designId) {
  const response = await fetch(`/api/teams/${teamId}/designs/${designId}/export/template`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const template = await response.json()

  // Save to file
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`
  a.click()
}

// Export all team templates
async function exportAllTemplates(teamId) {
  const response = await fetch(`/api/teams/${teamId}/designs/export/templates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}), // Empty body exports all designs
  })

  const data = await response.json()

  // Save to file
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `templates_${teamId}_${new Date().toISOString().split('T')[0]}.json`
  a.click()
}

// Export specific designs
async function exportSelectedTemplates(teamId, designIds) {
  const response = await fetch(`/api/teams/${teamId}/designs/export/templates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ designIds }),
  })

  const data = await response.json()
  return data
}
```

### Using axios

```javascript
import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

// Export single template
async function exportTemplate(teamId, designId) {
  try {
    const { data } = await apiClient.get(`/teams/${teamId}/designs/${designId}/export/template`)
    return data
  } catch (error) {
    console.error('Export failed:', error)
    throw error
  }
}

// Export multiple templates
async function exportMultipleTemplates(teamId, designIds = []) {
  try {
    const { data } = await apiClient.post(`/teams/${teamId}/designs/export/templates`, {
      designIds: designIds.length > 0 ? designIds : undefined,
    })
    return data
  } catch (error) {
    console.error('Bulk export failed:', error)
    throw error
  }
}
```

## CLI Usage

### Using the Node.js script

```bash
# Export all templates for a team
node scripts/export-templates.js --team-id=team_123

# Export to specific directory
node scripts/export-templates.js --team-id=team_123 --output-dir=./my-templates

# Export as individual files
node scripts/export-templates.js --team-id=team_123 --format=individual

# Export as single JSON file (default)
node scripts/export-templates.js --team-id=team_123 --format=json
```

### Using curl

```bash
# Export single template
curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "https://your-api.com/api/teams/team_123/designs/design_456/export/template" \
     > template.json

# Export all templates
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}' \
     "https://your-api.com/api/teams/team_123/designs/export/templates" \
     > all-templates.json

# Export specific templates
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"designIds": ["design_123", "design_456"]}' \
     "https://your-api.com/api/teams/team_123/designs/export/templates" \
     > selected-templates.json
```

## Template JSON Structure

Each exported template follows this structure:

```typescript
interface TemplateExport {
  name: string // Original design name
  description: string // Auto-generated description
  width: number // Canvas width
  height: number // Canvas height
  unit: string // Unit type (px, mm, in, etc.)
  doc: any // Full Polotno design JSON
  metadata: {
    originalDesignId: string // Reference to original design
    createdAt: Date // Original creation date
    updatedAt: Date // Last update date
    createdBy: string // Creator name
    version: string // Template version
    tags: string[] // Tags (empty by default)
  }
}
```

## Importing Templates

To use exported templates in your application:

```javascript
// Load template from JSON
async function loadTemplate(templateJson) {
  const template = typeof templateJson === 'string' ? JSON.parse(templateJson) : templateJson

  // Create new design from template
  const newDesign = await apiClient.post('/teams/team_123/designs', {
    name: `Copy of ${template.name}`,
    width: template.width,
    height: template.height,
    unit: template.unit,
    doc: template.doc,
  })

  return newDesign.data
}

// Load template in Polotno editor
function loadTemplateInEditor(store, template) {
  // Set canvas dimensions
  store.setSize(template.width, template.height, template.unit)

  // Load the design JSON
  store.loadJSON(template.doc)
}
```

## Error Handling

```javascript
async function safeExportTemplate(teamId, designId) {
  try {
    const template = await exportTemplate(teamId, designId)
    return { success: true, data: template }
  } catch (error) {
    if (error.response?.status === 404) {
      return { success: false, error: 'Design not found' }
    } else if (error.response?.status === 403) {
      return { success: false, error: 'Access denied' }
    } else {
      return { success: false, error: 'Export failed' }
    }
  }
}
```

This provides a comprehensive way to export your existing design templates in JSON format for backup, sharing, or migration purposes.
