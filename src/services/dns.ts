import { promises as dnsPromises } from 'dns';
import { config } from '../config.js';

export async function hasMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await withTimeout(
      dnsPromises.resolveMx(domain),
      config.dns.timeoutMs
    );
    return records.length > 0;
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DNS timeout')), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}
