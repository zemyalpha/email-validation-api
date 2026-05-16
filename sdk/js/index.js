/**
 * Email Validation API — JavaScript/Node.js SDK
 *
 * Install: npm install node-fetch   (Node < 18; Node 18+ has fetch built-in)
 * Usage:
 *   import { EmailValidationClient } from './index.js';
 *   const client = new EmailValidationClient('evapi_your_key_here');
 *   const result = await client.validate('user@example.com');
 */

export class EmailValidationClient {
  /**
   * @param {string} apiKey   Your X-API-Key
   * @param {string} baseUrl  API base URL (default: https://emailvalidation.fly.dev)
   */
  constructor(apiKey, baseUrl = 'https://emailvalidation.fly.dev') {
    if (!apiKey) throw new Error('apiKey is required');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /** @private */
  async _request(method, path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error ?? `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /**
   * Validate a single email address.
   * @param {string} email
   * @returns {Promise<ValidationResult>}
   */
  validate(email) {
    return this._request('POST', '/v1/validate', { email });
  }

  /**
   * Submit up to 100 emails for async bulk validation.
   * @param {string[]} emails
   * @param {string}   [webhookUrl]  Called with results when the job completes
   * @returns {Promise<{job_id: string, status: string, count: number}>}
   */
  bulkValidate(emails, webhookUrl) {
    return this._request('POST', '/v1/validate/bulk', {
      emails,
      ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
    });
  }

  /**
   * Poll the status and results of a bulk job.
   * @param {string} jobId
   * @returns {Promise<BulkJob>}
   */
  getJob(jobId) {
    return this._request('GET', `/v1/jobs/${jobId}`);
  }

  /**
   * Return current quota usage for this API key.
   * @returns {Promise<UsageStats>}
   */
  getUsage() {
    return this._request('GET', '/v1/usage');
  }

  /**
   * Helper: validate and poll until the job completes (max wait: timeoutMs).
   * Suitable for small lists where you want synchronous-style results.
   * @param {string[]} emails
   * @param {number}   [timeoutMs=30000]
   * @returns {Promise<ValidationResult[]>}
   */
  async bulkValidateSync(emails, timeoutMs = 30_000) {
    const { job_id } = await this.bulkValidate(emails);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1000));
      const job = await this.getJob(job_id);
      if (job.status === 'completed') return job.results ?? [];
      if (job.status === 'failed') throw new Error(`Bulk job ${job_id} failed`);
    }
    throw new Error(`Bulk job ${job_id} timed out after ${timeoutMs}ms`);
  }
}

/**
 * @typedef {Object} ValidationResult
 * @property {string}  email
 * @property {number}  score        0–100 quality score
 * @property {boolean} valid
 * @property {Object}  checks
 * @property {boolean} checks.syntax
 * @property {boolean} checks.mx
 * @property {boolean} checks.disposable
 * @property {boolean} checks.role_based
 * @property {boolean} checks.catch_all
 * @property {string|null} suggestion  Corrected email if typo detected
 * @property {boolean} cached
 */

/**
 * @typedef {Object} BulkJob
 * @property {string}             job_id
 * @property {string}             status  queued|processing|completed|failed
 * @property {ValidationResult[]|undefined} results
 * @property {string}             created_at
 * @property {string|undefined}   completed_at
 */

/**
 * @typedef {Object} UsageStats
 * @property {string} plan
 * @property {number} requests_today
 * @property {number} daily_limit
 * @property {string} resets_at
 */
