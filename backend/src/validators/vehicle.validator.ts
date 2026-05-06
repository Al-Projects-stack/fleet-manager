import { z } from 'zod';

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;
const CURRENT_YEAR = new Date().getFullYear();

const vehicleBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  make: z.string().trim().min(1, 'Make is required').max(50),
  model: z.string().trim().min(1, 'Model is required').max(50),
  year: z.number().int().min(1900).max(CURRENT_YEAR + 1),
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(VIN_REGEX, 'VIN must be 17 alphanumeric characters (no I, O, Q)'),
  licensePlate: z.string().trim().toUpperCase().min(1).max(20),
  fuelType: z.enum(['gasoline', 'diesel', 'electric', 'hybrid', 'cng']),
  fuelCapacityLiters: z.number().positive('Fuel capacity must be positive'),
  currentOdometerKm: z.number().min(0).default(0),
  status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
  lastMaintenanceDate: z.string().datetime().nullable().optional(),
  nextMaintenanceOdometerKm: z.number().min(0).nullable().optional(),
  assignedDriverId: z.string().length(24, 'Invalid driver ID').nullable().optional(),
  notes: z.string().max(1000).default(''),
});

export const createVehicleSchema = z.object({
  body: vehicleBodySchema,
});

export const updateVehicleSchema = z.object({
  params: z.object({ id: z.string().length(24, 'Invalid vehicle ID') }),
  body: vehicleBodySchema.partial(),
});

export const vehicleIdParamSchema = z.object({
  params: z.object({ id: z.string().length(24, 'Invalid vehicle ID') }),
});

export const listVehiclesQuerySchema = z.object({
  query: z.object({
    status: z.enum(['active', 'inactive', 'maintenance']).optional(),
    fuelType: z.enum(['gasoline', 'diesel', 'electric', 'hybrid', 'cng']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  }),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>['body'];
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>['body'];
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>['query'];
