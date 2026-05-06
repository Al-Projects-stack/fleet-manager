import { Request, Response } from 'express';
import { Vehicle } from '../models';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { CreateVehicleInput, UpdateVehicleInput } from '../validators/vehicle.validator';

export async function listVehicles(req: Request, res: Response): Promise<void> {
  const { status, fuelType, page = '1', limit = '50' } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (fuelType) filter.fuelType = fuelType;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [vehicles, total] = await Promise.all([
    Vehicle.find(filter)
      .populate('assignedDriverId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Vehicle.countDocuments(filter),
  ]);

  sendSuccess(res, vehicles, 200, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
  });
}

export async function getVehicle(req: Request, res: Response): Promise<void> {
  const vehicle = await Vehicle.findById(req.params.id).populate(
    'assignedDriverId',
    'name email'
  );
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  sendSuccess(res, vehicle);
}

export async function createVehicle(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateVehicleInput;
  const vehicle = await Vehicle.create(body);
  sendCreated(res, vehicle);
}

export async function updateVehicle(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateVehicleInput;
  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  });
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  sendSuccess(res, vehicle);
}

export async function deleteVehicle(req: Request, res: Response): Promise<void> {
  const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  sendNoContent(res);
}
