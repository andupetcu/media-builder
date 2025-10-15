import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { TeamMemberGuard } from '../auth/guards/team-member.guard'
import { AssetsService } from './assets.service'
import { AssetKind, UpdateAssetDto } from '@media-builder/shared'

@ApiTags('assets')
@Controller('teams/:teamId/assets')
@UseGuards(TeamMemberGuard)
@ApiBearerAuth()
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List team assets' })
  @ApiQuery({ name: 'kind', enum: AssetKind, required: false })
  async getTeamAssets(@Param('teamId') teamId: string, @Query('kind') kind?: AssetKind) {
    return this.assetsService.findTeamAssets(teamId, kind)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  async getAsset(@Param('teamId') teamId: string, @Param('id') id: string) {
    return this.assetsService.findById(id, teamId)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update asset metadata' })
  async updateAsset(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto
  ) {
    return this.assetsService.updateAsset(id, teamId, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete asset' })
  async deleteAsset(@Param('teamId') teamId: string, @Param('id') id: string) {
    await this.assetsService.deleteAsset(id, teamId)
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete multiple assets' })
  async deleteMultipleAssets(
    @Param('teamId') teamId: string,
    @Body() body: { assetIds: string[] }
  ) {
    return this.assetsService.deleteMultipleAssets(body.assetIds, teamId)
  }
}
