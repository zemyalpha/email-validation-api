import PQueue from 'p-queue';
import { config } from '../config.js';
import { BulkJob, ValidationResult } from '../types.js';
import { getBulkJob, updateBulkJob } from './database.js';
import { logger } from './logger.js';
import { validateUrl } from './ssrf.js';
import { validateEmail } from './validation.js';

const queue = new PQueue({ concurrency: config.bulk.concurrency });

export function enqueueJob(jobId: string, keyHash: string): void {
  queue.add(() => processJob(jobId, keyHash)).catch((err: unknown) => {
    logger.error({ jobId, err }, '[queue] job enqueue error');
  });
}

export function pauseQueue(): void {
  queue.pause();
}

async function processJob(jobId: string, keyHash: string): Promise<void> {
  const job = getBulkJob(jobId, keyHash);
  if (!job) {
    logger.error({ jobId }, '[queue] job not found');
    return;
  }

  updateBulkJob(jobId, 'processing');

  try {
    const BATCH_SIZE = 5;
    const results: ValidationResult[] = [];
    for (let i = 0; i < job.emails.length; i += BATCH_SIZE) {
      const batch = job.emails.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map((email) => validateEmail(email)));
      results.push(...batchResults);
    }

    updateBulkJob(jobId, 'completed', results);

    if (job.webhook_url) {
      await sendWebhook(job.webhook_url, { ...job, status: 'completed', results });
    }
  } catch (err) {
    logger.error({ jobId, err }, '[queue] job failed');
    updateBulkJob(jobId, 'failed');

    if (job.webhook_url) {
      await sendWebhook(job.webhook_url, { ...job, status: 'failed' });
    }
  }
}

async function sendWebhook(url: string, payload: Partial<BulkJob>): Promise<void> {
  // Defense in depth: re-validate the URL right before egress in case DNS has
  // changed since the job was queued (rebinding).
  const urlCheck = await validateUrl(url);
  if (!urlCheck.ok) {
    logger.warn({ url, reason: urlCheck.reason }, '[webhook] refused SSRF policy');
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      logger.warn({ url, status: response.status }, '[webhook] non-OK response');
    }
  } catch (err) {
    logger.error({ url, err }, '[webhook] failed to deliver');
  }
}
