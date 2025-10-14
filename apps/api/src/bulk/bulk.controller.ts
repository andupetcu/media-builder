import { Controller, Post, Get, Body, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/team-member.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BulkService } from './bulk.service';
import { PreviewBulkDto } from './dto/preview-bulk.dto';
import { GenerateBulkDto } from './dto/generate-bulk.dto';

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

  @Post('generate')
  async generate(
    @Param('teamId') teamId: string,
    @Param('designId') designId: string,
    @CurrentUser() user: any,
    @Body() dto: GenerateBulkDto,
  ) {
    return this.bulkService.generateBatch(teamId, designId, user.id, dto);
  }
}

// Job status endpoints (not tied to specific design)
@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly bulkService: BulkService) {}

  @Get(':jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.bulkService.getJobStatus(jobId);
  }

  @Get(':jobId/results')
  async getJobResults(@Param('jobId') jobId: string) {
    return this.bulkService.getJobResults(jobId);
  }
}
