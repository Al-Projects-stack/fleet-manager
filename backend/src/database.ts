import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, { dbName: 'fleet_system' });

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

  if (existing.length > 0) {
    const isTimeSeries =
      (existing[0] as { options?: { timeseries?: unknown } }).options?.timeseries !== undefined;
    if (isTimeSeries) return; // already correct — nothing to do
    // Regular collection exists from a previous run — drop and recreate as time-series
    await db.dropCollection('telemetries');
    console.warn('[DB] Dropped non-timeseries telemetries collection — recreating as timeseries');
  }

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

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}
