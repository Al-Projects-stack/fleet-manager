import { Router, Request, Response } from 'express';
import { z } from 'zod';

// Threshold-based maintenance urgency scoring.
// PHASE 2: Replace with survival analysis model (Weibull / Cox PH).

export const maintenancePredictRouter = Router();

const bodySchema = z.object({
  vehicleId: z.string(),
  currentOdometerKm: z.number().min(0),
  lastMaintenanceOdometerKm: z.number().min(0).nullable(),
  nextMaintenanceOdometerKm: z.number().min(0).nullable(),
  engineHours: z.number().min(0).default(0),
  lastMaintenanceDaysAgo: z.number().min(0).nullable(),
});

type UrgencyLevel = 'ok' | 'soon' | 'due' | 'overdue';

interface MaintenancePrediction {
  vehicleId: string;
  urgency: UrgencyLevel;
  urgencyScore: number; // 0–100
  remainingKm: number | null;
  estimatedDaysUntilDue: number | null;
  recommendation: string;
}

function scoreOdometer(remaining: number): number {
  if (remaining > 1000) return 0;
  if (remaining > 500) return 25;
  if (remaining > 200) return 50;
  if (remaining > 0) return 75;
  return 100; // overdue
}

function scoreDays(daysAgo: number | null): number {
  if (daysAgo === null) return 0;
  if (daysAgo < 150) return 0;
  if (daysAgo < 180) return 20;
  if (daysAgo < 200) return 50;
  return 80;
}

function urgencyFromScore(score: number): UrgencyLevel {
  if (score < 25) return 'ok';
  if (score < 50) return 'soon';
  if (score < 80) return 'due';
  return 'overdue';
}

function buildRecommendation(urgency: UrgencyLevel, remainingKm: number | null): string {
  switch (urgency) {
    case 'ok':
      return 'No maintenance required in the near term.';
    case 'soon':
      return `Schedule maintenance soon${remainingKm !== null ? ` — approx. ${Math.round(remainingKm)} km remaining` : ''}.`;
    case 'due':
      return 'Maintenance is due. Schedule an appointment immediately.';
    case 'overdue':
      return `Maintenance is OVERDUE${remainingKm !== null ? ` by ${Math.abs(Math.round(remainingKm))} km` : ''}. Ground vehicle until serviced.`;
  }
}

maintenancePredictRouter.post('/maintenance', (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const {
    vehicleId,
    currentOdometerKm,
    nextMaintenanceOdometerKm,
    lastMaintenanceDaysAgo,
  } = parsed.data;

  const remainingKm =
    nextMaintenanceOdometerKm !== null
      ? nextMaintenanceOdometerKm - currentOdometerKm
      : null;

  const odometerScore = remainingKm !== null ? scoreOdometer(remainingKm) : 0;
  const daysScore = scoreDays(lastMaintenanceDaysAgo);
  const urgencyScore = Math.min(100, Math.max(odometerScore, daysScore));
  const urgency = urgencyFromScore(urgencyScore);

  // Rough day estimate: assume 150 km/day average
  const estimatedDaysUntilDue =
    remainingKm !== null && remainingKm > 0
      ? Math.round(remainingKm / 150)
      : null;

  const prediction: MaintenancePrediction = {
    vehicleId,
    urgency,
    urgencyScore,
    remainingKm: remainingKm !== null ? parseFloat(remainingKm.toFixed(1)) : null,
    estimatedDaysUntilDue,
    recommendation: buildRecommendation(urgency, remainingKm),
  };

  res.json({ success: true, data: prediction });
});
