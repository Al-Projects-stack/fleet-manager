import { Response } from 'express';

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  count?: number;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: ApiMeta;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiMeta
): void {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T, meta?: ApiMeta): void {
  sendSuccess(res, data, 201, meta);
}

export function sendError(res: Response, message: string, statusCode = 500): void {
  res.status(statusCode).json({ success: false, error: message } as ApiResponse);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
