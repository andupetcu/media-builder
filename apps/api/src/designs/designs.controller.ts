import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { TeamMemberGuard } from '../auth/guards/team-member.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RequestUser, DesignStatus } from '@media-builder/shared'
import { DesignsService } from './designs.service'

@ApiTags('designs')
@Controller('teams/:teamId/designs')
@UseGuards(TeamMemberGuard)
@ApiBearerAuth()
export class DesignsController {
  constructor(private designsService: DesignsService) {}

  @Get()
  @ApiOperation({ summary: 'List team designs' })
  @ApiQuery({ name: 'status', enum: DesignStatus, required: false })
  async getTeamDesigns(@Param('teamId') teamId: string, @Query('status') status?: DesignStatus) {
    return this.designsService.findTeamDesigns(teamId, status)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get design by ID' })
  async getDesign(@Param('teamId') teamId: string, @Param('id') id: string) {
    return this.designsService.findById(id, teamId)
  }

  @Post()
  @ApiOperation({ summary: 'Create new design' })
  async createDesign(
    @Param('teamId') teamId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: any
  ) {
    return this.designsService.createDesign(teamId, user.id, dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update design' })
  async updateDesign(@Param('teamId') teamId: string, @Param('id') id: string, @Body() dto: any) {
    return this.designsService.updateDesign(id, teamId, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete design' })
  async deleteDesign(@Param('teamId') teamId: string, @Param('id') id: string) {
    await this.designsService.deleteDesign(id, teamId)
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Save version snapshot' })
  async saveVersion(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() dto: { label?: string }
  ) {
    return this.designsService.saveVersion(id, teamId, dto.label)
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get design versions' })
  async getVersions(@Param('teamId') teamId: string, @Param('id') id: string) {
    return this.designsService.getVersions(id, teamId)
  }

  @Post(':id/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restore version' })
  async restoreVersion(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string
  ) {
    return this.designsService.restoreVersion(id, versionId, teamId)
  }

  @Get(':id/export/template')
  @ApiOperation({ summary: 'Export design as JSON template' })
  async exportAsTemplate(@Param('teamId') teamId: string, @Param('id') id: string) {
    return this.designsService.exportAsTemplate(id, teamId)
  }

  @Get(':id/export/json')
  @ApiOperation({ summary: 'Get design JSON data only' })
  async getDesignJson(@Param('teamId') teamId: string, @Param('id') id: string) {
    return this.designsService.getDesignJson(id, teamId)
  }

  @Post('export/templates')
  @ApiOperation({ summary: 'Export multiple designs as templates' })
  async exportMultipleAsTemplates(
    @Param('teamId') teamId: string,
    @Body() dto: { designIds?: string[] }
  ) {
    return this.designsService.exportMultipleAsTemplates(teamId, dto.designIds)
  }
}
