import { Module } from '@nestjs/common'
import { TemplatesController } from './templates.controller'
import { TemplatesService } from './templates.service'
import { PsdConverterService } from './psd-converter.service'
import { ChunkedUploadService } from './chunked-upload.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AssetsModule } from '../assets/assets.module'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [PrismaModule, AssetsModule, StorageModule],
  controllers: [TemplatesController],
  providers: [TemplatesService, PsdConverterService, ChunkedUploadService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
