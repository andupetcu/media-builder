import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { getQueueConfig } from './queue.config';
import { BulkJobProcessor } from './bulk-job.processor';

export interface BulkJobData {
  jobId: string;
  designId: string;
  teamId: string;
  userId: string;
  designName: string;
  designJson: any;
  rows: Record<string, any>[];
  mapping: Record<string, string>;
  totalRows: number;
}

export interface BulkJobResult {
  jobId: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  assets: Array<{
    rowIndex: number;
    assetId: string;
    publicUrl: string;
    warnings: string[];
  }>;
  errors: Array<{
    rowIndex: number;
    error: string;
  }>;
}

@Injectable()
export class BulkJobQueue implements OnModuleInit, OnModuleDestroy {
  private queue: Queue<BulkJobData, BulkJobResult>;
  private worker: Worker<BulkJobData, BulkJobResult>;

  constructor(
    private readonly configService: ConfigService,
    private readonly processor: BulkJobProcessor,
  ) {
    const connection = getQueueConfig(this.configService);

    this.queue = new Queue<BulkJobData, BulkJobResult>('bulk-export', {
      connection,
    });

    this.worker = new Worker<BulkJobData, BulkJobResult>(
      'bulk-export',
      async (job: Job<BulkJobData>) => this.processor.process(job),
      {
        connection,
        concurrency: 2, // Process 2 jobs in parallel
      },
    );
  }

  async onModuleInit() {
    // Set up event listeners
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    this.worker.on('progress', (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`);
    });
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.queue.close();
  }

  async addJob(data: BulkJobData): Promise<Job<BulkJobData, BulkJobResult>> {
    return this.queue.add('bulk-export', data, {
      jobId: data.jobId,
      removeOnComplete: false, // Keep completed jobs for result retrieval
      removeOnFail: false, // Keep failed jobs for debugging
    });
  }

  async getJob(jobId: string): Promise<Job<BulkJobData, BulkJobResult> | undefined> {
    return this.queue.getJob(jobId);
  }

  async getJobState(jobId: string): Promise<string | undefined> {
    const job = await this.getJob(jobId);
    if (!job) return undefined;
    return job.getState();
  }

  async getJobProgress(jobId: string): Promise<number | object | undefined> {
    const job = await this.getJob(jobId);
    if (!job) return undefined;
    const progress = await job.progress;
    // BullMQ progress can be number, string, or object - normalize to number or object
    if (typeof progress === 'string') {
      const parsed = parseInt(progress, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return progress as number | object | undefined;
  }
}
