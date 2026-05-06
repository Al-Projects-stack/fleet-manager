import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { WorkOrder } from '../models';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import {
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
} from '../validators/workOrder.validator';

export async function listWorkOrders(req: Request, res: Response): Promise<void> {
  const {
    vehicleId,
    assignedToId,
    status,
    priority,
    limit = '50',
    page = '1',
  } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (vehicleId) filter.vehicleId = vehicleId;
  if (assignedToId) filter.assignedToId = assignedToId;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [workOrders, total] = await Promise.all([
    WorkOrder.find(filter)
      .populate('vehicleId', 'name licensePlate')
      .populate('assignedToId', 'name email')
      .populate('createdById', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    WorkOrder.countDocuments(filter),
  ]);

  sendSuccess(res, workOrders, 200, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
  });
}

export async function getWorkOrder(req: Request, res: Response): Promise<void> {
  const wo = await WorkOrder.findById(req.params.id)
    .populate('vehicleId', 'name licensePlate make model')
    .populate('assignedToId', 'name email')
    .populate('createdById', 'name')
    .populate('notes.authorId', 'name');

  if (!wo) throw new AppError('Work order not found', 404);
  sendSuccess(res, wo);
}

export async function createWorkOrder(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateWorkOrderInput;
  const wo = await WorkOrder.create({
    ...body,
    createdById: new mongoose.Types.ObjectId(req.user!.id),
  });
  sendCreated(res, wo);
}

export async function updateWorkOrder(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateWorkOrderInput;

  // Auto-stamp completedDate when transitioning to 'completed'
  const update: Record<string, unknown> = { ...body };
  if (body.status === 'completed' && !body.completedDate) {
    update.completedDate = new Date();
  }

  const wo = await WorkOrder.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!wo) throw new AppError('Work order not found', 404);
  sendSuccess(res, wo);
}

export async function deleteWorkOrder(req: Request, res: Response): Promise<void> {
  const wo = await WorkOrder.findByIdAndDelete(req.params.id);
  if (!wo) throw new AppError('Work order not found', 404);
  sendNoContent(res);
}

export async function addNote(req: Request, res: Response): Promise<void> {
  const { content } = req.body as { content: string };

  const wo = await WorkOrder.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        notes: {
          content,
          authorId: new mongoose.Types.ObjectId(req.user!.id),
          createdAt: new Date(),
        },
      },
    },
    { new: true, runValidators: true }
  ).populate('notes.authorId', 'name');

  if (!wo) throw new AppError('Work order not found', 404);
  sendSuccess(res, wo);
}
