import { Router } from 'express';
import {
  ingestTelemetry,
  getTelemetry,
  getLatestTelemetry,
  ingestTelemetryCSV,
} from '../controllers/telemetry.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  ingestTelemetrySchema,
  telemetryQuerySchema,
} from '../validators/telemetry.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/ingest',
  authorize('Admin', 'Manager'),
  validate(ingestTelemetrySchema),
  ingestTelemetry
);

// CSV bulk ingest — body must be text/csv
router.post('/ingest/csv', authorize('Admin', 'Manager'), ingestTelemetryCSV);

router.get('/', validate(telemetryQuerySchema), getTelemetry);
router.get('/latest/:vehicleId', getLatestTelemetry);

export default router;
