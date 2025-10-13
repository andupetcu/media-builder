import { Module } from '@nestjs/common'
import { MediaProbeService } from './media-probe.service'
import { ThumbnailService } from './thumbnail.service'
import { WaveformService } from './waveform.service'
import { VideoProxyService } from './video-proxy.service'

@Module({
  providers: [MediaProbeService, ThumbnailService, WaveformService, VideoProxyService],
  exports: [MediaProbeService, ThumbnailService, WaveformService, VideoProxyService],
})
export class MediaModule {}
