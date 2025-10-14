import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateEngineService } from './template-engine.service';
import { PreviewBulkDto } from './dto/preview-bulk.dto';

@Injectable()
export class BulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateEngine: TemplateEngineService,
  ) {}

  async previewBatch(
    teamId: string,
    designId: string,
    dto: PreviewBulkDto,
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

    // Limit preview to first N rows (default 5)
    const previewCount = dto.previewCount || 5;
    const previewRows = dto.rows.slice(0, previewCount);

    // Transform each row
    const results = this.templateEngine.transformBatch(
      design.doc,
      previewRows,
      dto.mapping,
    );

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
}
