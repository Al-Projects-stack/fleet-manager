import { z } from 'zod';

export const createWorkOrderSchema = z.object({
  body: z.object({
    vehicleId: z.string().length(24, 'Invalid vehicle ID'),
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().min(1, 'Description is required').max(2000),
    type: z.enum(['preventive', 'corrective', 'inspection']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    assignedToId: z.string().length(24).nullable().optional(),
    estimatedCostUsd: z.number().min(0).default(0),
    scheduledDate: z.string().datetime().nullable().optional(),
    alertId: z.string().length(24).nullable().optional(),
    odometerAtCreationKm: z.number().min(0).default(0),
    partsUsed: z.array(z.string().max(200)).max(50).default([]),
  }),
});

export const updateWorkOrderSchema = z.object({
  params: z.object({ id: z.string().length(24, 'Invalid work order ID') }),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assignedToId: z.string().length(24).nullable().optional(),
    estimatedCostUsd: z.number().min(0).optional(),
    actualCostUsd: z.number().min(0).nullable().optional(),
    scheduledDate: z.string().datetime().nullable().optional(),
    completedDate: z.string().datetime().nullable().optional(),
    partsUsed: z.array(z.string().max(200)).max(50).optional(),
  }),
});

export const addNoteSchema = z.object({
  params: z.object({ id: z.string().length(24, 'Invalid work order ID') }),
  body: z.object({
    content: z.string().trim().min(1, 'Note content is required').max(2000),
  }),
});

export const workOrderQuerySchema = z.object({
  query: z.object({
    vehicleId: z.string().length(24).optional(),
    assignedToId: z.string().length(24).optional(),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    page: z.coerce.number().int().min(1).default(1),
  }),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>['body'];
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>['body'];
