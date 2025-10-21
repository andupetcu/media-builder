# PSD to Polotno Converter - Implementation Guide

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Installation Instructions](#installation-instructions)
4. [Dependencies](#dependencies)
5. [Usage](#usage)
6. [Configuration Options](#configuration-options)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Overview

This converter script transforms Adobe Photoshop (PSD) files into Polotno-compatible JSON templates, extracting individual layers as PNG images with alpha transparency.

**Key Features:**

- Extracts individual PSD layers as separate images
- Preserves layer positioning and dimensions
- Maintains alpha transparency
- Generates Polotno-compatible JSON template
- Creates flattened composite preview
- Supports large PSD files (tested with 848MB file)

---

## System Requirements

### Operating System

- **macOS** (tested on macOS Sonoma 14.5)
- **Linux** (Ubuntu 20.04+, Debian 11+)
- **Windows** (with WSL2 or native ImageMagick)

### Software Requirements

- **Node.js**: v14.0.0 or higher (v18+ recommended)
- **npm**: v6.0.0 or higher
- **ImageMagick**: v7.0.0 or higher (v7.1+ recommended)

### Hardware Recommendations

- **RAM**: 8GB minimum (16GB+ for large PSD files)
- **Storage**: 2-3x the size of your PSD file
- **CPU**: Multi-core processor recommended for faster processing

---

## Installation Instructions

### Step 1: Install Node.js

#### macOS (using Homebrew)

```bash
brew install node
```

#### macOS (using official installer)

Download from: https://nodejs.org/

#### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Verify Installation

```bash
node --version  # Should show v14.0.0 or higher
npm --version   # Should show v6.0.0 or higher
```

---

### Step 2: Install ImageMagick 7

#### macOS (using Homebrew)

```bash
brew install imagemagick
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y imagemagick
```

#### Linux (compile from source for latest version)

```bash
# Install dependencies
sudo apt-get install -y build-essential pkg-config libpng-dev libjpeg-dev

# Download and compile ImageMagick
wget https://imagemagick.org/archive/ImageMagick.tar.gz
tar xvzf ImageMagick.tar.gz
cd ImageMagick-7.*
./configure
make
sudo make install
sudo ldconfig /usr/local/lib
```

#### Windows

Download installer from: https://imagemagick.org/script/download.php#windows

Or use Chocolatey:

```powershell
choco install imagemagick
```

#### Verify Installation

```bash
magick --version  # Should show ImageMagick 7.x.x
identify --version
```

**Important for macOS users:**
If you see warnings about deprecated `convert` command, ensure you're using `magick` instead. The script uses the modern `magick` command.

---

### Step 3: Set Up Project

#### Create Project Directory

```bash
mkdir psd-converter
cd psd-converter
```

#### Initialize npm Project

```bash
npm init -y
```

#### Install Node Dependencies

```bash
npm install
```

This will install:

- `psd@^3.2.0` - PSD parsing library (fallback option)
- `@webtoon/psd@^0.4.0` - Alternative PSD library
- `sharp@^0.33.0` - Image processing (optional, for advanced features)

---

### Step 4: Copy Converter Script

Copy the `psd-imagemagick-fixed.js` file to your project directory:

```bash
# If you have the file
cp /path/to/psd-imagemagick-fixed.js .

# Or create it manually (see script content below)
```

---

## Dependencies

### Node.js Dependencies

#### package.json

```json
{
  "name": "psd-to-polotno-converter",
  "version": "1.0.0",
  "description": "Convert PSD files to Polotno JSON format",
  "main": "psd-imagemagick-fixed.js",
  "scripts": {
    "convert": "node psd-imagemagick-fixed.js"
  },
  "dependencies": {
    "psd": "^3.2.0",
    "@webtoon/psd": "^0.4.0",
    "sharp": "^0.33.0"
  },
  "keywords": ["psd", "polotno", "converter", "imagemagick"],
  "author": "",
  "license": "MIT"
}
```

### System Dependencies

#### ImageMagick 7+

**Required commands:**

- `magick` - Main ImageMagick command
- `identify` - Get image information

**Required features:**

- PNG support (libpng)
- PSD/Photoshop support
- Alpha channel support

**Verify features:**

```bash
magick identify -list format | grep -i psd
# Should show: PSD  PSD       rw+   Adobe Photoshop bitmap
```

---

## Usage

### Basic Usage

1. **Place your PSD file** in the project directory:

```bash
cp /path/to/your-file.psd .
```

2. **Edit the script** to point to your PSD file:

```javascript
// At the bottom of psd-imagemagick-fixed.js
const psdFile = './your-file.psd' // Change this
const outputDir = './output'
```

3. **Run the converter:**

```bash
node psd-imagemagick-fixed.js
```

### Advanced Usage

#### Convert with Custom Layer Limit

```javascript
convertPSDWithImageMagick(psdFile, outputDir, 50) // Extract up to 50 layers
```

#### Convert Multiple Files

```javascript
const files = ['file1.psd', 'file2.psd', 'file3.psd']

async function convertAll() {
  for (const file of files) {
    const outputDir = `./output/${path.basename(file, '.psd')}`
    await convertPSDWithImageMagick(file, outputDir, 20)
  }
}

convertAll()
```

#### Use as Module

```javascript
// In your own script
const { convertPSDWithImageMagick } = require('./psd-imagemagick-fixed.js')

async function myConverter() {
  const result = await convertPSDWithImageMagick('./my-design.psd', './my-output', 30)

  console.log('Template:', result.template)
  console.log('JSON Path:', result.jsonPath)
  console.log('Assets:', result.assetsDir)
}
```

---

## Configuration Options

### Function Parameters

```javascript
convertPSDWithImageMagick(psdPath, outputDir, maxLayers)
```

| Parameter   | Type   | Default  | Description                         |
| ----------- | ------ | -------- | ----------------------------------- |
| `psdPath`   | string | required | Path to input PSD file              |
| `outputDir` | string | required | Directory for output files          |
| `maxLayers` | number | `20`     | Maximum number of layers to extract |

### Customizing Template Output

Edit the template structure in the script:

```javascript
const template = {
  name: path.basename(psdPath, '.psd'),
  description: 'Your custom description',
  width: width,
  height: height,
  tags: ['custom', 'tags', 'here'], // Customize tags
  isPublic: false, // Set to true for public templates
  doc: {
    width: width,
    height: height,
    pages: [
      {
        id: `page-${crypto.randomBytes(8).toString('hex')}`,
        width: width,
        height: height,
        background: '#FFFFFF', // Change background color
        children: layers.reverse(),
      },
    ],
  },
  thumbnail: '/assets/composite.png',
}
```

### Output Structure

```
output/
├── polotno-template.json    # Main template file
└── assets/
    ├── composite.png        # Flattened preview
    ├── layer_0.png          # Individual layers
    ├── layer_1.png
    ├── layer_2.png
    └── ...
```

---

## Troubleshooting

### Common Issues

#### 1. "Command not found: magick"

**Solution:**

```bash
# Verify ImageMagick is installed
which magick

# If not found, install ImageMagick
brew install imagemagick  # macOS
# or
sudo apt-get install imagemagick  # Linux
```

#### 2. "invalid image index" Error

**Cause:** Trying to extract more layers than exist in PSD

**Solution:** The script automatically detects this and stops. If you want to extract fewer layers:

```javascript
convertPSDWithImageMagick(psdFile, outputDir, 10) // Reduce to 10
```

#### 3. Large PSD Files Hang or Crash

**Solution:**

```bash
# Increase Node.js memory limit
node --max-old-space-size=8192 psd-imagemagick-fixed.js

# Or add to package.json scripts:
"scripts": {
  "convert": "node --max-old-space-size=8192 psd-imagemagick-fixed.js"
}
```

#### 4. "Permission denied" Errors

**Solution:**

```bash
# Make sure output directory is writable
chmod +w output/

# Or run with sudo (not recommended)
sudo node psd-imagemagick-fixed.js
```

#### 5. Layers Have Wrong Positions

**Cause:** Negative positions from PSD are clamped to 0

**Solution:** Edit the layer position handling:

```javascript
// In the script, find this section and modify:
layers.push({
  // ...
  x: x, // Remove clamping: x < 0 ? 0 : x
  y: y, // Remove clamping: y < 0 ? 0 : y
  // ...
})
```

#### 6. CMYK Color Issues

**Cause:** PSD uses CMYK, output is RGB

**Solution:** ImageMagick automatically converts. For more control:

```bash
# Add color profile conversion in the script
magick "${psdPath}[${i}]" -colorspace RGB -background none -alpha on "${layerPath}"
```

---

## API Reference

### Main Function

#### `convertPSDWithImageMagick(psdPath, outputDir, maxLayers)`

Converts a PSD file to Polotno template format.

**Parameters:**

- `psdPath` (string): Path to the PSD file
- `outputDir` (string): Directory for output files
- `maxLayers` (number, optional): Maximum layers to extract (default: 20)

**Returns:**
Promise that resolves to:

```javascript
{
  template: Object,      // Polotno template object
  jsonPath: string,      // Path to saved JSON file
  assetsDir: string      // Path to assets directory
}
```

**Example:**

```javascript
const result = await convertPSDWithImageMagick('./my-design.psd', './output', 30)

console.log(result.template.name) // "my-design"
console.log(result.jsonPath) // "./output/polotno-template.json"
```

### Template Object Structure

```javascript
{
  name: string,              // Template name (from filename)
  description: string,       // Template description
  width: number,            // Canvas width in pixels
  height: number,           // Canvas height in pixels
  tags: string[],           // Array of tags
  isPublic: boolean,        // Public visibility flag
  doc: {
    width: number,
    height: number,
    pages: [
      {
        id: string,         // Unique page ID
        width: number,
        height: number,
        background: string, // Background color (hex)
        children: [         // Array of layer objects
          {
            id: string,           // Unique layer ID
            type: 'image',        // Layer type
            name: string,         // Layer name
            src: string,          // Image path
            x: number,            // X position
            y: number,            // Y position
            width: number,        // Layer width
            height: number,       // Layer height
            opacity: number,      // Opacity (0-1)
            visible: boolean,     // Visibility flag
            selectable: boolean,  // Selectable in editor
            draggable: boolean    // Draggable in editor
          }
        ]
      }
    ]
  },
  thumbnail: string         // Thumbnail path
}
```

---

## Performance Tips

### 1. Optimize for Large Files

```bash
# Use environment variables
export NODE_OPTIONS="--max-old-space-size=8192"
node psd-imagemagick-fixed.js
```

### 2. Parallel Processing

For multiple files, process in parallel:

```javascript
const files = ['file1.psd', 'file2.psd', 'file3.psd']

Promise.all(files.map(file => convertPSDWithImageMagick(file, `./output/${file}`, 20))).then(
  results => {
    console.log('All conversions complete!')
  }
)
```

### 3. Limit Layer Count

Only extract layers you need:

```javascript
// Extract only first 10 layers
convertPSDWithImageMagick(psdFile, outputDir, 10)
```

### 4. Optimize Output Images

Add compression to the ImageMagick command:

```javascript
// In the script, modify the magick command:
await execAsync(`magick "${psdPath}[${i}]" -background none -alpha on -quality 85 "${layerPath}"`)
```

---

## Integration Examples

### Web Application

```javascript
const express = require('express')
const multer = require('multer')
const { convertPSDWithImageMagick } = require('./psd-imagemagick-fixed')

const app = express()
const upload = multer({ dest: 'uploads/' })

app.post('/convert', upload.single('psd'), async (req, res) => {
  try {
    const result = await convertPSDWithImageMagick(
      req.file.path,
      `./output/${req.file.filename}`,
      20
    )

    res.json({
      success: true,
      template: result.template,
      jsonPath: result.jsonPath,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.listen(3000)
```

### CLI Tool

```javascript
#!/usr/bin/env node
const { program } = require('commander')
const { convertPSDWithImageMagick } = require('./psd-imagemagick-fixed')

program
  .version('1.0.0')
  .argument('<psd-file>', 'PSD file to convert')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-l, --layers <number>', 'Max layers to extract', '20')
  .action(async (psdFile, options) => {
    const result = await convertPSDWithImageMagick(
      psdFile,
      options.output,
      parseInt(options.layers)
    )
    console.log('✅ Conversion complete!')
    console.log('Template:', result.jsonPath)
  })

program.parse()
```

---

## Support and Resources

### ImageMagick Documentation

- Official site: https://imagemagick.org/
- PSD support: https://imagemagick.org/script/formats.php#PSD
- Command-line tools: https://imagemagick.org/script/command-line-tools.php

### Node.js Libraries

- psd.js: https://github.com/meltingice/psd.js
- @webtoon/psd: https://github.com/webtoon/psd

### Polotno Documentation

- Template format: https://polotno.com/docs/template-format
- API reference: https://polotno.com/docs/api

---

## License

This implementation guide and converter script are provided as-is for use with Polotno templates.

---

**Last Updated:** October 2025
**Version:** 1.0.0
**Tested With:** ImageMagick 7.1.0, Node.js 18.x, macOS Sonoma 14.5
