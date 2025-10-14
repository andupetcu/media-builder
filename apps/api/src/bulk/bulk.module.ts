import { Module } from '@nestjs/common';
import { BulkController } from './bulk.controller';
import { BulkService } from './bulk.service';
import { TemplateEngineService } from './template-engine.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BulkController],
  providers: [BulkService, TemplateEngineService],
  exports: [BulkService, TemplateEngineService],
})
export class BulkModule {}
