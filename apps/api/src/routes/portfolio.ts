import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import {
  ContactSubmissionSchema,
  MAX_JD_PDF_BYTES,
  type JdAttachmentType,
} from '../../../../specs/contracts/portfolio.js';
import { pool } from '../db/pool.js';

export const portfolioRouter = Router();

type DuplexRequestInit = RequestInit & { duplex: 'half' };

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

const parseMultipartContact = async (req: Request): Promise<Record<string, unknown>> => {
  const webBody = Readable.toWeb(req) as unknown as WebReadableStream;
  const init: DuplexRequestInit = {
    method: 'POST',
    headers: req.headers as HeadersInit,
    body: webBody as unknown as BodyInit,
    duplex: 'half',
  };
  const webReq = new Request('http://localhost/api/contact', init);
  const form = await webReq.formData();

  const readField = (key: string): string | undefined => {
    const val = form.get(key);
    return typeof val === 'string' ? val : undefined;
  };

  const payload: Record<string, unknown> = {
    name: readField('name'),
    email: readField('email'),
    message: readField('message'),
    company: readField('company'),
    engagementType: readField('engagementType'),
    compTier: readField('compTier'),
    preferredSlot: readField('preferredSlot'),
    idempotencyKey: readField('idempotencyKey'),
    jdUrl: readField('jdUrl'),
  };

  const fileEntry = form.get('jdPdf');
  if (fileEntry && typeof fileEntry === 'object' && 'arrayBuffer' in fileEntry) {
    const buf = Buffer.from(await fileEntry.arrayBuffer());
    if (buf.byteLength > MAX_JD_PDF_BYTES) {
      const err = new Error('Payload too large') as Error & { status?: number };
      err.status = 413;
      throw err;
    }
    const fileName = 'name' in fileEntry && typeof fileEntry.name === 'string' ? fileEntry.name : 'jd.pdf';
    payload.jdPdf = {
      fileName,
      mimeType: fileEntry.type || 'application/pdf',
      contentBase64: buf.toString('base64'),
    };
  }

  return payload;
};

const decodeValidatedPdf = (contentBase64: string): Buffer | null => {
  const clean = contentBase64.replace(/^data:application\/pdf;base64,/i, '').trim();
  const buffer = Buffer.from(clean, 'base64');
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_JD_PDF_BYTES) {
    return null;
  }
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return null;
  }
  return buffer;
};

const computeDailyIpHash = (req: Request): string => {
  const utcDate = new Date().toISOString().slice(0, 10);
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  return createHash('sha256').update(`${utcDate}|${clientIp}`).digest('hex');
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
      `SELECT id, full_name, headline, bio, location, email, github_url, linkedin_url,
              resume_url, avatar_url, achievements, availability_text, calendar_url, kpi_metrics
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
      `SELECT id, company, role, location, start_date::text AS start_date,
              end_date::text AS end_date, is_current, summary, highlights, tech_tags
       FROM experiences
       ORDER BY sort_order ASC, start_date DESC`
    );
    res.json(rows);
  })
);

portfolioRouter.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const featuredParam =
      req.query.featured === 'true' ? true : req.query.featured === 'false' ? false : null;
    const { rows } = await pool.query(
      `SELECT id, title, slug, category, summary, role, highlights, tech_tags,
              impact_metrics, case_study, repo_url, live_url, featured
       FROM projects
       ${featuredParam !== null ? 'WHERE featured = $1' : ''}
       ORDER BY sort_order ASC, created_at DESC`,
      featuredParam !== null ? [featuredParam] : []
    );
    res.json(rows);
  })
);

portfolioRouter.get(
  '/projects/:slug',
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug ?? '').trim();
    if (!slug) {
      res.status(400).json({ error: 'Project slug is required' });
      return;
    }
    const { rows } = await pool.query(
      `SELECT id, title, slug, category, summary, role, highlights, tech_tags,
              impact_metrics, case_study, repo_url, live_url, featured
       FROM projects
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ data: rows[0] });
  })
);

portfolioRouter.get(
  '/tech-stacks',
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    const { rows } = await pool.query(
      `SELECT id, name, category, proficiency, years_exp::float8 AS years_exp
       FROM tech_stacks
       ${category ? 'WHERE category = $1' : ''}
       ORDER BY sort_order ASC, proficiency DESC`,
      category ? [category] : []
    );
    res.json(rows);
  })
);

