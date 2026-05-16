import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

let appInstance: FastifyInstance | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!appInstance) {
    appInstance = await buildApp();
  }
  return appInstance;
}

export async function closeApp(): Promise<void> {
  if (appInstance) {
    await appInstance.close();
    appInstance = null;
  }
}
