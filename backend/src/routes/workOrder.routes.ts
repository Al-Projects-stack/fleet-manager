import { Router } from 'express';
import {
  listWorkOrders,
  getWorkOrder,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  addNote,
} from '../controllers/workOrder.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  addNoteSchema,
  workOrderQuerySchema,
} from '../validators/workOrder.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(workOrderQuerySchema), listWorkOrders);
router.get('/:id', getWorkOrder);

router.post(
  '/',
  authorize('Admin', 'Manager'),
  validate(createWorkOrderSchema),
  createWorkOrder
);

router.patch(
  '/:id',
  authorize('Admin', 'Manager', 'Technician'),
  validate(updateWorkOrderSchema),
  updateWorkOrder
);

router.delete('/:id', authorize('Admin'), deleteWorkOrder);

router.post(
  '/:id/notes',
  authorize('Admin', 'Manager', 'Technician'),
  validate(addNoteSchema),
  addNote
);

export default router;
