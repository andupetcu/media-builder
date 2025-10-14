import {
  Controller,
  Post,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/team-member.guard';
import { BulkService } from './bulk.service';
import { PreviewBulkDto } from './dto/preview-bulk.dto';

@Controller('teams/:teamId/designs/:designId/bulk')
@UseGuards(JwtAuthGuard, TeamMemberGuard)
export class BulkController {
  constructor(private readonly bulkService: BulkService) {}

  @Post('preview')
  async preview(
    @Param('teamId') teamId: string,
    @Param('designId') designId: string,
    @Body() dto: PreviewBulkDto,
  ) {
    return this.bulkService.previewBatch(teamId, designId, dto);
  }
}
