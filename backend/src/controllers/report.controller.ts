import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Vehicle, WorkOrder, Alert, Telemetry } from '../models';
import { sendSuccess } from '../utils/response';

// PHASE 2: PDF export via pdfkit — returns structured JSON for frontend rendering now
// PHASE 2: CSV download via csv-stringify

export async function getFleetSummary(req: Request, res: Response): Promise<void> {
  const { from, to } = req.query as { from?: string; to?: string };

  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const [vehicleStats, alertStats, workOrderStats] = await Promise.all([
    Vehicle.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Alert.aggregate([
      ...(hasDateFilter ? [{ $match: { triggeredAt: dateFilter } }] : []),
      {
        $group: {
          _id: { severity: '$severity', isResolved: '$isResolved' },
          count: { $sum: 1 },
        },
      },
    ]),

    WorkOrder.aggregate([
      ...(hasDateFilter ? [{ $match: { createdAt: dateFilter } }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalEstimatedUsd: { $sum: '$estimatedCostUsd' },
          totalActualUsd: { $sum: { $ifNull: ['$actualCostUsd', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  sendSuccess(res, {
    generatedAt: new Date(),
    period: { from: from ?? null, to: to ?? null },
    vehicles: vehicleStats,
    alerts: alertStats,
    workOrders: workOrderStats,
  });
}

export async function getVehicleFuelReport(req: Request, res: Response): Promise<void> {
  const { vehicleId } = req.params;
  const { from, to } = req.query as { from?: string; to?: string };

  const match: Record<string, unknown> = {
    vehicleId: new mongoose.Types.ObjectId(vehicleId),
  };

  if (from || to) {
    match.timestamp = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
  }

  const fuelData = await Telemetry.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
        },
        avgFuelLevelPercent: { $avg: '$fuelLevelPercent' },
        totalConsumedLiters: { $sum: '$fuelConsumedLiters' },
        avgSpeedKmh: { $avg: '$speedKmh' },
        maxSpeedKmh: { $max: '$speedKmh' },
        avgEngineTemp: { $avg: '$engineTempCelsius' },
        readings: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  sendSuccess(res, { vehicleId, fuelData });
}
