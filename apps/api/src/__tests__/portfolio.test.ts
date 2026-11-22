import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
    await expect(res.json()).resolves.toEqual({
      error: 'name, email, and message are required',
    });
  });
});
