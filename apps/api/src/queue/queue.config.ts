import { ConfigService } from '@nestjs/config'
import { ConnectionOptions } from 'bullmq'

export const getQueueConfig = (configService: ConfigService): ConnectionOptions => {
  const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379'

  // Parse Redis URL
  const url = new URL(redisUrl)

  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    db: url.pathname ? parseInt(url.pathname.slice(1)) : 0,
  }
}
