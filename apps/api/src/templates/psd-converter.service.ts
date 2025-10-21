import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir, rm, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { AssetsService } from '../assets/assets.service'
import { StorageService } from '../storage/storage.service'
import { PrismaService } from '../prisma/prisma.service'
import { AssetKind } from '@media-builder/shared'
import sharp from 'sharp'

const execAsync = promisify(exec)

interface LayerInfo {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  visible: boolean
  imagePath: string
  uploadedUrl?: string
}

interface PolotnoElement {
  id: string
  type: 'image'
  name: string
  src: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  visible: boolean
  selectable: boolean
  draggable: boolean
}

interface PolotnoDoc {
  width: number
  height: number
  pages: Array<{
    id: string
    width: number
    height: number
    background: string
    children: PolotnoElement[]
  }>
}

@Injectable()
export class PsdConverterService {
  private readonly logger = new Logger(PsdConverterService.name)

  constructor(
    private assetsService: AssetsService,
    private storage: StorageService,
    private prisma: PrismaService
  ) {}

  /**
   * Convert a PSD file to a Polotno template
   */
  async convertPSDToTemplate(
    psdBuffer: Buffer,
    filename: string,
    teamId: string,
    userId: string,
    options: {
      name?: string
      description?: string
      tags?: string[]
      isPublic?: boolean
    } = {}
  ) {
    const workDir = join(tmpdir(), `psd-convert-${randomUUID()}`)
    const psdPath = join(workDir, filename)

    try {
      // Create work directory
      await mkdir(workDir, { recursive: true })

      // Write PSD buffer to temp file
      await writeFile(psdPath, psdBuffer)

      this.logger.log(`Converting PSD: ${filename}`)

      // Extract layers using ImageMagick
      const layers = await this.extractLayersWithImageMagick(psdPath, workDir, 50)

      if (layers.length === 0) {
        throw new BadRequestException('No layers found in PSD file')
      }

      // Get PSD dimensions from first layer extraction
      const { stdout: identifyOutput } = await execAsync(
        `convert "${psdPath}[0]" -format "%w %h" info:`
      )
      const [width, height] = identifyOutput.trim().split(' ').map(Number)

      this.logger.log(`PSD dimensions: ${width}x${height}, layers: ${layers.length}`)

      // Get team's org ID
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
        select: { orgId: true },
      })

      if (!team) {
        throw new BadRequestException('Team not found')
      }

      // Upload layer images as assets
      const uploadedLayers = await this.uploadLayerAssets(layers, teamId, userId, team.orgId)

      // Generate thumbnail from composite
      const compositePath = join(workDir, 'composite.png')
      await execAsync(
        `convert "${psdPath}" -background none -flatten -resize 800x800 "${compositePath}"`
      )
      const thumbnailBuffer = await readFile(compositePath)
      const thumbnailDataUrl = `data:image/png;base64,${thumbnailBuffer.toString('base64')}`

      // Generate Polotno JSON
      const doc = this.generatePolotnoJSON(uploadedLayers, width, height)

      // Create template name
      const templateName = options.name || filename.replace(/\.psd$/i, '')

