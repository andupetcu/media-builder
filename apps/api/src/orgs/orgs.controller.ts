import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RequestUser } from '@media-builder/shared'
import { OrgsService } from './orgs.service'

@ApiTags('orgs')
@Controller('orgs')
@ApiBearerAuth()
export class OrgsController {
  constructor(private orgsService: OrgsService) {}

  @Get()
  async getMyOrgs(@CurrentUser() user: RequestUser) {
    return this.orgsService.findUserOrgs(user.id)
  }
}
