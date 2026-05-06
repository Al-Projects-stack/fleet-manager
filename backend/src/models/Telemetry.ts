import mongoose, { Document, Schema, Model } from 'mongoose';

// Targets the 'telemetries' native MongoDB time-series collection.
// That collection is created in database.ts on startup.
// Time-series documents are IMMUTABLE after insert — no updates or deletes.

export interface ITelemetry {
  vehicleId: mongoose.Types.ObjectId;
  timestamp: Date;
  odometerKm: number;
  fuelLevelPercent: number;
  fuelConsumedLiters: number;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number;
  engineTempCelsius: number;
  engineHours: number;
  rawPayload: Record<string, unknown>;
}

export interface ITelemetryDocument extends ITelemetry, Document {}

const telemetrySchema = new Schema<ITelemetryDocument>(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
    },
    timestamp: {
      type: Date,
      required: [true, 'Timestamp is required'],
      default: Date.now,
    },
    odometerKm: {
      type: Number,
      required: [true, 'Odometer reading is required'],
      min: [0, 'Odometer cannot be negative'],
    },
    fuelLevelPercent: {
      type: Number,
      required: [true, 'Fuel level is required'],
      min: [0, 'Fuel level cannot be negative'],
      max: [100, 'Fuel level cannot exceed 100%'],
    },
    fuelConsumedLiters: {
      type: Number,
      default: 0,
      min: [0, 'Fuel consumed cannot be negative'],
    },
    latitude: {
      type: Number,
      default: null,
      min: [-90, 'Latitude must be >= -90'],
      max: [90, 'Latitude must be <= 90'],
    },
    longitude: {
      type: Number,
      default: null,
      min: [-180, 'Longitude must be >= -180'],
      max: [180, 'Longitude must be <= 180'],
    },
    speedKmh: {
      type: Number,
      default: 0,
      min: [0, 'Speed cannot be negative'],
    },
    engineTempCelsius: {
      type: Number,
      default: 90,
    },
    engineHours: {
      type: Number,
      default: 0,
      min: [0, 'Engine hours cannot be negative'],
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'telemetries',
    autoCreate: false, // Mongoose must NOT create this collection — database.ts does it as time-series
  }
);

// Secondary index for range queries (vehicleId + time window).
// The time-series collection already has a clustered index on timestamp.
telemetrySchema.index({ vehicleId: 1, timestamp: -1 });

export const Telemetry: Model<ITelemetryDocument> = mongoose.model<ITelemetryDocument>(
  'Telemetry',
  telemetrySchema
);
