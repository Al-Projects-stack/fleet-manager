import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Alert } from '../models';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export async function listAlerts(req: Request, res: Response): Promise<void> {
  const {
    vehicleId,
    type,
    severity,
    isResolved,
    limit = '50',
    page = '1',
  } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (vehicleId) filter.vehicleId = vehicleId;
  if (type) filter.type = type;
  if (severity) filter.severity = severity;
  if (isResolved !== undefined) filter.isResolved = isResolved === 'true';

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [alerts, total] = await Promise.all([
    Alert.find(filter)
      .populate('vehicleId', 'name licensePlate')
      .populate('resolvedById', 'name')
      .sort({ triggeredAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Alert.countDocuments(filter),
  ]);

  sendSuccess(res, alerts, 200, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
  });
}

export async function resolveAlert(req: Request, res: Response): Promise<void> {
  const { workOrderId } = req.body as { workOrderId?: string | null };

  const alert = await Alert.findById(req.params.id);
  if (!alert) throw new AppError('Alert not found', 404);
  if (alert.isResolved) throw new AppError('Alert is already resolved', 400);

  alert.isResolved = true;
  alert.resolvedById = new mongoose.Types.ObjectId(req.user!.id);
  alert.resolvedAt = new Date();
  if (workOrderId) {
    alert.workOrderId = new mongoose.Types.ObjectId(workOrderId);
  }

  await alert.save();
  sendSuccess(res, alert);
}

export async function getAlertStats(_req: Request, res: Response): Promise<void> {
  const stats = await Alert.aggregate([
    {
      $group: {
        _id: { type: '$type', isResolved: '$isResolved' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.type',
        total: { $sum: '$count' },
        unresolved: {
          $sum: {
            $cond: [{ $eq: ['$_id.isResolved', false] }, '$count', 0],
          },
        },
      },
    },
    { $sort: { unresolved: -1 } },
  ]);

  sendSuccess(res, stats);
}
