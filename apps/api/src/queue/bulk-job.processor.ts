import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as puppeteer from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateEngineService } from '../bulk/template-engine.service';
import { BulkJobData, BulkJobResult } from './bulk-job.queue';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class BulkJobProcessor {
  private browser: puppeteer.Browser | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateEngine: TemplateEngineService,
    private readonly configService: ConfigService,
  ) {}

  async process(job: Job<BulkJobData>): Promise<BulkJobResult> {
    const { jobId, teamId, userId, designJson, rows, mapping, totalRows } = job.data;

    console.log(`Starting bulk job ${jobId} for ${totalRows} rows`);

    // Initialize browser
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }

    const result: BulkJobResult = {
      jobId,
      totalRows,
      successCount: 0,
      failedCount: 0,
      assets: [],
      errors: [],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      try {
        const rowData = rows[i];
        const progress = Math.round(((i + 1) / totalRows) * 100);
        await job.updateProgress(progress);

        console.log(`Processing row ${i + 1}/${totalRows} for job ${jobId}`);

        // Transform design with this row's data
        const { json: transformedJson, warnings } = this.templateEngine.transformDesign(
          designJson,
          rowData,
          mapping,
        );

        // Render design to image
        const imageBuffer = await this.renderDesignToImage(transformedJson);

        // Save asset to database and filesystem
        const asset = await this.saveAsset(
          teamId,
          userId,
          `${job.data.designName}_row_${i + 1}`,
          imageBuffer,
          transformedJson,
        );

        result.assets.push({
          rowIndex: i,
          assetId: asset.id,
          publicUrl: asset.publicUrl,
          warnings,
        });

        result.successCount++;
      } catch (error) {
        console.error(`Failed to process row ${i} in job ${jobId}:`, error);
        result.errors.push({
          rowIndex: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failedCount++;
      }
    }

    console.log(`Completed bulk job ${jobId}: ${result.successCount} success, ${result.failedCount} failed`);

    return result;
  }

  private async renderDesignToImage(designJson: any): Promise<Buffer> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      // Get design dimensions
      const width = designJson.width || 1920;
      const height = designJson.height || 1080;

      // Set viewport to design size
      await page.setViewport({
        width,
        height,
        deviceScaleFactor: 2, // 2x for better quality
      });

      // Create HTML with Polotno standalone
      const html = this.createPolotnoHTML(designJson, width, height);

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for Polotno to load and render
      await page.waitForFunction(
        'window.polotnoReady === true',
        { timeout: 30000 },
      );

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        clip: {
          x: 0,
          y: 0,
          width,
          height,
        },
      });

      return screenshot as Buffer;
    } finally {
      await page.close();
    }
  }

  private createPolotnoHTML(designJson: any, width: number, height: number): string {
    const polotnoKey = this.configService.get<string>('POLOTNO_KEY') || '';

    return `
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/polotno@3.10.0/standalone.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    #canvas {
      width: ${width}px;
      height: ${height}px;
    }
  </style>
</head>
<body>
  <div id="canvas"></div>
  <script>
    (async () => {
      try {
        const { createStore } = await import('https://unpkg.com/polotno@3.10.0/model/store');

        const store = createStore({
          key: '${polotnoKey}',
          showCredit: false,
        });

        const designJson = ${JSON.stringify(designJson)};
        store.loadJSON(designJson);

        // Wait for images to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        window.polotnoReady = true;

        // Render to canvas
        const canvas = document.getElementById('canvas');
        const { Workspace } = await import('https://unpkg.com/polotno@3.10.0/canvas/workspace');
        Workspace.render(store, canvas);
      } catch (error) {
        console.error('Error rendering Polotno:', error);
      }
    })();
  </script>
</body>
</html>
    `;
  }

  private async saveAsset(
    teamId: string,
    userId: string,
    name: string,
    imageBuffer: Buffer,
    designJson: any,
  ): Promise<{ id: string; publicUrl: string }> {
    const assetsRoot = this.configService.get<string>('ASSETS_ROOT') || '/data/assets';
    const publicBaseUrl = this.configService.get<string>('PUBLIC_BASE_URL') || 'http://localhost:3001';

    // Calculate hash for deduplication
    const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    const hash16 = hash.substring(0, 16);

    // Create directory structure: org/{orgId}/team/{teamId}/image/YYYY/MM/
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get org ID from team
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { orgId: true },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const relativePath = `org/${team.orgId}/team/${teamId}/image/${year}/${month}`;
    const fullDir = path.join(assetsRoot, 'public', relativePath);

    // Create directory if it doesn't exist
    await fs.mkdir(fullDir, { recursive: true });

    // Create filename
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `${hash16}_${slug}.png`;
    const filePath = path.join(fullDir, filename);

    // Write file
    await fs.writeFile(filePath, imageBuffer);

    // Create asset in database
    const asset = await this.prisma.asset.create({
      data: {
        teamId,
        uploadedBy: userId,
        name,
        slug,
        kind: 'IMAGE',
        mimeType: 'image/png',
        sizeBytes: imageBuffer.length,
        hash,
        path: path.join(relativePath, filename),
        publicUrl: `${publicBaseUrl}/assets/public/${relativePath}/${filename}`,
        meta: {
          width: designJson.width || 1920,
          height: designJson.height || 1080,
          generatedFrom: 'bulk_export',
        },
      },
    });

    return {
      id: asset.id,
      publicUrl: asset.publicUrl!,
    };
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
