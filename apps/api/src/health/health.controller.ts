import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Public } from '../auth/decorators/public.decorator'
import { HealthService } from './health.service'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    return this.healthService.check()
  }
}
