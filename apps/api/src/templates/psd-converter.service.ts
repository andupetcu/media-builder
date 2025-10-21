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
      // Clean up temp directory
      await rm(workDir, { recursive: true, force: true }).catch(err => {
        this.logger.warn(`Failed to clean up temp directory: ${err.message}`)
      })
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
          // Extract layer with alpha transparency
          // Using ImageMagick 6 syntax: convert instead of magick
          await execAsync(`convert "${psdPath}[${i}]" -background none -alpha on "${layerPath}"`)

          // Get layer dimensions and check if it's not empty
          const metadata = await sharp(layerPath).metadata()

          if (!metadata.width || !metadata.height) {
            this.logger.warn(`Layer ${i} has no dimensions, skipping`)
            continue
          }

          // For ImageMagick 6, we get position from the layer itself
          // Since ImageMagick doesn't preserve exact layer positions in the same way,
          // we'll use 0,0 and rely on the visual stacking order
          layers.push({
            id: `layer-${randomUUID().substring(0, 8)}`,
            name: `Layer ${i}`,
            x: 0,
            y: 0,
            width: metadata.width,
            height: metadata.height,
            opacity: 1,
            visible: true,
            imagePath: layerPath,
          })
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

      // Reverse to match Photoshop layer order (top to bottom)
      return layers.reverse()
    } catch (error: any) {
      this.logger.error(`Layer extraction failed: ${error.message}`)
      throw error
    }
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
        // Hash the layer image
        const hash = await this.storage.hashFile(layer.imagePath)

        // Get file size
        const buffer = await readFile(layer.imagePath)
        const sizeBytes = BigInt(buffer.length)

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
          layer.imagePath,
          ['psd-layer', 'imported']
        )

        uploadedLayers.push({
          ...layer,
          uploadedUrl: asset.publicUrl || undefined,
        })

        this.logger.log(`Uploaded layer ${layer.name} as asset ${asset.id}`)
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
