import { Router } from 'express';
import {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '../controllers/vehicle.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleIdParamSchema,
  listVehiclesQuerySchema,
} from '../validators/vehicle.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(listVehiclesQuerySchema), listVehicles);
router.get('/:id', validate(vehicleIdParamSchema), getVehicle);

router.post(
  '/',
  authorize('Admin', 'Manager'),
  validate(createVehicleSchema),
  createVehicle
);

router.patch(
  '/:id',
  authorize('Admin', 'Manager'),
  validate(updateVehicleSchema),
  updateVehicle
);

router.delete(
  '/:id',
  authorize('Admin'),
  validate(vehicleIdParamSchema),
  deleteVehicle
);

export default router;
