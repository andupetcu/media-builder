import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { writeFile, readFile, mkdir, rm, appendFile, stat } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { existsSync } from 'fs'

interface UploadSession {
  id: string
  filename: string
  totalSize: number
  totalChunks: number
  receivedChunks: number
  uploadPath: string
  createdAt: Date
  metadata?: {
    name?: string
    description?: string
    tags?: string[]
    isPublic?: boolean
  }
}

@Injectable()
export class ChunkedUploadService {
  private readonly logger = new Logger(ChunkedUploadService.name)
  private readonly sessions = new Map<string, UploadSession>()
  private readonly uploadDir = join(tmpdir(), 'psd-chunked-uploads')

  constructor() {
    // Ensure upload directory exists
    mkdir(this.uploadDir, { recursive: true }).catch(err => {
      this.logger.error(`Failed to create upload directory: ${err.message}`)
    })

    // Clean up old sessions every hour
    setInterval(() => this.cleanupOldSessions(), 60 * 60 * 1000)
  }

  /**
   * Start a new chunked upload session
   */
  async startUpload(
    filename: string,
    totalSize: number,
    totalChunks: number,
    metadata?: {
      name?: string
      description?: string
      tags?: string[]
      isPublic?: boolean
    }
  ): Promise<string> {
    const uploadId = randomUUID()
    const uploadPath = join(this.uploadDir, uploadId)

    // Create session directory
    await mkdir(uploadPath, { recursive: true })

    const session: UploadSession = {
      id: uploadId,
      filename,
      totalSize,
      totalChunks,
      receivedChunks: 0,
      uploadPath,
      createdAt: new Date(),
      metadata,
    }

    this.sessions.set(uploadId, session)

    this.logger.log(
      `Started chunked upload ${uploadId} for ${filename} (${totalChunks} chunks, ${(totalSize / 1024 / 1024).toFixed(2)}MB)`
    )

    return uploadId
  }

  /**
   * Upload a chunk
   */
  async uploadChunk(uploadId: string, chunkIndex: number, chunkBuffer: Buffer): Promise<void> {
    const session = this.sessions.get(uploadId)

    if (!session) {
      throw new NotFoundException(`Upload session ${uploadId} not found`)
    }

    if (chunkIndex >= session.totalChunks) {
      throw new BadRequestException(
        `Invalid chunk index ${chunkIndex} (total chunks: ${session.totalChunks})`
      )
    }

    // Write chunk to file
    const chunkPath = join(session.uploadPath, `chunk_${chunkIndex}`)
    await writeFile(chunkPath, chunkBuffer)

    session.receivedChunks++

    this.logger.log(
      `Received chunk ${chunkIndex + 1}/${session.totalChunks} for upload ${uploadId} (${(chunkBuffer.length / 1024 / 1024).toFixed(2)}MB)`
    )
  }

  /**
   * Check if upload is complete
   */
  isUploadComplete(uploadId: string): boolean {
    const session = this.sessions.get(uploadId)
    if (!session) {
      return false
    }
    return session.receivedChunks === session.totalChunks
  }

  /**
   * Assemble chunks into final file
   */
  async assembleFile(
    uploadId: string
  ): Promise<{ filePath: string; filename: string; metadata?: any }> {
    const session = this.sessions.get(uploadId)

    if (!session) {
      throw new NotFoundException(`Upload session ${uploadId} not found`)
    }

    if (!this.isUploadComplete(uploadId)) {
      throw new BadRequestException(
        `Upload not complete (${session.receivedChunks}/${session.totalChunks} chunks received)`
      )
    }

    const finalPath = join(session.uploadPath, session.filename)

    this.logger.log(`Assembling ${session.totalChunks} chunks for upload ${uploadId}`)

    // Assemble chunks in order
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = join(session.uploadPath, `chunk_${i}`)

      if (!existsSync(chunkPath)) {
        throw new BadRequestException(`Missing chunk ${i}`)
      }

      const chunkData = await readFile(chunkPath)
      await appendFile(finalPath, chunkData)

      // Delete chunk after appending to save space
      await rm(chunkPath).catch(() => {})
    }

    // Verify file size
    const stats = await stat(finalPath)
    if (stats.size !== session.totalSize) {
      this.logger.warn(`File size mismatch: expected ${session.totalSize}, got ${stats.size}`)
    }

    this.logger.log(`Assembled file ${finalPath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`)

    return {
      filePath: finalPath,
      filename: session.filename,
      metadata: session.metadata,
    }
  }

  /**
   * Get upload progress
   */
  getProgress(
    uploadId: string
  ): { receivedChunks: number; totalChunks: number; percent: number } | null {
    const session = this.sessions.get(uploadId)

    if (!session) {
      return null
    }

    return {
      receivedChunks: session.receivedChunks,
      totalChunks: session.totalChunks,
      percent: Math.round((session.receivedChunks / session.totalChunks) * 100),
    }
  }

  /**
   * Cancel upload and clean up
   */
  async cancelUpload(uploadId: string): Promise<void> {
    const session = this.sessions.get(uploadId)

    if (session) {
      await rm(session.uploadPath, { recursive: true, force: true }).catch(err => {
        this.logger.warn(`Failed to clean up upload ${uploadId}: ${err.message}`)
      })

      this.sessions.delete(uploadId)
      this.logger.log(`Cancelled upload ${uploadId}`)
    }
  }

  /**
   * Clean up completed upload
   */
  async cleanupUpload(uploadId: string): Promise<void> {
    const session = this.sessions.get(uploadId)

    if (session) {
      await rm(session.uploadPath, { recursive: true, force: true }).catch(err => {
        this.logger.warn(`Failed to clean up upload ${uploadId}: ${err.message}`)
      })

      this.sessions.delete(uploadId)
    }
  }

  /**
   * Clean up old sessions (older than 24 hours)
   */
  private async cleanupOldSessions(): Promise<void> {
    const now = new Date()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    for (const [uploadId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.createdAt.getTime()

      if (age > maxAge) {
        this.logger.log(`Cleaning up old upload session ${uploadId}`)
        await this.cancelUpload(uploadId)
      }
    }
  }
}
