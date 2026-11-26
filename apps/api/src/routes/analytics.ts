import { createHash } from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  AnalyticsVisitSchema,
  DailyAnalyticsQuerySchema,
  type DailyAnalyticsEntry,
  type DailyAnalyticsReport,
  type TopPageMetric,
} from '../../../../specs/contracts/portfolio.js';
import { pool } from '../db/pool.js';

export const analyticsRouter = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

const computeVisitorHash = (req: Request): string => {
  const utcDate = new Date().toISOString().slice(0, 10);
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const ua = String(req.headers['user-agent'] ?? 'unknown');
  return createHash('sha256').update(`${utcDate}|${ip}|${ua}`).digest('hex');
};

analyticsRouter.post(
  '/analytics/visit',
  asyncHandler(async (req, res) => {
    const parsed = AnalyticsVisitSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid analytics payload' });
      return;
    }

    const visitorHash = computeVisitorHash(req);
    const { path } = parsed.data;

    await pool.query(
      `WITH today AS (
         SELECT (NOW() AT TIME ZONE 'UTC')::date AS d
       ),
       new_visitor AS (
         INSERT INTO analytics_daily_visitors (metric_date, visitor_hash)
         SELECT today.d, $1
         FROM today
         ON CONFLICT (metric_date, visitor_hash) DO NOTHING
         RETURNING 1 AS is_new
       ),
       metrics_upsert AS (
         INSERT INTO analytics_daily_metrics (metric_date, total_views, unique_visitors)
         SELECT today.d, 1, (SELECT COUNT(*)::int FROM new_visitor)
         FROM today
         ON CONFLICT (metric_date) DO UPDATE
           SET total_views = analytics_daily_metrics.total_views + 1,
               unique_visitors = analytics_daily_metrics.unique_visitors + (SELECT COUNT(*)::int FROM new_visitor),
               updated_at = NOW()
       )
       INSERT INTO analytics_daily_pages (metric_date, path, views)
       SELECT today.d, $2, 1
       FROM today
       ON CONFLICT (metric_date, path) DO UPDATE
         SET views = analytics_daily_pages.views + 1`,
      [visitorHash, path]
    );

    res.status(202).json({ data: { recorded: true } });
  })
);

analyticsRouter.get(
  '/analytics/daily',
  asyncHandler(async (req, res) => {
    const parsedQuery = DailyAnalyticsQuerySchema.safeParse(req.query ?? {});
    if (!parsedQuery.success) {
      res.status(400).json({ error: 'days must be an integer between 1 and 90' });
      return;
    }

    const { days } = parsedQuery.data;

    const [dailyRes, summaryRes, topPagesRes] = await Promise.all([
      pool.query<{
        metric_date: string;
        year: number;
        month: number;
        day: number;
        total_views: number;
        unique_visitors: number;
        cv_downloads: number;
        contact_inquiries: number;
      }>(
        `WITH date_series AS (
           SELECT generate_series(
             ((NOW() AT TIME ZONE 'UTC')::date - ($1::int - 1)),
             (NOW() AT TIME ZONE 'UTC')::date,
             INTERVAL '1 day'
           )::date AS d
         )
         SELECT
           ds.d::text AS metric_date,
           EXTRACT(YEAR FROM ds.d)::int AS year,
           EXTRACT(MONTH FROM ds.d)::int AS month,
           EXTRACT(DAY FROM ds.d)::int AS day,
           COALESCE(m.total_views, 0)::int AS total_views,
           COALESCE(m.unique_visitors, 0)::int AS unique_visitors,
           COALESCE(m.cv_downloads, 0)::int AS cv_downloads,
           COALESCE(m.contact_inquiries, 0)::int AS contact_inquiries
         FROM date_series ds
         LEFT JOIN analytics_daily_metrics m ON m.metric_date = ds.d
         ORDER BY ds.d ASC`,
        [days]
      ),
      pool.query<{
        all_time_views: number;
        all_time_unique_visitors: number;
        all_time_cv_downloads: number;
        all_time_contact_inquiries: number;
        today_views: number;
        today_unique_visitors: number;
      }>(
        `SELECT
           COALESCE(SUM(total_views), 0)::int AS all_time_views,
           COALESCE(SUM(unique_visitors), 0)::int AS all_time_unique_visitors,
           COALESCE(SUM(cv_downloads), 0)::int AS all_time_cv_downloads,
           COALESCE(SUM(contact_inquiries), 0)::int AS all_time_contact_inquiries,
           COALESCE(SUM(total_views) FILTER (WHERE metric_date = (NOW() AT TIME ZONE 'UTC')::date), 0)::int AS today_views,
           COALESCE(SUM(unique_visitors) FILTER (WHERE metric_date = (NOW() AT TIME ZONE 'UTC')::date), 0)::int AS today_unique_visitors
         FROM analytics_daily_metrics`
      ),
      pool.query<TopPageMetric>(
        `SELECT path, SUM(views)::int AS views
         FROM analytics_daily_pages
         WHERE metric_date >= ((NOW() AT TIME ZONE 'UTC')::date - ($1::int - 1))
         GROUP BY path
         ORDER BY views DESC, path ASC
         LIMIT 10`,
        [days]
      ),
    ]);

    const daily: DailyAnalyticsEntry[] = dailyRes.rows.map((row) => ({
      metricDate: row.metric_date,
      year: row.year,
      month: row.month,
      day: row.day,
      totalViews: row.total_views,
      uniqueVisitors: row.unique_visitors,
      cvDownloads: row.cv_downloads,
      contactInquiries: row.contact_inquiries,
    }));

    const s = summaryRes.rows[0];
    const report: DailyAnalyticsReport = {
      days,
      summary: {
        allTimeViews: s?.all_time_views ?? 0,
        allTimeUniqueVisitors: s?.all_time_unique_visitors ?? 0,
        allTimeCvDownloads: s?.all_time_cv_downloads ?? 0,
        allTimeContactInquiries: s?.all_time_contact_inquiries ?? 0,
        todayViews: s?.today_views ?? 0,
        todayUniqueVisitors: s?.today_unique_visitors ?? 0,
      },
      daily,
      topPages: topPagesRes.rows,
    };

    res.json({ data: report });
  })
);
