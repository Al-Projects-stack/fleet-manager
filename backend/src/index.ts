import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './database';
import { config } from './config';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  console.info('[DB] MongoDB connected');

  const app = createApp();

  const server = app.listen(config.PORT, () => {
    console.info(
      `[Server] Listening on port ${config.PORT} (${config.NODE_ENV})`
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.info(`[Server] ${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      console.info('[Server] Shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled rejection:', reason);
    void shutdown('unhandledRejection');
  });
}

bootstrap().catch((err: Error) => {
  console.error('[Server] Fatal startup error:', err.message);
  process.exit(1);
});
