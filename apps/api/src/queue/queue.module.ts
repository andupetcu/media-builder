import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '../prisma/prisma.module'
import { BulkModule } from '../bulk/bulk.module'
import { BulkJobQueue } from './bulk-job.queue'
import { BulkJobProcessor } from './bulk-job.processor'

@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => BulkModule)],
  providers: [BulkJobQueue, BulkJobProcessor],
  exports: [BulkJobQueue],
})
export class QueueModule {}
