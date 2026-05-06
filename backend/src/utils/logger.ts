import morgan from 'morgan';
import { RequestHandler } from 'express';
import { config } from '../config';

export const httpLogger: RequestHandler = morgan(
  config.NODE_ENV === 'production' ? 'combined' : 'dev'
);

export const logger = {
  info: (msg: string, ...args: unknown[]): void =>
    console.info(`[INFO]  ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]): void =>
    console.warn(`[WARN]  ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]): void =>
    console.error(`[ERROR] ${msg}`, ...args),
};
