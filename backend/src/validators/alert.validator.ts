import { z } from 'zod';

export const resolveAlertSchema = z.object({
  params: z.object({ id: z.string().length(24, 'Invalid alert ID') }),
  body: z.object({
    workOrderId: z.string().length(24).nullable().optional(),
  }),
});

export const alertIdParamSchema = z.object({
  params: z.object({ id: z.string().length(24, 'Invalid alert ID') }),
});

export const alertQuerySchema = z.object({
  query: z.object({
    vehicleId: z.string().length(24).optional(),
    type: z
      .enum(['fuel_anomaly', 'maintenance_due', 'engine_temp', 'low_fuel', 'custom'])
      .optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    isResolved: z
      .string()
      .transform((v) => v === 'true')
      .optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    page: z.coerce.number().int().min(1).default(1),
  }),
});

export type AlertQuery = z.infer<typeof alertQuerySchema>['query'];
