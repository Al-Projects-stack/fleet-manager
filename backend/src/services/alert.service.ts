import mongoose from 'mongoose';
import { IVehicleDocument } from '../models/Vehicle';
import { ITelemetryDocument } from '../models/Telemetry';
import { Alert } from '../models';

const FUEL_LOW_THRESHOLD_PCT = 15;
const FUEL_CRITICAL_THRESHOLD_PCT = 5;
const ENGINE_TEMP_HIGH_C = 105;
const ENGINE_TEMP_CRITICAL_C = 115;
const MAINTENANCE_LOOKAHEAD_KM = 500;
const ANOMALY_MIN_HISTORY = 5;
const ANOMALY_WINDOW = 10;
const ANOMALY_Z_THRESHOLD = 2.5;

type AlertType = 'fuel_anomaly' | 'maintenance_due' | 'engine_temp' | 'low_fuel';
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface AlertCandidate {
  vehicleId: mongoose.Types.ObjectId;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: Record<string, unknown>;
}

export class AlertService {
  static async evaluateRules(
    vehicle: IVehicleDocument,
    reading: ITelemetryDocument
  ): Promise<void> {
    const candidates: AlertCandidate[] = [];

    AlertService.checkLowFuel(vehicle, reading, candidates);
    AlertService.checkEngineTemp(vehicle, reading, candidates);
    AlertService.checkMaintenanceDue(vehicle, reading, candidates);
    await AlertService.checkFuelAnomaly(vehicle, reading, candidates);

    // Deduplicate: skip if an unresolved alert of the same type already exists
    for (const candidate of candidates) {
      const existing = await Alert.findOne({
        vehicleId: candidate.vehicleId,
        type: candidate.type,
        isResolved: false,
      });

      if (!existing) {
        await Alert.create({ ...candidate, triggeredAt: new Date() });
      }
    }
  }

  private static checkLowFuel(
    vehicle: IVehicleDocument,
    reading: ITelemetryDocument,
    out: AlertCandidate[]
  ): void {
    if (reading.fuelLevelPercent > FUEL_LOW_THRESHOLD_PCT) return;

    out.push({
      vehicleId: vehicle._id as mongoose.Types.ObjectId,
      type: 'low_fuel',
      severity:
        reading.fuelLevelPercent <= FUEL_CRITICAL_THRESHOLD_PCT ? 'critical' : 'high',
      message: `${vehicle.name} fuel level at ${reading.fuelLevelPercent.toFixed(1)}%`,
      details: { fuelLevelPercent: reading.fuelLevelPercent },
    });
  }

  private static checkEngineTemp(
    vehicle: IVehicleDocument,
    reading: ITelemetryDocument,
    out: AlertCandidate[]
  ): void {
    if (reading.engineTempCelsius < ENGINE_TEMP_HIGH_C) return;

    out.push({
      vehicleId: vehicle._id as mongoose.Types.ObjectId,
      type: 'engine_temp',
      severity:
        reading.engineTempCelsius >= ENGINE_TEMP_CRITICAL_C ? 'critical' : 'high',
      message: `${vehicle.name} engine temperature at ${reading.engineTempCelsius}°C`,
      details: { engineTempCelsius: reading.engineTempCelsius },
    });
  }

  private static checkMaintenanceDue(
    vehicle: IVehicleDocument,
    reading: ITelemetryDocument,
    out: AlertCandidate[]
  ): void {
    if (!vehicle.nextMaintenanceOdometerKm) return;

    const remaining = vehicle.nextMaintenanceOdometerKm - reading.odometerKm;
    if (remaining > MAINTENANCE_LOOKAHEAD_KM) return;

    let severity: AlertSeverity;
    if (remaining <= 0) severity = 'critical';
    else if (remaining <= 200) severity = 'high';
    else severity = 'medium';

    out.push({
      vehicleId: vehicle._id as mongoose.Types.ObjectId,
      type: 'maintenance_due',
      severity,
      message:
        remaining <= 0
          ? `${vehicle.name} is overdue for maintenance by ${Math.abs(remaining).toFixed(0)} km`
          : `${vehicle.name} is due for maintenance in ${remaining.toFixed(0)} km`,
      details: {
        odometerKm: reading.odometerKm,
        nextMaintenanceOdometerKm: vehicle.nextMaintenanceOdometerKm,
        remainingKm: remaining,
      },
    });
  }

  // Rolling z-score anomaly detection against recent consumption history.
  // Statistical baseline only — no external ML model required.
  private static async checkFuelAnomaly(
    vehicle: IVehicleDocument,
    reading: ITelemetryDocument,
    out: AlertCandidate[]
  ): Promise<void> {
    const { Telemetry } = await import('../models');

    const recent = await Telemetry.find({
      vehicleId: vehicle._id,
      timestamp: { $lt: reading.timestamp },
    })
      .sort({ timestamp: -1 })
      .limit(ANOMALY_WINDOW)
      .select('fuelConsumedLiters');

    if (recent.length < ANOMALY_MIN_HISTORY) return;

    const values = recent.map((r) => r.fuelConsumedLiters);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return;

    const zScore = (reading.fuelConsumedLiters - mean) / stdDev;
    if (zScore <= ANOMALY_Z_THRESHOLD) return;

    out.push({
      vehicleId: vehicle._id as mongoose.Types.ObjectId,
      type: 'fuel_anomaly',
      severity: zScore > 4 ? 'high' : 'medium',
      message: `Abnormal fuel consumption on ${vehicle.name}: ${reading.fuelConsumedLiters.toFixed(2)} L (avg ${mean.toFixed(2)} L)`,
      details: {
        currentLiters: reading.fuelConsumedLiters,
        avgLiters: parseFloat(mean.toFixed(4)),
        stdDev: parseFloat(stdDev.toFixed(4)),
        zScore: parseFloat(zScore.toFixed(2)),
      },
    });
  }
}
