import { Injectable, Logger } from '@nestjs/common'
import { exec } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

const execAsync = promisify(exec)

@Injectable()
export class VideoProxyService {
  private readonly logger = new Logger(VideoProxyService.name)

  /**
   * Generate 540p proxy video for editing
   * Uses H.264 with fast encoding preset
   */
  async generateProxy(inputPath: string): Promise<string> {
    const outputPath = join(tmpdir(), `proxy-${randomUUID()}.mp4`)

    try {
      // Generate 540p proxy with fast encoding
      const command = `ffmpeg -i "${inputPath}" \
        -vf "scale=-2:540" \
        -c:v libx264 \
        -preset fast \
        -crf 23 \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        "${outputPath}"`

      await execAsync(command.replace(/\s+/g, ' '), {
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer
      })

      this.logger.log(`Generated video proxy: ${inputPath} -> ${outputPath}`)
      return outputPath
    } catch (error: any) {
      this.logger.error(`Failed to generate video proxy: ${error.message}`)
      throw error
    }
  }

  /**
   * Generate 1080p high quality proxy
   */
  async generateHDProxy(inputPath: string): Promise<string> {
    const outputPath = join(tmpdir(), `proxy-hd-${randomUUID()}.mp4`)

    try {
      const command = `ffmpeg -i "${inputPath}" \
        -vf "scale=-2:1080" \
        -c:v libx264 \
        -preset medium \
        -crf 20 \
        -c:a aac \
        -b:a 192k \
        -movflags +faststart \
        "${outputPath}"`

      await execAsync(command.replace(/\s+/g, ' '), {
        maxBuffer: 200 * 1024 * 1024, // 200MB buffer
      })

      this.logger.log(`Generated HD video proxy: ${inputPath} -> ${outputPath}`)
      return outputPath
    } catch (error: any) {
      this.logger.error(`Failed to generate HD video proxy: ${error.message}`)
      throw error
    }
  }
}
