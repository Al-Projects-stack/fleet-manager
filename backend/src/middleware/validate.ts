import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ParsedShape = {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string | string[] | undefined>;
};

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    // Assign sanitised + coerced values back to request
    const data = result.data as ParsedShape;
    if (data.body !== undefined) req.body = data.body;
    if (data.params !== undefined) req.params = data.params;
    if (data.query !== undefined) req.query = data.query as typeof req.query;

    next();
  };
}
