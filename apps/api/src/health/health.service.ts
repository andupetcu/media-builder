import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'unknown',
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`
      checks.database = 'connected'
    } catch (error) {
      checks.database = 'disconnected'
      checks.status = 'degraded'
    }

    return checks
  }
}