      // Create template record
      const template = await this.prisma.template.create({
        data: {
          teamId,
          createdBy: userId,
          name: templateName,
          description: options.description || `Imported from ${filename}`,
          doc: doc as any,
          thumbnail: thumbnailDataUrl,
          width,
          height,
          tags: options.tags || ['imported', 'psd'],
          isPublic: options.isPublic || false,
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      this.logger.log(`Created template ${template.id} from PSD`)

      return template
    } catch (error: any) {
      this.logger.error(`PSD conversion failed: ${error.message}`, error.stack)
      throw new BadRequestException(`Failed to convert PSD: ${error.message}`)
    } finally {
      // Clean up temp directory (extracted layers, composite, etc.)
      await rm(workDir, { recursive: true, force: true }).catch(err => {
        this.logger.warn(`Failed to clean up temp directory: ${err.message}`)
      })
      this.logger.log(`Cleaned up temp work directory: ${workDir}`)
    }
  }

  /**
   * Extract layers from PSD using ImageMagick
   */
  private async extractLayersWithImageMagick(
    psdPath: string,
    outputDir: string,
    maxLayers: number = 50
  ): Promise<LayerInfo[]> {
    try {
      // Get layer count
      const { stdout: layerCountOutput } = await execAsync(
        `identify "${psdPath}" 2>/dev/null | wc -l`
      )
      const totalLayers = parseInt(layerCountOutput.trim())
      const layersToExtract = Math.min(totalLayers, maxLayers)

      this.logger.log(`Extracting ${layersToExtract} layers from ${totalLayers} total`)

      const layers: LayerInfo[] = []

      for (let i = 0; i < layersToExtract; i++) {
        const layerPath = join(outputDir, `layer_${i}.png`)

        try {
          // Get layer geometry with position offset from ImageMagick
          const { stdout: geometryOutput } = await execAsync(
            `identify -format "%g" "${psdPath}[${i}]"`
          )

          // Parse geometry string: WIDTHxHEIGHT+X+Y or WIDTHxHEIGHT-X+Y
          // Example: 4209x4405-708+333 means width=4209, height=4405, x=-708, y=333
          const geometryMatch = geometryOutput.trim().match(/(\d+)x(\d+)([-+]\d+)([-+]\d+)/)

          if (!geometryMatch) {
            this.logger.warn(`Could not parse geometry for layer ${i}: ${geometryOutput}`)
            continue
          }

          const layerWidth = parseInt(geometryMatch[1])
          const layerHeight = parseInt(geometryMatch[2])
          const offsetX = parseInt(geometryMatch[3])
          const offsetY = parseInt(geometryMatch[4])

          // Extract layer with alpha transparency
          // Using ImageMagick 6 syntax: convert instead of magick
          await execAsync(`convert "${psdPath}[${i}]" -background none -alpha on "${layerPath}"`)

          // Verify extraction succeeded
          const metadata = await sharp(layerPath).metadata()
          if (!metadata.width || !metadata.height) {
            this.logger.warn(`Layer ${i} has no dimensions, skipping`)
            continue
          }

          layers.push({
            id: `layer-${randomUUID().substring(0, 8)}`,
            name: `Layer ${i}`,
            x: offsetX,
            y: offsetY,
            width: layerWidth,
            height: layerHeight,
            opacity: 1,
            visible: true,
            imagePath: layerPath,
          })

          this.logger.log(
            `Extracted layer ${i}: ${layerWidth}x${layerHeight} at (${offsetX}, ${offsetY})`
          )
        } catch (error: any) {
          this.logger.warn(`Failed to extract layer ${i}: ${error.message}`)
          // If we hit an invalid layer index, stop extraction
          if (
            error.message &&
            (error.message.includes('invalid') || error.message.includes('index'))
          ) {
            break
          }
        }
      }

      // Return layers in original order from PSD
      // In Polotno, children[0] is bottom, children[last] is top
      // ImageMagick extracts layers in bottom-to-top order (0=bottom, N=top)
      // So we keep the natural order without reversing
      return layers
    } catch (error: any) {
      this.logger.error(`Layer extraction failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Optimize layer image for web use
   * Intelligently resizes large images while maintaining aspect ratio
   */
  private async optimizeLayerImage(imagePath: string): Promise<Buffer> {
    const metadata = await sharp(imagePath).metadata()
    const width = metadata.width || 0
    const height = metadata.height || 0

    // Define max dimensions based on common canvas sizes
    const MAX_LANDSCAPE_WIDTH = 1920 // Full HD landscape
    const MAX_PORTRAIT_WIDTH = 1080 // Full HD portrait

    let needsResize = false
    let targetWidth: number | undefined
    let targetHeight: number | undefined

    // Determine if resize is needed and calculate target dimensions
    if (width >= height) {
      // Landscape or square
      if (width > MAX_LANDSCAPE_WIDTH) {
        needsResize = true
        targetWidth = MAX_LANDSCAPE_WIDTH
        // Height will be calculated automatically to maintain aspect ratio
      }
    } else {
      // Portrait
      if (width > MAX_PORTRAIT_WIDTH) {
        needsResize = true
        targetWidth = MAX_PORTRAIT_WIDTH
      }
    }

    if (needsResize) {
      this.logger.log(
        `Optimizing layer from ${width}x${height} to max width ${targetWidth}px`
      )

      const optimized = await sharp(imagePath)
        .resize(targetWidth, targetHeight, {
          fit: 'inside', // Maintain aspect ratio
          withoutEnlargement: true, // Don't upscale
        })
        .png({
          compressionLevel: 9, // Maximum PNG compression
          quality: 90, // High quality
        })
        .toBuffer()

      const originalSize = (await readFile(imagePath)).length
      const optimizedSize = optimized.length
      const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1)

      this.logger.log(
        `Image optimized: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedSize / 1024 / 1024).toFixed(2)}MB (${savings}% savings)`
      )

      return optimized
    }

    // No resize needed, but still optimize PNG compression
    const optimized = await sharp(imagePath)
      .png({
        compressionLevel: 9,
        quality: 90,
      })
      .toBuffer()

    return optimized
  }

  /**
   * Upload extracted layer images as assets
   */
  private async uploadLayerAssets(
    layers: LayerInfo[],
    teamId: string,
    userId: string,
    orgId: string
  ): Promise<LayerInfo[]> {
    const uploadedLayers: LayerInfo[] = []

    for (const layer of layers) {
      try {
        // Optimize layer image before upload
        const optimizedBuffer = await this.optimizeLayerImage(layer.imagePath)

        // Write optimized buffer to temp file for hashing and upload
        const optimizedPath = `${layer.imagePath}.optimized.png`
        await writeFile(optimizedPath, optimizedBuffer)

        // Hash the optimized image
        const hash = await this.storage.hashFile(optimizedPath)

        // Get file size
        const sizeBytes = BigInt(optimizedBuffer.length)

        // Upload as asset
        const asset = await this.assetsService.createAsset(
          teamId,
          userId,
          orgId,
          AssetKind.IMAGE,
          `${layer.name}.png`,
          'image/png',
          sizeBytes,
          hash,
          optimizedPath,
          ['psd-layer', 'imported']
        )

        // Clean up optimized temp file
        await rm(optimizedPath).catch(() => {})

        uploadedLayers.push({
          ...layer,
          uploadedUrl: asset.publicUrl || undefined,
        })

        this.logger.log(`Uploaded optimized layer ${layer.name} as asset ${asset.id}`)
      } catch (error: any) {
        this.logger.error(`Failed to upload layer ${layer.name}: ${error.message}`)
        // Continue with other layers even if one fails
      }
    }

    return uploadedLayers
  }

  /**
   * Generate Polotno JSON structure from layers
   */
  private generatePolotnoJSON(layers: LayerInfo[], width: number, height: number): PolotnoDoc {
    const elements: PolotnoElement[] = layers.map(layer => ({
      id: layer.id,
      type: 'image',
      name: layer.name,
      src: layer.uploadedUrl || '',
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      opacity: layer.opacity,
      visible: layer.visible,
      selectable: true,
      draggable: true,
    }))

    return {
      width,
      height,
      pages: [
        {
          id: `page-${randomUUID().substring(0, 8)}`,
          width,
          height,
          background: '#ffffff',
          children: elements,
        },
      ],
    }
  }

  /**
   * Check if ImageMagick is available
   */
  async checkImageMagickAvailable(): Promise<boolean> {
    try {
      await execAsync('convert -version')
      return true
    } catch {
      return false
    }
  }
}
