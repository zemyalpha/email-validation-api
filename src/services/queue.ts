import PQueue from 'p-queue';
import { config } from '../config.js';
import { BulkJob, ValidationResult } from '../types.js';
import { getBulkJob, updateBulkJob } from './database.js';
import { validateUrl } from './ssrf.js';
import { validateEmail } from './validation.js';

const queue = new PQueue({ concurrency: config.bulk.concurrency });

export function enqueueJob(jobId: string, keyHash: string): void {
  queue.add(() => processJob(jobId, keyHash)).catch((err: unknown) => {
    console.error(`[queue] job ${jobId} enqueue error:`, err);
  });
}

async function processJob(jobId: string, keyHash: string): Promise<void> {
  const job = getBulkJob(jobId, keyHash);
  if (!job) {
    console.error(`[queue] job ${jobId} not found`);
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
    console.error(`[queue] job ${jobId} failed:`, err);
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
    console.warn(`[webhook] refused to send to ${url}: ${urlCheck.reason}`);
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
      console.warn(`[webhook] non-OK response ${response.status} for ${url}`);
    }
  } catch (err) {
    console.error(`[webhook] failed to deliver to ${url}:`, err);
  }
}
