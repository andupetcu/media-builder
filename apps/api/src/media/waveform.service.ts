import { Injectable, Logger } from '@nestjs/common'
import { exec } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { readFile, unlink } from 'fs/promises'

const execAsync = promisify(exec)

@Injectable()
export class WaveformService {
  private readonly logger = new Logger(WaveformService.name)

  /**
   * Generate waveform data for audio file
   * Returns array of peak values
   */
  async generateWaveform(inputPath: string, samples: number = 100): Promise<number[]> {
    const tempFile = join(tmpdir(), `wave-${randomUUID()}.txt`)

    try {
      // Extract raw samples using ffmpeg
      const simpleCommand = `ffmpeg -i "${inputPath}" -ac 1 -f f32le -ar 8000 - | head -c ${samples * 4} > "${tempFile}"`

      await execAsync(simpleCommand, { maxBuffer: 10 * 1024 * 1024 })

      // Read the raw float32 data
      const buffer = await readFile(tempFile)
      const samples_data: number[] = []

      for (let i = 0; i < buffer.length; i += 4) {
        if (i + 4 <= buffer.length) {
          const sample = buffer.readFloatLE(i)
          samples_data.push(Math.abs(sample))
        }
      }

      await unlink(tempFile).catch(() => {})

      // Normalize to 0-1 range
      const max = Math.max(...samples_data, 0.0001)
      const normalized = samples_data.map(s => s / max)

      this.logger.log(`Generated waveform: ${inputPath} (${normalized.length} samples)`)
      return normalized
    } catch (error: any) {
      await unlink(tempFile).catch(() => {})
      this.logger.error(`Failed to generate waveform: ${error.message}`)
      // Return empty array on error
      return []
    }
  }

  /**
   * Generate waveform PNG image
   */
  async generateWaveformImage(
    inputPath: string,
    width: number = 800,
    height: number = 100
  ): Promise<Buffer> {
    const tempFile = join(tmpdir(), `wave-${randomUUID()}.png`)

    try {
      const command = `ffmpeg -i "${inputPath}" -filter_complex "aformat=channel_layouts=mono,showwavespic=s=${width}x${height}:colors=0x4A90E2" -frames:v 1 "${tempFile}"`
      await execAsync(command)

      const buffer = await readFile(tempFile)
      await unlink(tempFile).catch(() => {})

      this.logger.log(`Generated waveform image: ${inputPath}`)
      return buffer
    } catch (error: any) {
      await unlink(tempFile).catch(() => {})
      this.logger.error(`Failed to generate waveform image: ${error.message}`)
      throw error
    }
  }
}
