import { Router, Request, Response } from 'express';
import { z } from 'zod';

// Statistical fuel anomaly detection using rolling z-score.
// PHASE 2: Replace with trained isolation forest or LSTM model.

export const fuelAnomalyRouter = Router();

const bodySchema = z.object({
  vehicleId: z.string(),
  readings: z
    .array(
      z.object({
        timestamp: z.string(),
        fuelConsumedLiters: z.number().min(0),
        odometerKm: z.number().min(0),
        fuelLevelPercent: z.number().min(0).max(100),
      })
    )
    .min(1),
});

interface AnomalyResult {
  vehicleId: string;
  isAnomaly: boolean;
  zScore: number;
  mean: number;
  stdDev: number;
  severity: 'none' | 'low' | 'medium' | 'high';
  latestValue: number;
}

function computeStats(values: number[]): { mean: number; stdDev: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

function classifySeverity(zScore: number): AnomalyResult['severity'] {
  if (zScore <= 2.0) return 'none';
  if (zScore <= 2.5) return 'low';
  if (zScore <= 3.5) return 'medium';
  return 'high';
}

fuelAnomalyRouter.post('/fuel', (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { vehicleId, readings } = parsed.data;

  if (readings.length < 3) {
    res.json({
      success: true,
      data: {
        vehicleId,
        isAnomaly: false,
        zScore: 0,
        mean: 0,
        stdDev: 0,
        severity: 'none',
        latestValue: readings[readings.length - 1].fuelConsumedLiters,
        note: 'Insufficient history for anomaly detection',
      },
    });
    return;
  }

  const values = readings.map((r) => r.fuelConsumedLiters);
  const latest = values[values.length - 1];
  const history = values.slice(0, -1);

  const { mean, stdDev } = computeStats(history);
  const zScore = stdDev > 0 ? (latest - mean) / stdDev : 0;
  const isAnomaly = zScore > 2.0;
  const severity = classifySeverity(zScore);

  const result: AnomalyResult = {
    vehicleId,
    isAnomaly,
    zScore: parseFloat(zScore.toFixed(3)),
    mean: parseFloat(mean.toFixed(3)),
    stdDev: parseFloat(stdDev.toFixed(3)),
    severity,
    latestValue: latest,
  };

  res.json({ success: true, data: result });
});