portfolioRouter.post(
  '/contact',
  asyncHandler(async (req, res) => {
    const contentLength = Number(req.headers['content-length'] ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 8 * 1024 * 1024) {
      res.status(413).json({ error: 'Payload exceeds maximum allowed size' });
      return;
    }

    const contentType = String(req.headers['content-type'] ?? '').toLowerCase();
    const rawPayload = contentType.includes('multipart/form-data')
      ? await parseMultipartContact(req)
      : (req.body ?? {});

    const parsed = ContactSubmissionSchema.safeParse(rawPayload);
    if (!parsed.success) {
      const emailFormatIssue = parsed.error.issues.find(
        (issue) => issue.path[0] === 'email' && issue.message === 'Valid email is required'
      );
      const jdIssue = parsed.error.issues.find(
        (issue) => issue.path[0] === 'jdUrl' || issue.path[0] === 'jdPdf'
      );
      res.status(400).json({
        error: emailFormatIssue
          ? 'Valid email is required'
          : jdIssue
            ? jdIssue.message
            : 'name, email, and message are required',
      });
      return;
    }

    const input = parsed.data;
    const normalizedJdUrl = input.jdUrl?.trim() ? input.jdUrl.trim() : undefined;
    let pdfBuffer: Buffer | null = null;
    let jdType: JdAttachmentType = 'none';

    if (input.jdPdf) {
      pdfBuffer = decodeValidatedPdf(input.jdPdf.contentBase64);
      if (!pdfBuffer) {
        res.status(400).json({ error: 'Uploaded file must be a valid PDF up to 5 MB' });
        return;
      }
      jdType = 'pdf';
    } else if (normalizedJdUrl) {
      jdType = 'link';
    }

    const ipHash = computeDailyIpHash(req);
    const rateRes = await pool.query<{ recent_count: number }>(
      `SELECT COUNT(*)::int AS recent_count
       FROM contact_submissions
       WHERE ip_hash = $1
         AND created_at > NOW() - INTERVAL '15 minutes'`,
      [ipHash]
    );
    if ((rateRes.rows[0]?.recent_count ?? 0) >= 30) {
      res.status(429).json({ error: 'Too many contact requests. Please try again later.' });
      return;
    }

    const { rows } = await pool.query<{
      id: string;
      submitted_date: string;
      jd_type: JdAttachmentType;
      created_at: Date;
    }>(
      `WITH target_profile AS (
         SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1
       ),
       sub AS (
         INSERT INTO contact_submissions (
           profile_id, idempotency_key, name, email, company, engagement_type,
           comp_tier, preferred_slot, jd_type, jd_url, message, ip_hash
         )
         VALUES (
           (SELECT id FROM target_profile),
           $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
         )
         ON CONFLICT (idempotency_key) DO UPDATE
           SET idempotency_key = EXCLUDED.idempotency_key
         RETURNING id, submitted_date::text AS submitted_date, jd_type, created_at, (xmax = 0) AS inserted
       ),
       att AS (
         INSERT INTO contact_attachments (submission_id, file_name, mime_type, byte_size, pdf_data)
         SELECT sub.id, $12, 'application/pdf', octet_length($13::bytea), $13::bytea
         FROM sub
         WHERE sub.inserted AND $13::bytea IS NOT NULL
         ON CONFLICT (submission_id) DO NOTHING
       ),
       metrics AS (
         INSERT INTO analytics_daily_metrics (metric_date, contact_inquiries)
         SELECT (NOW() AT TIME ZONE 'UTC')::date, 1
         FROM sub
         WHERE sub.inserted
         ON CONFLICT (metric_date) DO UPDATE
           SET contact_inquiries = analytics_daily_metrics.contact_inquiries + 1,
               updated_at = NOW()
       )
       SELECT id, submitted_date, jd_type, created_at FROM sub`,
      [
        input.idempotencyKey ?? null,
        input.name,
        input.email,
        input.company ?? null,
        input.engagementType ?? 'full_time',
        input.compTier ?? null,
        input.preferredSlot ?? null,
        jdType,
        normalizedJdUrl ?? null,
        input.message,
        ipHash,
        input.jdPdf?.fileName ?? 'jd.pdf',
        pdfBuffer,
      ]
    );

    const saved = rows[0];
    res.status(201).json({
      ok: true,
      id: saved.id,
      submittedDate: saved.submitted_date,
      jdType: saved.jd_type,
      receivedAt: saved.created_at.toISOString(),
    });
  })
);

portfolioRouter.get(
  '/contact/:id/jd-pdf',
  asyncHandler(async (req, res) => {
    const parsedId = z.uuid().safeParse(req.params.id);
    if (!parsedId.success) {
      res.status(400).json({ error: 'Valid submission id is required' });
      return;
    }

    const { rows } = await pool.query<{
      file_name: string;
      mime_type: string;
      pdf_data: Buffer;
      uploaded_date: string;
    }>(
      `SELECT file_name, mime_type, pdf_data, uploaded_date::text AS uploaded_date
       FROM contact_attachments
       WHERE submission_id = $1
       LIMIT 1`,
      [parsedId.data]
    );

    const attachment = rows[0];
    if (!attachment) {
      res.status(404).json({ error: 'PDF attachment not found' });
      return;
    }

    const safeFileName = attachment.file_name.replace(/[^A-Za-z0-9._-]/g, '_');
    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
    res.setHeader('X-Uploaded-Date', attachment.uploaded_date);
    res.send(attachment.pdf_data);
  })
);
