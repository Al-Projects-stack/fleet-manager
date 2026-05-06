import { Router } from 'express';
import {
  getFleetSummary,
  getVehicleFuelReport,
} from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', getFleetSummary);
router.get('/fuel/:vehicleId', getVehicleFuelReport);

export default router;
