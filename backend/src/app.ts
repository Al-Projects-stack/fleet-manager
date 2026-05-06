import 'express-async-errors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { httpLogger } from './utils/logger';
import { globalRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes/index';

export function createApp(): Application {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.use(httpLogger);

  // JSON + URL-encoded bodies
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  // text/csv for CSV ingest endpoint
  app.use(express.text({ type: 'text/csv', limit: '10mb' }));
  app.use(cookieParser());

  app.use('/api', globalRateLimiter);

  app.use('/api/v1', apiRouter);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date() } });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  // Must be last — catches errors forwarded via next(err)
  app.use(errorHandler);

  return app;
}
