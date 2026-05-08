import 'express-async-errors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { fuelAnomalyRouter } from './analyzers/fuelAnomaly';
import { maintenancePredictRouter } from './analyzers/maintenancePredict';

const PORT = parseInt(process.env.PORT ?? process.env.AI_SERVICE_PORT ?? '3002', 10);

const app = express();

app.use(helmet());
app.use(express.json());

app.use('/analyze', fuelAnomalyRouter);
app.use('/predict', maintenancePredictRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', service: 'ai-service' } });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.listen(PORT, () => {
  console.info(`[AI Service] Statistical engine running on port ${PORT}`);
});
