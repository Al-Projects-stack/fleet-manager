import { Router } from 'express';
import {
  listAlerts,
  resolveAlert,
  getAlertStats,
} from '../controllers/alert.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  resolveAlertSchema,
  alertQuerySchema,
} from '../validators/alert.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate(alertQuerySchema), listAlerts);
router.get('/stats', getAlertStats);

router.patch(
  '/:id/resolve',
  authorize('Admin', 'Manager', 'Technician'),
  validate(resolveAlertSchema),
  resolveAlert
);

export default router;
