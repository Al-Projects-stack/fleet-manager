import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { config } from '../config';

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode = 500
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

interface MongoServerError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Custom application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  // MongoDB duplicate key → 409
  const mongoErr = err as MongoServerError;
  if (mongoErr.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'field';
    res.status(409).json({ success: false, error: `Duplicate value for ${field}` });
    return;
  }

  // Mongoose schema validation errors → 400
  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    res.status(400).json({ success: false, error: message });
    return;
  }

  // Invalid ObjectId → 400
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      error: `Invalid ${err.path}: "${String(err.value)}"`,
    });
    return;
  }

  // Fallback — hide internals in production
  console.error('[ERROR]', err);
  res.status(500).json({
    success: false,
    error:
      config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
