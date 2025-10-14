import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bullmq'
import { PrismaService } from '../prisma/prisma.service'
import { TemplateEngineService } from '../bulk/template-engine.service'
import { BulkJobData, BulkJobResult } from './bulk-job.queue'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
const { createInstance } = require('polotno-node')

@Injectable()
export class BulkJobProcessor {
  private polotnoInstance: any = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateEngine: TemplateEngineService,
    private readonly configService: ConfigService
  ) {}

  async process(job: Job<BulkJobData>): Promise<BulkJobResult> {
    const { jobId, teamId, userId, designJson, rows, mapping, totalRows } = job.data

    console.log(`Starting bulk job ${jobId} for ${totalRows} rows`)

    // Initialize Polotno instance for rendering
    const polotnoKey =
      this.configService.get<string>('NEXT_PUBLIC_POLOTNO_KEY') || 'WtWR19i4P14e_UK7eUUE'
    this.polotnoInstance = await createInstance({
      key: polotnoKey,
    })
    console.log('Polotno instance created successfully')

    const result: BulkJobResult = {
      jobId,
      totalRows,
      successCount: 0,
      failedCount: 0,
      assets: [],
      errors: [],
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      try {
        const rowData = rows[i]
        const progress = Math.round(((i + 1) / totalRows) * 100)
        await job.updateProgress(progress)

        console.log(`Processing row ${i + 1}/${totalRows} for job ${jobId}`)
        console.log('Row data:', rowData)
        console.log('Mapping:', mapping)

        // Transform design with this row's data
        const { json: transformedJson, warnings } = this.templateEngine.transformDesign(
          designJson,
          rowData,
          mapping
        )

        if (warnings.length > 0) {
          console.log(`Warnings for row ${i + 1}:`, warnings)
        }

        // Debug: Log the transformed text elements
        if (transformedJson.pages && transformedJson.pages[0]) {
          const textElements =
            transformedJson.pages[0].children?.filter((el: any) => el.type === 'text') || []
          console.log(
            `Row ${i + 1} text elements after transformation:`,
            textElements.map((el: any) => ({ text: el.text?.substring(0, 50), type: el.type }))
          )
        }

        // Render design to image
        const imageBuffer = await this.renderDesignToImage(transformedJson)

        // Save asset to database and filesystem
        const asset = await this.saveAsset(
          teamId,
          userId,
          `${job.data.designName}_row_${i + 1}`,
          imageBuffer,
          transformedJson
        )

        result.assets.push({
          rowIndex: i,
          assetId: asset.id,
          publicUrl: asset.publicUrl,
          warnings,
        })

        result.successCount++
      } catch (error) {
        console.error(`Failed to process row ${i} in job ${jobId}:`, error)
        result.errors.push({
          rowIndex: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        result.failedCount++
      }
    }

    console.log(
      `Completed bulk job ${jobId}: ${result.successCount} success, ${result.failedCount} failed`
    )

    // Close Polotno instance after job completion to free memory
    if (this.polotnoInstance) {
      try {
        await this.polotnoInstance.close()
        this.polotnoInstance = null
        console.log('Polotno instance closed successfully')
      } catch (e) {
        console.warn('Failed to close Polotno instance:', e)
      }
    }

    return result
  }

  private async renderDesignToImage(designJson: any): Promise<Buffer> {
    if (!this.polotnoInstance) {
      throw new Error('Polotno instance not initialized')
    }

    try {
      console.log('Rendering design with polotno-node...')
      console.log('Design dimensions:', designJson.width, 'x', designJson.height)

      // Export using official polotno-node
      const imageBase64 = await this.polotnoInstance.jsonToImageBase64(designJson, {
        pixelRatio: 2, // 2x for high quality output
        mimeType: 'image/png',
      })

      console.log('Polotno rendering complete, converting to buffer')
      return Buffer.from(imageBase64, 'base64')
    } catch (error) {
      console.error('Polotno rendering error:', error)
      throw new Error(
        `Failed to render design: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async saveAsset(
    teamId: string,
    userId: string,
    name: string,
    imageBuffer: Buffer,
    designJson: any
  ): Promise<{ id: string; publicUrl: string }> {
    const assetsRoot = this.configService.get<string>('ASSETS_ROOT') || '/data/assets'
    const publicBaseUrl =
      this.configService.get<string>('PUBLIC_BASE_URL') || 'http://localhost:3001'

    // Calculate hash for deduplication
    const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex')
    const hash16 = hash.substring(0, 16)

    // Create directory structure: org/{orgId}/team/{teamId}/image/YYYY/MM/
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    // Get org ID from team
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { orgId: true },
    })

    if (!team) {
      throw new Error('Team not found')
    }

    const relativePath = `org/${team.orgId}/team/${teamId}/image/${year}/${month}`
    const fullDir = path.join(assetsRoot, 'public', relativePath)

    // Create directory if it doesn't exist
    await fs.mkdir(fullDir, { recursive: true })

    // Create filename
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const filename = `${hash16}_${slug}.png`
    const filePath = path.join(fullDir, filename)

    // Write file
    await fs.writeFile(filePath, imageBuffer)

    const assetPath = path.join(relativePath, filename)

    // Upsert asset in database (create or update if exists)
    const asset = await this.prisma.asset.upsert({
      where: {
        path: assetPath,
      },
      create: {
        teamId,
        uploadedBy: userId,
        name,
        slug,
        kind: 'IMAGE',
        mimeType: 'image/png',
        sizeBytes: imageBuffer.length,
        hash,
        path: assetPath,
        publicUrl: `${publicBaseUrl}/${relativePath}/${filename}`,
        meta: {
          width: designJson.width || 1920,
          height: designJson.height || 1080,
          generatedFrom: 'bulk_export',
        },
      },
      update: {
        name,
        slug,
        sizeBytes: imageBuffer.length,
        hash,
        publicUrl: `${publicBaseUrl}/${relativePath}/${filename}`,
        meta: {
          width: designJson.width || 1920,
          height: designJson.height || 1080,
          generatedFrom: 'bulk_export',
          updatedAt: new Date().toISOString(),
        },
      },
    })

    return {
      id: asset.id,
      publicUrl: asset.publicUrl!,
    }
  }

  async onModuleDestroy() {
    if (this.polotnoInstance) {
      await this.polotnoInstance.close()
      this.polotnoInstance = null
    }
  }
}
