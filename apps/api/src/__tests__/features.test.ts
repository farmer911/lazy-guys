import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ApiErrorResponse, ApiSuccessResponse } from '../../../../specs/contracts/common.js';
import type {
  ContactSubmissionAck,
  DailyAnalyticsReport,
  Project,
} from '../../../../specs/contracts/portfolio.js';
import { createApp } from '../app.js';
import { pool } from '../db/pool.js';

const VALID_PDF_BYTES = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
  'utf8'
);

describe('feat-005 backend APIs (project case study, contact JD link/pdf, CV PDF, daily analytics)', () => {
  let server: Server;
  let baseUrl: string;
  const createdContactIds: string[] = [];

  beforeAll(async () => {
    const app = createApp();
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  afterAll(async () => {
    if (createdContactIds.length > 0) {
      await pool.query('DELETE FROM contact_submissions WHERE id = ANY($1::uuid[])', [
        createdContactIds,
      ]);
    }
    await pool.query("DELETE FROM analytics_daily_pages WHERE path LIKE '/test-e2e-%'");
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await pool.end();
  });

  it('returns project detail with case_study via GET /api/projects/:slug and 404 when missing', async () => {
    const res = await fetch(`${baseUrl}/projects/lazy-guy-portfolio`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ApiSuccessResponse<Project>;
    expect(body.data.slug).toBe('lazy-guy-portfolio');
    expect(body.data.category).toBe('Full-Stack Web');
    expect(body.data.case_study?.adrDecisions.length).toBeGreaterThanOrEqual(2);

    const missing = await fetch(`${baseUrl}/projects/does-not-exist-999`);
    expect(missing.status).toBe(404);
    const errBody = (await missing.json()) as ApiErrorResponse;
    expect(errBody.error).toBe('Project not found');
  });

  it('persists contact submission with JD URL link and UTC calendar date, and deduplicates idempotencyKey', async () => {
    const idempotencyKey = crypto.randomUUID();
    const payload = {
      name: 'Sarah Jenkins',
      email: 'sarah@test-eval.dev',
      company: 'Acme FinTech',
      engagementType: 'full_time' as const,
      compTier: '$185k - $220k',
      preferredSlot: 'Thursday 14:00 ICT',
      jdUrl: 'https://boards.greenhouse.io/acme/jobs/98765',
      idempotencyKey,
      message: 'Looking for a Staff Full-Stack engineer.',
    };

    const res1 = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res1.status).toBe(201);
    const ack1 = (await res1.json()) as ContactSubmissionAck;
    expect(ack1.ok).toBe(true);
    expect(ack1.id).toBeTruthy();
    expect(ack1.jdType).toBe('link');
    expect(ack1.submittedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (ack1.id) createdContactIds.push(ack1.id);

    const res2 = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res2.status).toBe(201);
    const ack2 = (await res2.json()) as ContactSubmissionAck;
    expect(ack2.id).toBe(ack1.id);

    const { rows } = await pool.query<{
      jd_type: string;
      jd_url: string;
      submitted_date: string;
      company: string;
    }>(
      'SELECT jd_type, jd_url, submitted_date::text AS submitted_date, company FROM contact_submissions WHERE id = $1',
      [ack1.id]
    );
    expect(rows[0]).toEqual({
      jd_type: 'link',
      jd_url: 'https://boards.greenhouse.io/acme/jobs/98765',
      submitted_date: ack1.submittedDate,
      company: 'Acme FinTech',
    });
  });

  it('persists JSON base64 PDF JD and multipart PDF upload with uploaded_date and streams it back', async () => {
    const jsonRes = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Minh Recruiter',
        email: 'minh@test-eval.dev',
        message: 'Attached PDF JD via JSON.',
        jdPdf: {
          fileName: 'staff-backend-jd.pdf',
          mimeType: 'application/pdf',
          contentBase64: VALID_PDF_BYTES.toString('base64'),
        },
      }),
    });
    expect(jsonRes.status).toBe(201);
    const jsonAck = (await jsonRes.json()) as ContactSubmissionAck;
    expect(jsonAck.jdType).toBe('pdf');
    expect(jsonAck.submittedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (jsonAck.id) createdContactIds.push(jsonAck.id);

    const dlRes = await fetch(`${baseUrl}/contact/${jsonAck.id}/jd-pdf`);
    expect(dlRes.status).toBe(200);
    expect(dlRes.headers.get('content-type')).toContain('application/pdf');
    expect(dlRes.headers.get('x-uploaded-date')).toBe(jsonAck.submittedDate);
    const downloadedBuf = Buffer.from(await dlRes.arrayBuffer());
    expect(downloadedBuf.equals(VALID_PDF_BYTES)).toBe(true);

    const form = new FormData();
    form.set('name', 'Alex Multipart');
    form.set('email', 'alex@test-eval.dev');
    form.set('message', 'Attached PDF JD via multipart/form-data.');
    form.set(
      'jdPdf',
      new File([VALID_PDF_BYTES], 'multipart-jd.pdf', { type: 'application/pdf' })
    );

    const mpRes = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      body: form,
    });
    expect(mpRes.status).toBe(201);
    const mpAck = (await mpRes.json()) as ContactSubmissionAck;
    expect(mpAck.jdType).toBe('pdf');
    if (mpAck.id) createdContactIds.push(mpAck.id);

    const { rows } = await pool.query<{ uploaded_date: string; byte_size: number }>(
      'SELECT uploaded_date::text AS uploaded_date, byte_size FROM contact_attachments WHERE submission_id = $1',
      [mpAck.id]
    );
    expect(rows[0]?.uploaded_date).toBe(mpAck.submittedDate);
    expect(rows[0]?.byte_size).toBe(VALID_PDF_BYTES.byteLength);
  });

  it('rejects disguised non-PDF attachments, oversized PDFs, and simultaneous jdUrl + jdPdf', async () => {
    const fakePdfRes = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad Actor',
        email: 'bad@test-eval.dev',
        message: 'Spoofed PDF header',
        jdPdf: {
          fileName: 'evil.pdf',
          mimeType: 'application/pdf',
          contentBase64: Buffer.from('<html><script>alert(1)</script></html>').toString('base64'),
        },
      }),
    });
    expect(fakePdfRes.status).toBe(400);

    const bothRes = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Both Fields',
        email: 'both@test-eval.dev',
        message: 'Both link and PDF',
        jdUrl: 'https://example.com/jd',
        jdPdf: {
          fileName: 'jd.pdf',
          mimeType: 'application/pdf',
          contentBase64: VALID_PDF_BYTES.toString('base64'),
        },
      }),
    });
    expect(bothRes.status).toBe(400);

    const bigBuffer = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(5 * 1024 * 1024 + 64, 65)]);
    const bigRes = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Huge File',
        email: 'huge@test-eval.dev',
        message: 'Over 5MB limit',
        jdPdf: {
          fileName: 'huge.pdf',
          mimeType: 'application/pdf',
          contentBase64: bigBuffer.toString('base64'),
        },
      }),
    });
    expect([400, 413]).toContain(bigRes.status);
  });

  it('streams a valid generated CV PDF from PostgreSQL data and increments cv_downloads', async () => {
    const beforeRes = await fetch(`${baseUrl}/analytics/daily?days=7`);
    expect(beforeRes.status).toBe(200);
    const before = (await beforeRes.json()) as ApiSuccessResponse<DailyAnalyticsReport>;

    const pdfRes = await fetch(`${baseUrl}/cv/pdf`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers.get('content-type')).toContain('application/pdf');
    expect(pdfRes.headers.get('content-disposition')).toContain('lazy-guy-resume.pdf');

    const bytes = Buffer.from(await pdfRes.arrayBuffer());
    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(bytes.byteLength).toBeGreaterThan(1000);

    const afterRes = await fetch(`${baseUrl}/analytics/daily?days=7`);
    const after = (await afterRes.json()) as ApiSuccessResponse<DailyAnalyticsReport>;
    expect(after.data.summary.allTimeCvDownloads).toBe(before.data.summary.allTimeCvDownloads + 1);
  });

  it('tracks unique daily visitors without storing raw IPs and returns zero-filled daily analytics', async () => {
    const beforeRes = await fetch(`${baseUrl}/analytics/daily?days=7`);
    expect(beforeRes.status).toBe(200);
    const before = (await beforeRes.json()) as ApiSuccessResponse<DailyAnalyticsReport>;
    expect(before.data.daily).toHaveLength(7);

    const uniqueUa = `TestAgent-${Date.now()}`;
    const v1 = await fetch(`${baseUrl}/analytics/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': uniqueUa },
      body: JSON.stringify({ path: '/test-e2e-home' }),
    });
    expect(v1.status).toBe(202);

    const v2 = await fetch(`${baseUrl}/analytics/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': uniqueUa },
      body: JSON.stringify({ path: '/test-e2e-projects' }),
    });
    expect(v2.status).toBe(202);

    const v3 = await fetch(`${baseUrl}/analytics/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': `${uniqueUa}-second` },
      body: JSON.stringify({ path: '/test-e2e-projects' }),
    });
    expect(v3.status).toBe(202);

    const afterRes = await fetch(`${baseUrl}/analytics/daily?days=7`);
    expect(afterRes.status).toBe(200);
    const after = (await afterRes.json()) as ApiSuccessResponse<DailyAnalyticsReport>;
    expect(after.data.daily).toHaveLength(7);
    expect(after.data.summary.todayViews).toBe(before.data.summary.todayViews + 3);
    expect(after.data.summary.todayUniqueVisitors).toBe(
      before.data.summary.todayUniqueVisitors + 2
    );

    const lastDay = after.data.daily[6];
    expect(lastDay?.metricDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(lastDay?.year).toBeGreaterThanOrEqual(2024);
    expect(lastDay?.month).toBeGreaterThanOrEqual(1);
    expect(lastDay?.day).toBeGreaterThanOrEqual(1);

    const rawIpRows = await pool.query<{ visitor_hash: string }>(
      "SELECT visitor_hash FROM analytics_daily_visitors WHERE visitor_hash LIKE '%127.0.0.1%'"
    );
    expect(rawIpRows.rows).toHaveLength(0);
  });
});
