import { Router } from 'express';
import authRoutes from './auth.routes';
import vehicleRoutes from './vehicle.routes';
import telemetryRoutes from './telemetry.routes';
import alertRoutes from './alert.routes';
import workOrderRoutes from './workOrder.routes';
import reportRoutes from './report.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/alerts', alertRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/reports', reportRoutes);

export default router;
