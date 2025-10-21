# Template JSON Structure Documentation

This document describes the exact JSON structure expected by the Media Builder templates system.

## Table of Contents

1. [Template Request Format](#template-request-format)
2. [Polotno Document Structure](#polotno-document-structure)
3. [Complete Example](#complete-example)
4. [Element Types Reference](#element-types-reference)
5. [API Usage](#api-usage)

---

## Template Request Format

When creating a template via the API, you need to provide the following structure:

### Required Fields

```typescript
{
  name: string // Template name (required)
  doc: object // Polotno JSON document (required)
  width: number // Canvas width in pixels (required)
  height: number // Canvas height in pixels (required)
}
```

### Optional Fields

```typescript
{
  description?: string   // Template description
  thumbnail?: string     // URL to thumbnail image
  tags?: string[]        // Array of tags for categorization
  isPublic?: boolean     // Whether template is shared publicly (default: false)
}
```

### Database Schema

The Template model in the database includes these additional fields (auto-generated):

```typescript
{
  id: string // Auto-generated CUID
  teamId: string // Team owner ID
  createdBy: string // User ID who created the template
  createdAt: Date // Creation timestamp
  updatedAt: Date // Last update timestamp
}
```

---

## Polotno Document Structure

The `doc` field contains the Polotno editor JSON structure. This is what Polotno uses to render the design.

### Basic Structure

```typescript
{
  "width": number,       // Canvas width (must match template width)
  "height": number,      // Canvas height (must match template height)
  "pages": [             // Array of pages
    {
      "id": string,      // Unique page ID
      "width"?: number,  // Page width (optional, inherits from root)
      "height"?: number, // Page height (optional, inherits from root)
      "background"?: string,  // Background color (hex, e.g., "#ffffff")
      "bleed"?: number,  // Bleed area in pixels
      "children": [      // Array of elements on this page
        // Element objects (see Element Types Reference)
      ]
    }
  ]
}
```

### Page Properties

Each page can have these properties:

```typescript
{
  id: string             // Required: unique identifier
  width?: number         // Optional: page width (inherits from doc if not set)
  height?: number        // Optional: page height (inherits from doc if not set)
  background?: string    // Optional: background color (hex/rgba)
  bleed?: number         // Optional: bleed area in pixels
  children: Element[]    // Required: array of elements
}
```

---

## Element Types Reference

All elements share common properties, with type-specific properties.

### Common Element Properties

```typescript
{
  id: string             // Unique element ID
  type: string           // Element type (text, image, svg, line, etc.)
  x: number              // X position in pixels
  y: number              // Y position in pixels
  width?: number         // Width in pixels
  height?: number        // Height in pixels
  rotation?: number      // Rotation in degrees
  opacity?: number       // Opacity (0-1)
  selectable?: boolean   // Whether element can be selected
  draggable?: boolean    // Whether element can be dragged
  locked?: boolean       // Whether element is locked from editing
  visible?: boolean      // Whether element is visible
}
```

### Text Element

```typescript
{
  type: "text",
  id: string,
  x: number,
  y: number,
  width?: number,
  height?: number,
  text: string,               // Text content (supports variables like {name})
  fontSize: number,           // Font size in pixels
  fontFamily?: string,        // Font family name (default: "Inter")
  fontStyle?: string,         // "normal" | "italic"
  fontWeight?: string,        // "normal" | "bold" | "100"-"900"
  fill?: string,              // Text color (hex/rgba)
  align?: string,             // "left" | "center" | "right"
  verticalAlign?: string,     // "top" | "middle" | "bottom"
  underline?: boolean,        // Underline text
  lineThrough?: boolean,      // Strike-through text
  lineHeight?: number,        // Line height multiplier
  letterSpacing?: number,     // Letter spacing in pixels
  textDecoration?: string,    // CSS text-decoration value
}
```

### Image Element

```typescript
{
  type: "image",
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  src: string,                // Image URL (http/https or data URL)
  cropX?: number,             // Crop X position (0-1)
  cropY?: number,             // Crop Y position (0-1)
  cropWidth?: number,         // Crop width (0-1)
  cropHeight?: number,        // Crop height (0-1)
  brightness?: number,        // Brightness adjustment (-1 to 1)
  contrast?: number,          // Contrast adjustment (-100 to 100)
  saturation?: number,        // Saturation adjustment (-2 to 10)
  blur?: number,              // Blur amount (0-40)
  filters?: object,           // Advanced filters
}
```

### SVG Element

```typescript
{
  type: "svg",
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  src: string,                // SVG URL or data URL
  fill?: string,              // Fill color for colorizable SVGs
  keepRatio?: boolean,        // Maintain aspect ratio
}
```

### Shape Elements

Basic shapes (rectangle, circle, line, etc.):

```typescript
{
  type: "rect" | "circle" | "line" | "star" | "triangle",
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill?: string,              // Fill color
  stroke?: string,            // Border color
  strokeWidth?: number,       // Border width
  cornerRadius?: number,      // Corner radius (rect only)
  points?: number,            // Number of points (star only)
}
```

### Group Element

Groups allow nesting multiple elements:

```typescript
{
  type: "group",
  id: string,
  x: number,
  y: number,
  width?: number,
  height?: number,
  children: Element[],        // Nested elements
}
```

---

## Complete Example

Here's a complete template JSON with all required fields:

```json
{
  "name": "Social Media Post Template",
  "description": "Instagram post template with customizable text and image",
  "width": 1080,
  "height": 1080,
  "tags": ["social-media", "instagram", "marketing"],
  "isPublic": false,
  "doc": {
    "width": 1080,
    "height": 1080,
    "pages": [
      {
        "id": "page-1",
        "background": "#ffffff",
        "children": [
          {
            "type": "rect",
            "id": "background-rect",
            "x": 0,
            "y": 0,
            "width": 1080,
            "height": 1080,
            "fill": "#f0f0f0",
            "selectable": false,
            "locked": true
          },
          {
            "type": "image",
            "id": "main-image",
            "x": 90,
            "y": 90,
            "width": 900,
            "height": 600,
            "src": "https://example.com/placeholder.jpg"
          },
          {
            "type": "text",
            "id": "title-text",
            "x": 90,
            "y": 720,
            "width": 900,
            "text": "{title}",
            "fontSize": 64,
            "fontFamily": "Inter",
            "fontWeight": "bold",
            "fill": "#000000",
            "align": "center"
          },
          {
            "type": "text",
            "id": "subtitle-text",
            "x": 90,
            "y": 820,
            "width": 900,
            "text": "{subtitle}",
            "fontSize": 32,
            "fontFamily": "Inter",
            "fill": "#666666",
            "align": "center"
          }
        ]
      }
    ]
  }
}
```

---

## API Usage

### Create Template

```bash
POST /api/teams/{teamId}/templates
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN
```

**Request Body:**

```json
{
  "name": "My Template",
  "description": "Template description",
  "width": 1920,
  "height": 1080,
  "tags": ["social", "instagram"],
  "isPublic": false,
  "doc": {
    "width": 1920,
    "height": 1080,
    "pages": [
      {
        "id": "page1",
        "children": [
          {
            "type": "text",
            "id": "text-1",
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
}
```

**Response:**

```json
{
  "id": "cm1abc123def456",
  "teamId": "team_123",
  "createdBy": "user_456",
  "name": "My Template",
  "description": "Template description",
  "doc": { ... },
  "thumbnail": null,
  "width": 1920,
  "height": 1080,
  "tags": ["social", "instagram"],
  "isPublic": false,
  "createdAt": "2025-10-20T12:00:00.000Z",
  "updatedAt": "2025-10-20T12:00:00.000Z",
  "createdByUser": {
    "id": "user_456",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Update Template

```bash
PATCH /api/teams/{teamId}/templates/{templateId}
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN
```

**Request Body (all fields optional):**

```json
{
  "name": "Updated Template Name",
  "description": "Updated description",
  "doc": { ... },
  "thumbnail": "https://example.com/new-thumbnail.jpg",
  "tags": ["updated", "tags"],
  "isPublic": true
}
```

### Get Template JSON

```bash
GET /api/teams/{teamId}/templates/{templateId}/json
Authorization: Bearer YOUR_TOKEN
```

**Response (doc field only):**

```json
{
  "width": 1920,
  "height": 1080,
  "pages": [ ... ]
}
```

### List Templates

```bash
GET /api/teams/{teamId}/templates?query=search&page=1&per_page=30&sizeQuery=width=1920&height=1080
Authorization: Bearer YOUR_TOKEN
```

**Response:**

```json
{
  "items": [ ... ],
  "total": 42,
  "page": 1,
  "perPage": 30,
  "totalPages": 2
}
```

### Delete Template

```bash
DELETE /api/teams/{teamId}/templates/{templateId}
Authorization: Bearer YOUR_TOKEN
```

---

## Variable Substitution

Templates support variable substitution using the `{variableName}` syntax in text elements.

### Example:

```json
{
  "type": "text",
  "text": "Hello {firstName} {lastName}!",
  "fontSize": 32
}
```

When rendering or exporting with variables:

```json
{
  "variables": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

Result: "Hello John Doe!"

### Supported in:

- Text elements (`text` property)
- Image elements (`src` property for dynamic images)

---

## Tips for Creating Templates

1. **Use Meaningful IDs**: Give elements descriptive IDs like `header-text`, `main-image`, etc.

2. **Lock Background Elements**: Set `locked: true` and `selectable: false` for background elements that shouldn't be edited.

3. **Variable Naming**: Use clear variable names like `{companyName}`, `{productPrice}`, `{customerName}`.

4. **Consistent Sizing**: Ensure `doc.width` and `doc.height` match the template's `width` and `height` fields.

5. **Thumbnail Generation**: While optional, providing a thumbnail URL improves UX in template selection.

6. **Tags for Organization**: Use tags to categorize templates (e.g., "social-media", "print", "email").

7. **Test Variables**: If using variables, test with sample data to ensure proper layout.

---

## Validation Rules

The API validates templates with these rules:

1. **Required Fields**: `name`, `doc`, `width`, `height` must be present
2. **Name**: Must be a non-empty string
3. **Width/Height**: Must be positive integers
4. **Tags**: Must be an array of strings (if provided)
5. **isPublic**: Must be a boolean (if provided)
6. **Doc**: Must be a valid object (Polotno JSON)

---

## Troubleshooting

### Common Issues

**Template not loading:**

- Ensure `doc.width` matches template `width`
- Ensure `doc.height` matches template `height`
- Check all element IDs are unique

**Images not displaying:**

- Use absolute URLs (http/https)
- Ensure CORS is enabled for image sources
- Consider using data URLs for embedded images

**Text formatting issues:**

- Verify font family is available
- Check fontSize is a valid positive number
- Ensure color values are valid (hex or rgba)

**Variable substitution not working:**

- Use curly braces: `{variableName}` not `$variableName`
- Variable names are case-sensitive
- Variables only work in text and image src fields

---

## Additional Resources

- [Polotno Store Documentation](./polotno-docs/Store-20251014-005315.md)
- [Export Templates API](./examples/export-templates-api.md)
- [Variables and Batch Generation](./VARIABLES_AND_BATCH_GENERATION.md)
- API Reference: [templates.controller.ts](./apps/api/src/templates/templates.controller.ts)
- DTOs: [create-template.dto.ts](./apps/api/src/templates/dto/create-template.dto.ts)
