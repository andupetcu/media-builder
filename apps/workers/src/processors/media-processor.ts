import { PrismaClient } from '@media-builder/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'
import sharp from 'sharp'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { readFile, unlink } from 'fs/promises'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

const ASSETS_ROOT = process.env.ASSETS_ROOT || '/data/assets'
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:8080/assets'

interface MediaJobData {
  assetId: string
  kind: string
  mimeType: string
  path: string
}

export async function processMediaAsset(data: MediaJobData) {
  const { assetId, kind, mimeType, path } = data

  console.log(`Processing asset ${assetId} (${kind})`)

  const absolutePath = join(ASSETS_ROOT, path)
  const updates: any = { meta: {} }

  try {
    // Process based on asset kind
    if (kind === 'IMAGE') {
      await processImage(assetId, absolutePath, mimeType, updates)
    } else if (kind === 'VIDEO') {
      await processVideo(assetId, absolutePath, updates)
    } else if (kind === 'AUDIO') {
      await processAudio(assetId, absolutePath, updates)
    }

    // Update asset with metadata
    await prisma.asset.update({
      where: { id: assetId },
      data: updates,
    })

    console.log(`Completed processing asset ${assetId}`)
  } catch (error: any) {
    console.error(`Failed to process asset ${assetId}:`, error.message)
    throw error
  }
}

async function processImage(assetId: string, filePath: string, _mimeType: string, updates: any) {
  // Get image metadata
  const metadata = await sharp(filePath).metadata()
  updates.meta = {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
  }

  // Generate thumbnail
  const thumbnail = await sharp(filePath)
    .resize(400, 400, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer()

  // Save thumbnail
  const thumbPath = await saveThumbnail(assetId, thumbnail)
  updates.thumbnailUrl = `${PUBLIC_BASE_URL}/${thumbPath.replace('public/', '')}`

  console.log(`Generated image thumbnail for ${assetId}`)
}

async function processVideo(assetId: string, filePath: string, updates: any) {
  // Probe video metadata
  const probeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
  const { stdout } = await execAsync(probeCommand)
  const data = JSON.parse(stdout)

  const videoStream = data.streams?.find((s: any) => s.codec_type === 'video')
  if (videoStream) {
    updates.meta = {
      width: videoStream.width,
      height: videoStream.height,
      codec: videoStream.codec_name,
      duration: parseFloat(data.format?.duration || 0),
    }

    if (videoStream.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split('/')
      updates.meta.fps = parseInt(num, 10) / parseInt(den, 10)
    }
  }

  // Generate video thumbnail
  const tempThumb = join(tmpdir(), `thumb-${randomUUID()}.jpg`)
  try {
    const thumbCommand = `ffmpeg -i "${filePath}" -ss 00:00:01 -vframes 1 -vf "scale=400:400:force_original_aspect_ratio=decrease" "${tempThumb}"`
    await execAsync(thumbCommand)

    const thumbBuffer = await sharp(tempThumb).jpeg({ quality: 85 }).toBuffer()
    await unlink(tempThumb).catch(() => {})

    const thumbPath = await saveThumbnail(assetId, thumbBuffer)
    updates.thumbnailUrl = `${PUBLIC_BASE_URL}/${thumbPath.replace('public/', '')}`

    console.log(`Generated video thumbnail for ${assetId}`)
  } catch (error: any) {
    console.error(`Failed to generate video thumbnail: ${error.message}`)
  }

  // Generate 540p proxy
  try {
    const tempProxy = join(tmpdir(), `proxy-${randomUUID()}.mp4`)
    const proxyCommand = `ffmpeg -i "${filePath}" -vf "scale=-2:540" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${tempProxy}"`
    await execAsync(proxyCommand, { maxBuffer: 100 * 1024 * 1024 })

    const proxyPath = await saveProxy(assetId, tempProxy)
    updates.proxyUrl = `${PUBLIC_BASE_URL}/${proxyPath.replace('public/', '')}`

    await unlink(tempProxy).catch(() => {})

    console.log(`Generated video proxy for ${assetId}`)
  } catch (error: any) {
    console.error(`Failed to generate video proxy: ${error.message}`)
  }
}

async function processAudio(assetId: string, filePath: string, updates: any) {
  // Probe audio metadata
  const probeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
  const { stdout } = await execAsync(probeCommand)
  const data = JSON.parse(stdout)

  const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio')
  if (audioStream) {
    updates.meta = {
      codec: audioStream.codec_name,
      duration: parseFloat(data.format?.duration || 0),
      channels: audioStream.channels,
      sampleRate: audioStream.sample_rate,
    }
  }

  // Generate waveform data
  try {
    const waveform = await generateWaveform(filePath, 100)
    updates.meta.waveform = waveform
    console.log(`Generated waveform for ${assetId}`)
  } catch (error: any) {
    console.error(`Failed to generate waveform: ${error.message}`)
  }
}

async function generateWaveform(filePath: string, samples: number): Promise<number[]> {
  const tempFile = join(tmpdir(), `wave-${randomUUID()}.txt`)

  try {
    const command = `ffmpeg -i "${filePath}" -ac 1 -f f32le -ar 8000 - | head -c ${samples * 4} > "${tempFile}"`
    await execAsync(command, { maxBuffer: 10 * 1024 * 1024 })

    const buffer = await readFile(tempFile)
    const samplesData: number[] = []

    for (let i = 0; i < buffer.length; i += 4) {
      if (i + 4 <= buffer.length) {
        const sample = buffer.readFloatLE(i)
        samplesData.push(Math.abs(sample))
      }
    }

    await unlink(tempFile).catch(() => {})

    // Normalize to 0-1 range
    const max = Math.max(...samplesData, 0.0001)
    return samplesData.map(s => s / max)
  } catch (error: any) {
    await unlink(tempFile).catch(() => {})
    throw error
  }
}

async function saveThumbnail(assetId: string, buffer: Buffer): Promise<string> {
  const relativePath = `public/thumbnails/${assetId}.jpg`
  const absolutePath = join(ASSETS_ROOT, relativePath)

  // Ensure directory exists
  await execAsync(`mkdir -p "${join(ASSETS_ROOT, 'public/thumbnails')}"`)

  // Write file
  await pipeline(
    (async function* () {
      yield buffer
    })(),
    createWriteStream(absolutePath)
  )

  return relativePath
}

async function saveProxy(assetId: string, tempPath: string): Promise<string> {
  const relativePath = `public/proxies/${assetId}.mp4`
  const absolutePath = join(ASSETS_ROOT, relativePath)

  // Ensure directory exists
  await execAsync(`mkdir -p "${join(ASSETS_ROOT, 'public/proxies')}"`)

  // Move file
  await execAsync(`mv "${tempPath}" "${absolutePath}"`)

  return relativePath
}
