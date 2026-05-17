import { buildApp } from './app.js';
import { config } from './config.js';
import { closeRedis } from './services/cache.js';
import { closeDb } from './services/database.js';
import { pauseQueue } from './services/queue.js';

async function main() {
  const app = await buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}, shutting down gracefully`);
    pauseQueue();
    await closeRedis();
    closeDb();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => { shutdown('SIGTERM').catch((err) => { app.log.error(err); process.exit(1); }); });
  process.on('SIGINT',  () => { shutdown('SIGINT').catch((err)  => { app.log.error(err); process.exit(1); }); });

  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
