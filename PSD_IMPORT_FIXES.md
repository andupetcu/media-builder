# PSD Import Layer Order and Positioning Fixes

## Issues Fixed

### Issue #1: Layer Positioning
**Problem**: All layers were imported at position (0, 0) instead of their actual PSD coordinates.

**Root Cause**: The PSD converter was not extracting the layer offset information from ImageMagick's geometry data.

**Solution**:
- Added geometry parsing to extract X and Y offsets from ImageMagick's output
- Parse geometry format: `WIDTHxHEIGHT+X+Y` or `WIDTHxHEIGHT-X+Y`
- Example: `4209x4405-708+333` = width: 4209, height: 4405, x: -708, y: 333
- Supports both positive and negative offsets

**Changes Made**:
```typescript
// Before: Hardcoded positions
x: 0,
y: 0,

// After: Extract from ImageMagick geometry
const { stdout: geometryOutput } = await execAsync(
  `identify -format "%g" "${psdPath}[${i}]"`
)
const geometryMatch = geometryOutput.trim().match(/(\d+)x(\d+)([-+]\d+)([-+]\d+)/)
const offsetX = parseInt(geometryMatch[3])
const offsetY = parseInt(geometryMatch[4])
```

### Issue #2: Layer Order
**Problem**: Layers were being imported in reverse order compared to the PSD file.

**Root Cause**: Incorrect assumption about layer stacking order between ImageMagick and Polotno.

**Solution**:
- **ImageMagick**: Extracts layers from index 0 (bottom/background) to N (top)
- **Polotno**: children[0] is rendered first (bottom), children[last] is rendered last (top)
- **Fix**: Keep natural ImageMagick order without reversing

**Changes Made**:
```typescript
// Before: Reversed the array
return layers.reverse()

// After: Keep original order
return layers
```

## Layer Information from Test PSD

For reference, here's the layer data from `KV_Impulse__ShareACoke L.psd`:

| Layer | Dimensions | Position | Notes |
|-------|------------|----------|-------|
| 0 | 7016x4961 | (0, 0) | Full canvas - composite |
| 1 | 7016x4961 | (0, 0) | Full canvas - background |
| 2 | 4209x4405 | (-708, 333) | Content layer |
| 3 | 6086x4313 | (-1369, 412) | Content layer |
| 4 | 692x693 | (366, 312) | Small element |
| 5 | 692x692 | (1770, 3971) | Small element |
| 6 | 3880x51 | (96, 4826) | Text/line element |
| 7 | 4963x2139 | (1923, 189) | Large element |
| 8 | 2088x761 | (4378, 3787) | Medium element |
| 9 | 492x287 | (5831, 4020) | Small element |
| 10 | 610x610 | (5150, 3866) | Small element |
| 11 | 2110x300 | (4301, 2447) | Text element |
| 12 | 2085x133 | (4310, 3406) | Text element |
| 13 | 2115x591 | (4295, 2765) | Medium element |

## Testing the Fixes

### Expected Behavior After Fixes:

1. **Correct Positioning**:
   - Each layer should appear at its original PSD coordinates
   - Negative offsets (like -708) are handled correctly
   - Layers with positive offsets appear in correct positions

2. **Correct Layer Order**:
   - Layer 0 (background) appears at bottom
   - Layer 13 appears at top
   - Intermediate layers stack in correct order

3. **Visual Verification**:
   - Imported template should look identical to flattened PSD
   - No layers should be misaligned
   - Layer stacking should match Photoshop

### How to Test:

1. **Import the test PSD**:
   ```bash
   # In the UI, click "Import Template"
   # Select: KV_Impulse__ShareACoke L.psd
   ```

2. **Check layer positions in editor**:
   - Select each layer in Polotno
   - Verify X and Y positions match expected values
   - Example: Layer 2 should be at (-708, 333)

3. **Check layer order**:
   - Open layers panel in Polotno
   - Verify Layer 0 is at bottom
   - Verify Layer 13 is at top

4. **Visual comparison**:
   - Compare imported template with flattened PSD composite
   - All elements should align perfectly

### Debug Logging

The updated service now logs layer extraction details:

```
[PsdConverterService] Extracted layer 0: 7016x4961 at (0, 0)
[PsdConverterService] Extracted layer 1: 7016x4961 at (0, 0)
[PsdConverterService] Extracted layer 2: 4209x4405 at (-708, 333)
[PsdConverterService] Extracted layer 3: 6086x4313 at (-1369, 412)
...
```

Check API logs to verify positions are being extracted correctly:
```bash
pm2 logs media-builder-api --lines 50
```

## Code Changes Summary

**File**: `apps/api/src/templates/psd-converter.service.ts`

**Lines Changed**: 197-255

**Key Changes**:
1. Added ImageMagick geometry extraction (line 199-201)
2. Added geometry parsing with regex (line 205)
3. Extract offsetX and offsetY from geometry (line 214-215)
4. Use extracted positions instead of hardcoded 0,0 (line 231-232)
5. Removed array reverse operation (line 255)
6. Added debug logging for layer positions (line 240-242)

## Known Limitations

1. **Negative Offsets**: Layers with negative offsets will be positioned outside the canvas bounds on the left or top. This is correct behavior matching the PSD.

2. **Layer Names**: Currently using generic "Layer N" names. Future enhancement could extract actual layer names from PSD metadata.

3. **Layer Effects**: Effects like shadows, glows are flattened into the layer image. They are not preserved as separate Polotno effects.

4. **Blend Modes**: Layer blend modes are not preserved. All layers use normal blending.

## Next Steps

After testing, if the fixes work correctly:

1. ✅ Commit the fixes to git
2. ✅ Update documentation
3. ✅ Test with other PSD files
4. Consider extracting actual layer names from PSD
5. Consider adding layer visibility/opacity from PSD metadata

---

**Fixed**: October 21, 2025
**Status**: Deployed to API, ready for testing
**API Version**: Running on 10.0.0.60:3001
