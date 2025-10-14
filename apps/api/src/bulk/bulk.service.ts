import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateEngineService } from './template-engine.service';
import { PreviewBulkDto } from './dto/preview-bulk.dto';
import { GenerateBulkDto } from './dto/generate-bulk.dto';
import { BulkJobQueue } from '../queue/bulk-job.queue';
import * as crypto from 'crypto';

@Injectable()
export class BulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateEngine: TemplateEngineService,
    private readonly jobQueue: BulkJobQueue,
  ) {}

  async previewBatch(teamId: string, designId: string, dto: PreviewBulkDto) {
    // Load design
    const design = await this.prisma.design.findFirst({
      where: {
        id: designId,
        teamId,
      },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    // Limit preview to first N rows (default 5)
    const previewCount = dto.previewCount || 5;
    const previewRows = dto.rows.slice(0, previewCount);

    // Transform each row
    const results = this.templateEngine.transformBatch(design.doc, previewRows, dto.mapping);

    return {
      designId: design.id,
      designName: design.name,
      totalRows: dto.rows.length,
      previewCount: results.length,
      previews: results.map((result) => ({
        rowIndex: result.rowIndex,
        rowData: result.rowData,
        transformedJson: result.json,
        warnings: result.warnings,
      })),
    };
  }

  async generateBatch(
    teamId: string,
    designId: string,
    userId: string,
    dto: GenerateBulkDto,
  ) {
    // Load design
    const design = await this.prisma.design.findFirst({
      where: {
        id: designId,
        teamId,
      },
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    // Generate unique job ID
    const jobId = crypto.randomBytes(16).toString('hex');

    // Add job to queue
    await this.jobQueue.addJob({
      jobId,
      designId: design.id,
      teamId,
      userId,
      designName: dto.designName || design.name,
      designJson: design.doc,
      rows: dto.rows,
      mapping: dto.mapping,
      totalRows: dto.rows.length,
    });

    return {
      jobId,
      designId: design.id,
      designName: design.name,
      totalRows: dto.rows.length,
      status: 'queued',
      message: `Batch job created for ${dto.rows.length} designs`,
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.jobQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();
    const progress = await job.progress;

    return {
      jobId: job.id,
      status: state,
      progress,
      data: {
        designId: job.data.designId,
        designName: job.data.designName,
        totalRows: job.data.totalRows,
      },
    };
  }

  async getJobResults(jobId: string) {
    const job = await this.jobQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();

    if (state !== 'completed') {
      throw new NotFoundException(
        `Job is not completed yet. Current status: ${state}`,
      );
    }

    const result = await job.returnvalue;

    return {
      jobId: job.id,
      status: 'completed',
      result,
    };
  }
}
