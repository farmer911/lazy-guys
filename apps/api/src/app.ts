import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { analyticsRouter } from './routes/analytics.js';
import { cvRouter } from './routes/cv.js';
import { portfolioRouter } from './routes/portfolio.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use('/api/contact', express.json({ limit: '8mb' }));
  app.use(express.json({ limit: '64kb' }));

  app.use('/api', portfolioRouter);
  app.use('/api', cvRouter);
  app.use('/api', analyticsRouter);

  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && err.status === 400) {
      res.status(400).json({ error: 'Invalid JSON payload' });
      return;
    }
    if (err.status === 413) {
      res.status(413).json({ error: 'Payload exceeds maximum allowed size' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
