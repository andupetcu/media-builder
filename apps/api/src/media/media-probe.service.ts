import { Injectable, Logger } from '@nestjs/common'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface MediaMetadata {
  duration?: number
  width?: number
  height?: number
  codec?: string
  bitrate?: number
  fps?: number
  channels?: number
  sampleRate?: number
}

@Injectable()
export class MediaProbeService {
  private readonly logger = new Logger(MediaProbeService.name)

  /**
   * Probe media file for metadata using ffprobe
   */
  async probe(filePath: string): Promise<MediaMetadata> {
    try {
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      const { stdout } = await execAsync(command)
      const data = JSON.parse(stdout)

      const metadata: MediaMetadata = {}

      // Get format info
      if (data.format) {
        if (data.format.duration) {
          metadata.duration = parseFloat(data.format.duration)
        }
        if (data.format.bit_rate) {
          metadata.bitrate = parseInt(data.format.bit_rate, 10)
        }
      }

      // Get video stream info
      const videoStream = data.streams?.find((s: any) => s.codec_type === 'video')
      if (videoStream) {
        metadata.width = videoStream.width
        metadata.height = videoStream.height
        metadata.codec = videoStream.codec_name
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/')
          metadata.fps = parseInt(num, 10) / parseInt(den, 10)
        }
      }

      // Get audio stream info
      const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio')
      if (audioStream) {
        metadata.channels = audioStream.channels
        metadata.sampleRate = audioStream.sample_rate
        if (!metadata.codec) {
          metadata.codec = audioStream.codec_name
        }
      }

      this.logger.log(`Probed ${filePath}: ${JSON.stringify(metadata)}`)
      return metadata
    } catch (error: any) {
      this.logger.error(`Failed to probe ${filePath}: ${error.message}`)
      return {}
    }
  }

  /**
   * Check if ffprobe is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await execAsync('ffprobe -version')
      return true
    } catch {
      return false
    }
  }
}
