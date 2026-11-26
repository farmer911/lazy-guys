import { Router, type Request, type Response, type NextFunction } from 'express';
import type {
  Experience,
  Profile,
  Project,
  TechStack,
} from '../../../../specs/contracts/portfolio.js';
import { pool } from '../db/pool.js';
import { generateResumePdf } from '../services/pdfResume.js';

export const cvRouter = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

cvRouter.get(
  '/cv/pdf',
  asyncHandler(async (_req, res) => {
    const [profileRes, expRes, projRes, stackRes] = await Promise.all([
      pool.query<Profile>(
        `SELECT id, full_name, headline, bio, location, email, github_url, linkedin_url,
                resume_url, avatar_url, achievements
         FROM profiles
         ORDER BY created_at ASC
         LIMIT 1`
      ),
      pool.query<Experience>(
        `SELECT id, company, role, location, start_date::text AS start_date,
                end_date::text AS end_date, is_current, summary, highlights
         FROM experiences
         ORDER BY sort_order ASC, start_date DESC`
      ),
      pool.query<Project>(
        `SELECT id, title, slug, summary, role, highlights, tech_tags, repo_url, live_url, featured
         FROM projects
         ORDER BY featured DESC, sort_order ASC, created_at DESC
         LIMIT 6`
      ),
      pool.query<TechStack>(
        `SELECT id, name, category, proficiency, years_exp::float8 AS years_exp
         FROM tech_stacks
         ORDER BY sort_order ASC, proficiency DESC`
      ),
    ]);

    const profile = profileRes.rows[0];
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const pdfBytes = await generateResumePdf({
      profile,
      experiences: expRes.rows,
      projects: projRes.rows,
      techStacks: stackRes.rows,
    });

    await pool.query(
      `INSERT INTO analytics_daily_metrics (metric_date, cv_downloads)
       VALUES ((NOW() AT TIME ZONE 'UTC')::date, 1)
       ON CONFLICT (metric_date) DO UPDATE
         SET cv_downloads = analytics_daily_metrics.cv_downloads + 1,
             updated_at = NOW()`
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="lazy-guy-resume.pdf"');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.status(200).send(Buffer.from(pdfBytes));
  })
);
