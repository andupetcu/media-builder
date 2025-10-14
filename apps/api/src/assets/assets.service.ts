import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import { Queue } from 'bullmq'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { AssetKind, slugify, UpdateAssetDto } from '@media-builder/shared'
import { unlink } from 'fs/promises'

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name)
  private readonly mediaQueue: Queue

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private config: ConfigService
  ) {
    const connection = new Redis(this.config.get('REDIS_URL') || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
    this.mediaQueue = new Queue('media-processing', { connection })
  }

  async findTeamAssets(teamId: string, kind?: AssetKind) {
    const assets = await this.prisma.asset.findMany({
      where: {
        teamId,
        ...(kind && { kind }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        kind: true,
        name: true,
        slug: true,
        mimeType: true,
        sizeBytes: true,
        publicUrl: true,
        thumbnailUrl: true,
        proxyUrl: true,
        meta: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Convert BigInt to number for JSON serialization
    return assets.map(asset => ({
      ...asset,
      sizeBytes: Number(asset.sizeBytes),
    }))
  }

  async findById(id: string, teamId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, teamId },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!asset) {
      throw new NotFoundException('Asset not found')
    }

    // Convert BigInt to number for JSON serialization
    return {
      ...asset,
      sizeBytes: Number(asset.sizeBytes),
    }
  }

  async createAsset(
    teamId: string,
    userId: string,
    orgId: string,
    kind: AssetKind,
    filename: string,
    mimeType: string,
    sizeBytes: bigint,
    hash: string,
    filePath: string,
    tags: string[] = []
  ) {
    // Check for existing asset with same hash in team (deduplication)
    const existing = await this.prisma.asset.findFirst({
      where: { teamId, hash },
    })

    if (existing) {
      this.logger.log(`Asset already exists with hash ${hash}, reusing: ${existing.id}`)
      // Delete the temporary file
      await unlink(filePath).catch(() => {})
      return existing
    }

    // Save file to permanent storage
    const storageMetadata = await this.storage.saveFile(
      filePath,
      orgId,
      teamId,
      kind,
      filename,
      hash,
      true // public by default
    )

    // Delete temporary file
    await unlink(filePath).catch(() => {})

    // Create asset record
    const name = filename.replace(/\.[^/.]+$/, '')
    const slug = slugify(name)

    const asset = await this.prisma.asset.create({
      data: {
        teamId,
        uploadedBy: userId,
        kind,
        name,
        slug,
        mimeType,
        sizeBytes,
        hash,
        path: storageMetadata.path,
        publicUrl: storageMetadata.publicUrl,
        tags,
        meta: {},
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Queue for media processing
    await this.mediaQueue.add('process-asset', {
      assetId: asset.id,
      kind: asset.kind,
      mimeType: asset.mimeType,
      path: asset.path,
    })

    this.logger.log(`Created asset ${asset.id} and queued for processing`)

    return asset
  }

  async updateAsset(id: string, teamId: string, dto: UpdateAssetDto) {
    const asset = await this.findById(id, teamId)

    const updateData: any = {}
    if (dto.name) {
      updateData.name = dto.name
      updateData.slug = slugify(dto.name)
    }
    if (dto.tags) {
      updateData.tags = dto.tags
    }

    return this.prisma.asset.update({
      where: { id: asset.id },
      data: updateData,
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  async deleteAsset(id: string, teamId: string) {
    const asset = await this.findById(id, teamId)

    // Delete from storage
    await this.storage.deleteFile(asset.path)
    if (asset.thumbnailUrl) {
      // Extract path from thumbnail URL
      const publicBaseUrl = this.config.get<string>('PUBLIC_BASE_URL') || ''
      const thumbPath = asset.thumbnailUrl.replace(publicBaseUrl, 'public')
      await this.storage.deleteFile(thumbPath)
    }
    if (asset.proxyUrl) {
      const publicBaseUrl = this.config.get<string>('PUBLIC_BASE_URL') || ''
      const proxyPath = asset.proxyUrl.replace(publicBaseUrl, 'public')
      await this.storage.deleteFile(proxyPath)
    }

    // Delete from database
    await this.prisma.asset.delete({
      where: { id: asset.id },
    })

    this.logger.log(`Deleted asset ${asset.id}`)
  }
}
