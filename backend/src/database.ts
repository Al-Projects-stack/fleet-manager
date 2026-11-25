import mongoose from 'mongoose';
import { Telemetry } from './models/Telemetry';

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');

  // The database name always comes from MONGODB_DB_NAME, never from the URI path,
  // so existing deployments keep using fleet_system unless told otherwise.
  const dbName = process.env.MONGODB_DB_NAME || 'fleet_system';
  if (process.env.NODE_ENV === 'test' && !dbName.includes('test')) {
    // Tests drop their database when they finish; never let that hit real data.
    throw new Error(`Refusing to run tests against database "${dbName}". Use a name containing "test".`);
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, { dbName });

  await initTimeSeriesCollections();

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.info('[DB] MongoDB reconnected');
  });
}

// Creates the telemetries time-series collection if it does not already exist.
// Must run after mongoose.connect(). Telemetry documents are immutable after insert.
async function initTimeSeriesCollections(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection not established');

  const existing = await db.listCollections({ name: 'telemetries' }).toArray();

  const isTimeSeries =
    existing.length > 0 &&
    (existing[0] as { options?: { timeseries?: unknown } }).options?.timeseries !== undefined;

  if (existing.length > 0 && !isTimeSeries) {
    // Regular collection exists from a previous run — drop and recreate as time-series
    await db.dropCollection('telemetries');
    console.warn('[DB] Dropped non-timeseries telemetries collection — recreating as timeseries');
  }

  if (!isTimeSeries) {
    await db.createCollection('telemetries', {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'vehicleId',
        granularity: 'minutes',
      },
      expireAfterSeconds: 7_776_000, // 90 days
    });
    console.info('[DB] Created time-series collection: telemetries');
  }

  // Telemetry has autoIndex off; build its indexes now that the collection is time-series.
  await Telemetry.createIndexes();
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}
