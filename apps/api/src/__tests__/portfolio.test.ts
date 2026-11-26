import fs from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ContactSubmissionSchema,
  type Project,
  type ProjectSummary,
} from '../../../../specs/contracts/portfolio.js';
import type { ApiErrorResponse } from '../../../../specs/contracts/common.js';
import { createApp } from '../app.js';
import { pool } from '../db/pool.js';

describe('portfolio API integration', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await pool.end();
  });

  it('returns healthy status from PostgreSQL-backed health endpoint', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      status: 'ok',
      service: 'lazy-guy-api',
    });
  });

  it('returns seeded recruiter profile from PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/profile`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { full_name: string; email: string };
    expect(body.full_name).toBe('Lazy Guy');
    expect(body.email).toBe('hello@lazyguy.dev');
  });

  it('serializes experience dates as timezone-safe YYYY-MM-DD strings', async () => {
    const res = await fetch(`${baseUrl}/experiences`);
    expect(res.status).toBe(200);
    const rows = (await res.json()) as Array<{ company: string; start_date: string; end_date: string | null }>;
    expect(rows[0]?.company).toBe('Acme Tech');
    expect(rows[0]?.start_date).toBe('2024-01-01');
    expect(rows[1]?.start_date).toBe('2022-03-01');
    expect(rows[1]?.end_date).toBe('2023-12-31');
  });

  it('honors featured=false filter and returns numeric years_exp', async () => {
    const projRes = await fetch(`${baseUrl}/projects?featured=false`);
    expect(projRes.status).toBe(200);
    await expect(projRes.json()).resolves.toEqual([]);

    const stackRes = await fetch(`${baseUrl}/tech-stacks`);
    expect(stackRes.status).toBe(200);
    const stacks = (await stackRes.json()) as Array<{ years_exp: unknown }>;
    expect(typeof stacks[0]?.years_exp).toBe('number');
  });

  it('rejects whitespace-only contact submissions with 400', async () => {
    const res = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '   ',
        email: 'recruiter@example.com',
        message: 'Let us chat',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email format on contact submissions with 400', async () => {
    const res = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Recruiter',
        email: 'not-an-email',
        message: 'Let us chat',
      }),
    });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: 'Valid email is required',
    });
  });

  it('returns 400 instead of 500 on malformed JSON body', async () => {
    const res = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json',
    });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: 'Invalid JSON payload',
    });
  });

  it('re-applies db/schema.sql and db/seed.sql idempotently without duplicate rows or errors', async () => {
    const repoRoot = path.resolve(import.meta.dirname, '../../../..');
    const schemaSql = fs.readFileSync(path.join(repoRoot, 'db', 'schema.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(repoRoot, 'db', 'seed.sql'), 'utf8');

    const countAll = async () => {
      const { rows } = await pool.query<{
        profiles: number;
        experiences: number;
        projects: number;
        tech_stacks: number;
      }>(`
        SELECT
          (SELECT COUNT(*)::int FROM profiles) AS profiles,
          (SELECT COUNT(*)::int FROM experiences) AS experiences,
          (SELECT COUNT(*)::int FROM projects) AS projects,
          (SELECT COUNT(*)::int FROM tech_stacks) AS tech_stacks
      `);
      return rows[0];
    };

    const before = await countAll();
    await pool.query(schemaSql);
    await pool.query(seedSql);
    await pool.query(seedSql);
    const after = await countAll();

    expect(after).toEqual(before);
  });

  it('validates and trims payloads via shared ContactSubmissionSchema and single-hop Project DTO contract', async () => {
    const parsed = ContactSubmissionSchema.safeParse({
      name: '  Jane Recruiter  ',
      email: '  jane@acme.io  ',
      message: '  Interested in Staff role  ',
    });
    expect(parsed).toEqual({
      success: true,
      data: {
        name: 'Jane Recruiter',
        email: 'jane@acme.io',
        message: 'Interested in Staff role',
      },
    });

    const missingRes = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(missingRes.status).toBe(400);
    const errBody = (await missingRes.json()) as ApiErrorResponse;
    expect(errBody).toEqual({
      error: 'name, email, and message are required',
    });

    const projRes = await fetch(`${baseUrl}/projects`);
    const projects = (await projRes.json()) as Project[];
    const summary: ProjectSummary | undefined = projects[0];
    expect(summary?.slug).toBeTruthy();
  });
});
