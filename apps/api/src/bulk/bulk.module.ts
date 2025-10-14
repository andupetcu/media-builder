import { Module, forwardRef } from '@nestjs/common';
import { BulkController, JobsController } from './bulk.controller';
import { BulkService } from './bulk.service';
import { TemplateEngineService } from './template-engine.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, forwardRef(() => QueueModule)],
  controllers: [BulkController, JobsController],
  providers: [BulkService, TemplateEngineService],
  exports: [BulkService, TemplateEngineService],
})
export class BulkModule {}
