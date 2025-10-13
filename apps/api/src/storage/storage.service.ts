import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'crypto'
import { createReadStream, createWriteStream } from 'fs'
import { mkdir, unlink, access, stat } from 'fs/promises'
import { join, dirname } from 'path'
import { pipeline } from 'stream/promises'
import { slugify } from '@media-builder/shared'

export interface StorageMetadata {
  path: string
  publicUrl?: string
  hash: string
  sizeBytes: bigint
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private readonly assetsRoot: string
  private readonly publicBaseUrl: string

  constructor(private config: ConfigService) {
    this.assetsRoot = this.config.get('ASSETS_ROOT', '/data/assets')
    this.publicBaseUrl = this.config.get('PUBLIC_BASE_URL', 'http://localhost:8080/assets')
  }

  /**
   * Generate SHA-256 hash of a file
   */
  async hashFile(filePath: string): Promise<string> {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)

    for await (const chunk of stream) {
      hash.update(chunk)
    }

    return hash.digest('hex')
  }

  /**
   * Generate SHA-256 hash of a buffer
   */
  hashBuffer(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex')
  }

  /**
   * Build storage path: org/{orgId}/team/{teamId}/{type}/YYYY/MM/{hash16}_{slug}.ext
   */
  buildStoragePath(
    orgId: string,
    teamId: string,
    kind: string,
    filename: string,
    hash: string,
    isPublic: boolean = true
  ): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    const ext = filename.split('.').pop() || ''
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
    const slug = slugify(nameWithoutExt)

    const hash16 = hash.substring(0, 16)
    const fileName = `${hash16}_${slug}.${ext}`

    const visibility = isPublic ? 'public' : 'private'
    const kindLower = kind.toLowerCase()

    return join(
      visibility,
      'org',
      orgId,
      'team',
      teamId,
      kindLower,
      year.toString(),
      month,
      fileName
    )
  }

  /**
   * Get absolute filesystem path
   */
  getAbsolutePath(relativePath: string): string {
    return join(this.assetsRoot, relativePath)
  }

  /**
   * Get public URL for an asset
   */
  getPublicUrl(relativePath: string): string | undefined {
    if (!relativePath.startsWith('public/')) {
      return undefined
    }
    return `${this.publicBaseUrl}/${relativePath.replace('public/', '')}`
  }

  /**
   * Check if file exists
   */
  async exists(relativePath: string): Promise<boolean> {
    try {
      await access(this.getAbsolutePath(relativePath))
      return true
    } catch {
      return false
    }
  }

  /**
   * Get file size
   */
  async getFileSize(relativePath: string): Promise<bigint> {
    const stats = await stat(this.getAbsolutePath(relativePath))
    return BigInt(stats.size)
  }

  /**
   * Save file to storage
   */
  async saveFile(
    sourcePath: string,
    orgId: string,
    teamId: string,
    kind: string,
    filename: string,
    hash: string,
    isPublic: boolean = true
  ): Promise<StorageMetadata> {
    const relativePath = this.buildStoragePath(orgId, teamId, kind, filename, hash, isPublic)
    const absolutePath = this.getAbsolutePath(relativePath)

    // Create directory if it doesn't exist
    await mkdir(dirname(absolutePath), { recursive: true })

    // Copy file
    await pipeline(createReadStream(sourcePath), createWriteStream(absolutePath))

    const sizeBytes = await this.getFileSize(relativePath)
    const publicUrl = this.getPublicUrl(relativePath)

    this.logger.log(`Saved file: ${relativePath} (${sizeBytes} bytes)`)

    return {
      path: relativePath,
      publicUrl,
      hash,
      sizeBytes,
    }
  }

  /**
   * Save buffer to storage
   */
  async saveBuffer(
    buffer: Buffer,
    orgId: string,
    teamId: string,
    kind: string,
    filename: string,
    hash: string,
    isPublic: boolean = true
  ): Promise<StorageMetadata> {
    const relativePath = this.buildStoragePath(orgId, teamId, kind, filename, hash, isPublic)
    const absolutePath = this.getAbsolutePath(relativePath)

    // Create directory if it doesn't exist
    await mkdir(dirname(absolutePath), { recursive: true })

    // Write buffer
    await pipeline(
      (async function* () {
        yield buffer
      })(),
      createWriteStream(absolutePath)
    )

    const publicUrl = this.getPublicUrl(relativePath)

    this.logger.log(`Saved buffer: ${relativePath} (${buffer.length} bytes)`)

    return {
      path: relativePath,
      publicUrl,
      hash,
      sizeBytes: BigInt(buffer.length),
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(relativePath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(relativePath)
    try {
      await unlink(absolutePath)
      this.logger.log(`Deleted file: ${relativePath}`)
    } catch (error: any) {
      this.logger.warn(`Failed to delete file ${relativePath}: ${error.message}`)
    }
  }

  /**
   * Find existing asset by hash (deduplication)
   */
  async findByHash(_hash: string, _teamId: string): Promise<string | null> {
    // This will be checked via database in the assets service
    // This method is a placeholder for future filesystem-based lookups
    return null
  }
}
