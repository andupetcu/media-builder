import { Worker, Queue } from 'bullmq'
import Redis from 'ioredis'
import 'dotenv/config'
import { processMediaAsset } from './processors/media-processor'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

// Export queue (Phase 4)
const exportWorker = new Worker(
  'exports',
  async job => {
    console.log(`Processing export job ${job.id}:`, job.data)
    // Implementation in Phase 4
    throw new Error('Export worker not yet implemented')
  },
  { connection }
)

// Video render queue (Phase 9-10)
const videoWorker = new Worker(
  'video-render',
  async job => {
    console.log(`Processing video render job ${job.id}:`, job.data)
    // Implementation in Phase 9-10
    throw new Error('Video worker not yet implemented')
  },
  { connection }
)

// Media processing queue (Phase 2)
const mediaWorker = new Worker(
  'media-processing',
  async job => {
    console.log(`Processing media job ${job.id}:`, job.data)
    await processMediaAsset(job.data)
    console.log(`Completed media processing for asset ${job.data.assetId}`)
  },
  {
    connection,
    concurrency: 2, // Process 2 assets at a time
  }
)

// Bulk operations queue (Phase 12)
const bulkWorker = new Worker(
  'bulk-operations',
  async job => {
    console.log(`Processing bulk job ${job.id}:`, job.data)
    // Implementation in Phase 12
    throw new Error('Bulk worker not yet implemented')
  },
  { connection }
)

// Error handlers
;[exportWorker, videoWorker, mediaWorker, bulkWorker].forEach(worker => {
  worker.on('completed', job => {
    console.log(`Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err)
  })
})

// eslint-disable-next-line no-console
console.log('Workers started successfully')
console.log('- Export worker: ready (not implemented)')
console.log('- Video worker: ready (not implemented)')
console.log('- Media processing worker: ready')
console.log('- Bulk operations worker: ready (not implemented)')

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...')
  await Promise.all([
    exportWorker.close(),
    videoWorker.close(),
    mediaWorker.close(),
    bulkWorker.close(),
  ])
  await connection.quit()
  process.exit(0)
})
