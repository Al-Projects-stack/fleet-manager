import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Telemetry, Vehicle } from '../models';
import { sendSuccess, sendCreated } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { IngestTelemetryInput } from '../validators/telemetry.validator';
import { AlertService } from '../services/alert.service';
import { parseTelemetryCSV, toNumber } from '../utils/csvParser';

export async function ingestTelemetry(req: Request, res: Response): Promise<void> {
  const body = req.body as IngestTelemetryInput;

  const vehicle = await Vehicle.findById(body.vehicleId);
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  const doc = await Telemetry.create({
    ...body,
    vehicleId: new mongoose.Types.ObjectId(body.vehicleId),
    timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
  });

  // Keep vehicle odometer current
  if (body.odometerKm > vehicle.currentOdometerKm) {
    vehicle.currentOdometerKm = body.odometerKm;
    await vehicle.save();
  }

  // Rule evaluation is fire-and-forget — never block the response
  AlertService.evaluateRules(vehicle, doc).catch((err: Error) =>
    console.error('[AlertService] Rule error:', err.message)
  );

  sendCreated(res, doc);
}

export async function getTelemetry(req: Request, res: Response): Promise<void> {
  const { vehicleId, from, to, limit = '100' } = req.query as Record<string, string>;

  if (!vehicleId) throw new AppError('vehicleId query param is required', 400);

  const match: Record<string, unknown> = {
    vehicleId: new mongoose.Types.ObjectId(vehicleId),
  };

  if (from || to) {
    match.timestamp = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
  }

  const records = await Telemetry.find(match)
    .sort({ timestamp: -1 })
    .limit(Math.min(1000, parseInt(limit)));

  sendSuccess(res, records, 200, { count: records.length });
}

export async function getLatestTelemetry(req: Request, res: Response): Promise<void> {
  const record = await Telemetry.findOne({
    vehicleId: new mongoose.Types.ObjectId(req.params.vehicleId),
  }).sort({ timestamp: -1 });

  if (!record) throw new AppError('No telemetry found for this vehicle', 404);
  sendSuccess(res, record);
}

// CSV bulk ingest — parses uploaded CSV text body (Content-Type: text/csv)
export async function ingestTelemetryCSV(req: Request, res: Response): Promise<void> {
  const csvText = req.body as string;
  if (typeof csvText !== 'string' || !csvText.trim()) {
    throw new AppError('Request body must be a CSV string', 400);
  }

  const rows = parseTelemetryCSV(csvText);
  const results: { inserted: number; errors: string[] } = { inserted: 0, errors: [] };

  for (const row of rows) {
    try {
      const vehicle = await Vehicle.findById(row.vehicleId);
      if (!vehicle) {
        results.errors.push(`Row vehicleId=${row.vehicleId}: vehicle not found`);
        continue;
      }

      const odometerKm = toNumber(row.odometerKm);
      await Telemetry.create({
        vehicleId: new mongoose.Types.ObjectId(row.vehicleId),
        timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
        odometerKm,
        fuelLevelPercent: toNumber(row.fuelLevelPercent),
        fuelConsumedLiters: toNumber(row.fuelConsumedLiters),
        latitude: row.latitude ? toNumber(row.latitude) : null,
        longitude: row.longitude ? toNumber(row.longitude) : null,
        speedKmh: toNumber(row.speedKmh),
        engineTempCelsius: toNumber(row.engineTempCelsius, 90),
        engineHours: toNumber(row.engineHours),
        rawPayload: { source: 'csv' },
      });

      if (odometerKm > vehicle.currentOdometerKm) {
        vehicle.currentOdometerKm = odometerKm;
        await vehicle.save();
      }

      results.inserted++;
    } catch (err) {
      results.errors.push(`Row vehicleId=${row.vehicleId}: ${(err as Error).message}`);
    }
  }

  sendSuccess(res, results, results.errors.length > 0 ? 207 : 201);
}
