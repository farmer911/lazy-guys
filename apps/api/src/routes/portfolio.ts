import { Router, type Request, type Response, type NextFunction } from 'express';
import { pool } from '../db/pool.js';

export const portfolioRouter = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

portfolioRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'lazy-guy-api' });
  })
);

portfolioRouter.get(
  '/profile',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id, full_name, headline, bio, location, email, github_url, linkedin_url, resume_url, avatar_url, achievements
       FROM profiles
       ORDER BY created_at ASC
       LIMIT 1`
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(rows[0]);
  })
);

portfolioRouter.get(
  '/experiences',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id, company, role, location, start_date, end_date, is_current, summary, highlights
       FROM experiences
       ORDER BY sort_order ASC, start_date DESC`
    );
    res.json(rows);
  })
);

portfolioRouter.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const featuredOnly = req.query.featured === 'true';
    const { rows } = await pool.query(
      `SELECT id, title, slug, summary, role, highlights, tech_tags, repo_url, live_url, featured
       FROM projects
       ${featuredOnly ? 'WHERE featured = TRUE' : ''}
       ORDER BY sort_order ASC, created_at DESC`
    );
    res.json(rows);
  })
);

portfolioRouter.get(
  '/tech-stacks',
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    const { rows } = await pool.query(
      `SELECT id, name, category, proficiency, years_exp
       FROM tech_stacks
       ${category ? 'WHERE category = $1' : ''}
       ORDER BY sort_order ASC, proficiency DESC`,
      category ? [category] : []
    );
    res.json(rows);
  })
);

portfolioRouter.post('/contact', (req, res) => {
  const { name, email, message } = req.body ?? {};
  if (!name || !email || !message) {
    res.status(400).json({ error: 'name, email, and message are required' });
    return;
  }
  res.status(201).json({
    ok: true,
    receivedAt: new Date().toISOString(),
  });
});
