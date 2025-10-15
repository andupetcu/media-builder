import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { TemplateEngineService } from './template-engine.service'
import { PreviewBulkDto } from './dto/preview-bulk.dto'
import { GenerateBulkDto } from './dto/generate-bulk.dto'
import { BulkJobQueue } from '../queue/bulk-job.queue'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'

@Injectable()
export class BulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateEngine: TemplateEngineService,
    private readonly jobQueue: BulkJobQueue,
    private readonly configService: ConfigService
  ) {}

  async uploadCsvFile(teamId: string, designId: string, userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }

    // Validate file type
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only CSV and Excel files are allowed')
    }

    // Validate file size (10MB limit)
    const maxSizeBytes = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`File size exceeds ${maxSizeBytes / 1024 / 1024}MB limit`)
    }

    // Get assets root and public base URL
    const assetsRoot = this.configService.get<string>('ASSETS_ROOT') || '/data/assets'
    const publicBaseUrl =
      this.configService.get<string>('PUBLIC_BASE_URL') || 'http://localhost:3001'

    // Calculate hash
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex')
    const hash16 = hash.substring(0, 16)

    // Get team's org ID
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { orgId: true },
    })

    if (!team) {
      throw new NotFoundException('Team not found')
    }

    // Create directory structure
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const relativePath = `org/${team.orgId}/team/${teamId}/data/${year}/${month}`
    const fullDir = path.join(assetsRoot, 'public', relativePath)

    try {
      await fs.mkdir(fullDir, { recursive: true })
    } catch (error) {
      throw new BadRequestException(`Failed to create upload directory: ${error.message}`)
    }

    // Create filename
    const fileExt = path.extname(file.originalname)
    const slug = path
      .basename(file.originalname, fileExt)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
    const filename = `${hash16}_${slug}${fileExt}`
    const filePath = path.join(fullDir, filename)

    // Write file
    try {
      await fs.writeFile(filePath, file.buffer)
    } catch (error) {
      throw new BadRequestException(`Failed to save file: ${error.message}`)
    }

    const assetPath = path.join(relativePath, filename)

    // Create or update asset in database
    const asset = await this.prisma.asset.upsert({
      where: { path: assetPath },
      create: {
        teamId,
        uploadedBy: userId,
        name: file.originalname,
        slug,
        kind: 'TEMPLATE', // Use TEMPLATE kind for CSV/data files
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        hash,
        path: assetPath,
        publicUrl: `${publicBaseUrl}/${relativePath}/${filename}`,
        meta: {
          originalName: file.originalname,
          uploadedForDesign: designId,
          isBatchDataFile: true,
        },
      },
      update: {
        name: file.originalname,
        sizeBytes: BigInt(file.size),
        publicUrl: `${publicBaseUrl}/${relativePath}/${filename}`,
        meta: {
          originalName: file.originalname,
          uploadedForDesign: designId,
          isBatchDataFile: true,
          updatedAt: new Date().toISOString(),
        },
      },
    })

    return {
      assetId: asset.id,
      name: asset.name,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
      sizeBytes: Number(asset.sizeBytes),
    }
  }

  async getCsvDataForDesign(teamId: string, designId: string) {
    // Find CSV asset for this design
    const asset = await this.prisma.asset.findFirst({
      where: {
        teamId,
        meta: {
          path: ['uploadedForDesign'],
          equals: designId,
        },
      },
      orderBy: {
        createdAt: 'desc', // Get most recent CSV
      },
    })

    if (!asset) {
      return null // No CSV file uploaded yet
    }

    return {
      assetId: asset.id,
      name: asset.name,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
      sizeBytes: Number(asset.sizeBytes),
      uploadedAt: asset.createdAt,
    }
  }

  async previewBatch(teamId: string, designId: string, dto: PreviewBulkDto) {
    // Load design
    const design = await this.prisma.design.findFirst({
      where: {
        id: designId,
        teamId,
      },
    })

    if (!design) {
      throw new NotFoundException('Design not found')
    }

    // Limit preview to first N rows (default 5)
    const previewCount = dto.previewCount || 5
    const previewRows = dto.rows.slice(0, previewCount)

    // Transform each row
    const results = this.templateEngine.transformBatch(design.doc, previewRows, dto.mapping)

    return {
      designId: design.id,
      designName: design.name,
      totalRows: dto.rows.length,
      previewCount: results.length,
      previews: results.map(result => ({
        rowIndex: result.rowIndex,
        rowData: result.rowData,
        transformedJson: result.json,
        warnings: result.warnings,
      })),
    }
  }

  async generateBatch(teamId: string, designId: string, userId: string, dto: GenerateBulkDto) {
    // Load design
    const design = await this.prisma.design.findFirst({
      where: {
        id: designId,
        teamId,
      },
    })

    if (!design) {
      throw new NotFoundException('Design not found')
    }

    // Generate unique job ID
    const jobId = crypto.randomBytes(16).toString('hex')

    // Add job to queue
    await this.jobQueue.addJob({
      jobId,
      designId: design.id,
      teamId,
      userId,
      designName: dto.designName || design.name,
      designJson: design.doc,
      rows: dto.rows,
      mapping: dto.mapping,
      totalRows: dto.rows.length,
    })

    return {
      jobId,
      designId: design.id,
      designName: design.name,
      totalRows: dto.rows.length,
      status: 'queued',
      message: `Batch job created for ${dto.rows.length} designs`,
    }
  }

  async getJobStatus(jobId: string) {
    const job = await this.jobQueue.getJob(jobId)

    if (!job) {
      throw new NotFoundException('Job not found')
    }

    const state = await job.getState()
    const progress = await job.progress

    return {
      jobId: job.id,
      status: state,
      progress,
      data: {
        designId: job.data.designId,
        designName: job.data.designName,
        totalRows: job.data.totalRows,
      },
    }
  }

  async getJobResults(jobId: string) {
    const job = await this.jobQueue.getJob(jobId)

    if (!job) {
      throw new NotFoundException('Job not found')
    }

    const state = await job.getState()

    if (state !== 'completed') {
      throw new NotFoundException(`Job is not completed yet. Current status: ${state}`)
    }

    const result = await job.returnvalue

    return {
      jobId: job.id,
      status: 'completed',
      result,
    }
  }
}
