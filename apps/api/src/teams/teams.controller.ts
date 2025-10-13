import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { OrgMemberGuard } from '../auth/guards/org-member.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RequestUser } from '@media-builder/shared'
import { TeamsService } from './teams.service'

@ApiTags('teams')
@Controller('orgs/:orgId/teams')
@UseGuards(OrgMemberGuard)
@ApiBearerAuth()
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  async getOrgTeams(@Param('orgId') orgId: string, @CurrentUser() user: RequestUser) {
    return this.teamsService.findOrgTeams(orgId, user.id)
  }
}
