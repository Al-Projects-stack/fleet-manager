import { z } from 'zod';

export const ingestTelemetrySchema = z.object({
  body: z.object({
    vehicleId: z.string().length(24, 'Invalid vehicle ID'),
    timestamp: z.string().datetime().optional(),
    odometerKm: z.number().min(0, 'Odometer cannot be negative'),
    fuelLevelPercent: z.number().min(0).max(100),
    fuelConsumedLiters: z.number().min(0).default(0),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    speedKmh: z.number().min(0).default(0),
    engineTempCelsius: z.number().default(90),
    engineHours: z.number().min(0).default(0),
    rawPayload: z.record(z.unknown()).default({}),
  }),
});

export const telemetryQuerySchema = z.object({
  query: z.object({
    vehicleId: z.string().length(24, 'Invalid vehicle ID'),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(1000).default(100),
  }),
});

export const vehicleIdParamSchema = z.object({
  params: z.object({ vehicleId: z.string().length(24, 'Invalid vehicle ID') }),
});

// PHASE 2: CSV batch upload schema — multipart/form-data with file field
export type IngestTelemetryInput = z.infer<typeof ingestTelemetrySchema>['body'];
