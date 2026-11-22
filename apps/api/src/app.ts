import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { portfolioRouter } from './routes/portfolio.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.use('/api', portfolioRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
