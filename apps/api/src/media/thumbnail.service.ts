import { Injectable, Logger } from '@nestjs/common'
import { exec } from 'child_process'
import { promisify } from 'util'
import sharp from 'sharp'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { unlink } from 'fs/promises'

const execAsync = promisify(exec)

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name)

  /**
   * Generate thumbnail for image using sharp
   */
  async generateImageThumbnail(
    inputPath: string,
    width: number = 400,
    height: number = 400
  ): Promise<Buffer> {
    try {
      const thumbnail = await sharp(inputPath)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer()

      this.logger.log(`Generated image thumbnail: ${inputPath}`)
      return thumbnail
    } catch (error: any) {
      this.logger.error(`Failed to generate image thumbnail: ${error.message}`)
      throw error
    }
  }

  /**
   * Generate thumbnail for video using ffmpeg
   */
  async generateVideoThumbnail(
    inputPath: string,
    width: number = 400,
    height: number = 400
  ): Promise<Buffer> {
    const tempFile = join(tmpdir(), `thumb-${randomUUID()}.jpg`)

    try {
      // Extract frame at 1 second
      const command = `ffmpeg -i "${inputPath}" -ss 00:00:01 -vframes 1 -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease" "${tempFile}"`
      await execAsync(command)

      // Read and optimize with sharp
      const thumbnail = await sharp(tempFile)
        .jpeg({ quality: 85 })
        .toBuffer()

      await unlink(tempFile).catch(() => {})

      this.logger.log(`Generated video thumbnail: ${inputPath}`)
      return thumbnail
    } catch (error: any) {
      await unlink(tempFile).catch(() => {})
      this.logger.error(`Failed to generate video thumbnail: ${error.message}`)
      throw error
    }
  }

  /**
   * Generate thumbnail based on mime type
   */
  async generateThumbnail(
    inputPath: string,
    mimeType: string,
    width: number = 400,
    height: number = 400
  ): Promise<Buffer> {
    if (mimeType.startsWith('image/')) {
      return this.generateImageThumbnail(inputPath, width, height)
    } else if (mimeType.startsWith('video/')) {
      return this.generateVideoThumbnail(inputPath, width, height)
    } else {
      throw new Error(`Unsupported mime type for thumbnail: ${mimeType}`)
    }
  }
}
