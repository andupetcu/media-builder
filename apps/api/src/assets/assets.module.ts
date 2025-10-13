import { Module } from '@nestjs/common'
import { AssetsController } from './assets.controller'
import { AssetsService } from './assets.service'
import { UploadController } from './upload.controller'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [StorageModule],
  controllers: [AssetsController, UploadController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
