# PSD Import Optimization

This document describes the cleanup and image optimization features implemented for the PSD import system.

## Overview

When importing PSD files, layers can be extremely large (20-40MB+ per layer for high-resolution designs). This optimization system automatically resizes and compresses layer images to web-appropriate dimensions while maintaining quality.

## Cleanup Features

### Automatic File Cleanup

All temporary files are automatically cleaned up after import:

1. **Direct Upload Cleanup** ([templates.controller.ts:127](apps/api/src/templates/templates.controller.ts#L127))
   - Uploaded PSD file deleted immediately after conversion

2. **Chunked Upload Cleanup** ([templates.controller.ts:236](apps/api/src/templates/templates.controller.ts#L236))
   - All chunks deleted during assembly
   - Final assembled PSD deleted after successful conversion
   - Session directory removed

3. **Temporary Work Directory Cleanup** ([psd-converter.service.ts:168](apps/api/src/templates/psd-converter.service.ts#L168))
   - Extracted layer PNGs deleted after upload
   - Composite/thumbnail temp files removed
   - Cleanup happens in `finally` block to ensure execution even on errors

### Session Management

- Chunked upload sessions automatically expire after 24 hours
- Background cleanup task runs every hour
- Failed/cancelled uploads are immediately cleaned up

## Image Optimization Strategy

### Smart Resizing ([psd-converter.service.ts:270](apps/api/src/templates/psd-converter.service.ts#L270))

The optimization system intelligently resizes images based on their orientation:

#### Landscape Images (width ≥ height)

- **Max width**: 1920px (Full HD landscape)
- **Use case**: Most canvas designs, presentations, social media banners
- **Example**: 7016×4961px → 1920×1357px

#### Portrait Images (height > width)

- **Max width**: 1080px (Full HD portrait)
- **Use case**: Mobile-first designs, Instagram stories, vertical video
- **Example**: 1080×1920px → 1080×1920px (no change needed)

#### Key Features

- **Aspect ratio preserved**: Images are never stretched or distorted
- **No upscaling**: Small images are not enlarged
- **Fit inside dimensions**: Uses Sharp's `fit: 'inside'` mode

### Compression

All images are optimized with:

- **Compression level**: 9 (maximum PNG compression)
- **Quality**: 90 (high quality preservation)
- **Alpha channel**: Preserved for transparency

Even images that don't need resizing still get compression optimization.

### Performance Impact

#### Before Optimization

- Layer 0: 21MB
- Layer 3: 36MB
- **Total**: ~59MB for 14 layers

#### After Optimization (estimated)

- Layer 0: ~2-3MB (85-90% reduction)
- Layer 3: ~4-5MB (85-90% reduction)
- **Total**: ~8-10MB for 14 layers
- **Savings**: ~50MB (85% reduction)

### Implementation Details

The optimization happens in the upload pipeline:

```typescript
// 1. Extract layer from PSD with ImageMagick
await execAsync(`convert "${psdPath}[${i}]" -background none -alpha on "${layerPath}"`)

// 2. Optimize layer image
const optimizedBuffer = await this.optimizeLayerImage(layer.imagePath)

// 3. Write optimized buffer to temp file
const optimizedPath = `${layer.imagePath}.optimized.png`
await writeFile(optimizedPath, optimizedBuffer)

// 4. Upload optimized image as asset
const asset = await this.assetsService.createAsset(...)

// 5. Clean up temp files
await rm(optimizedPath).catch(() => {})
```

### Logging

The system provides detailed logging for transparency:

```
Optimizing layer from 7016x4961 to max width 1920px
Image optimized: 21.45MB → 2.87MB (86.6% savings)
Uploaded optimized layer Layer 0 as asset xyz123
```

## Testing

To verify optimization is working:

1. Import a large PSD file via the web UI
2. Check API logs for optimization messages
3. Compare file sizes in `/data/assets/public/` directory
4. Verify visual quality in Polotno editor

## Configuration

To adjust optimization settings, modify these constants in [psd-converter.service.ts](apps/api/src/templates/psd-converter.service.ts#L276-L277):

```typescript
const MAX_LANDSCAPE_WIDTH = 1920 // Full HD landscape
const MAX_PORTRAIT_WIDTH = 1080 // Full HD portrait
```

For different use cases:

- **4K Support**: Increase to 3840×2160
- **Web-only**: Reduce to 1280×720
- **Print**: Consider disabling resize (set very high values)

## Benefits

1. **Storage Savings**: 85%+ reduction in asset storage
2. **Faster Uploads**: Smaller assets upload to storage faster
3. **Better Performance**: Polotno editor handles smaller images more efficiently
4. **Bandwidth Savings**: Reduced data transfer when serving assets
5. **Quality Preserved**: 1920px is sufficient for most digital use cases

## Future Enhancements

Potential improvements:

- [ ] Configurable optimization levels (low/medium/high)
- [ ] Format conversion (PNG → WebP for better compression)
- [ ] Progressive resize (multiple sizes for responsive images)
- [ ] Optimization statistics API endpoint
- [ ] User preference for optimization vs. original quality
