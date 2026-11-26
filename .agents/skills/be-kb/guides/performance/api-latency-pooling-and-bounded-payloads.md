---
id: "api-latency-pooling-and-bounded-payloads"
title: "Bound Payload Size, Connection Pool Timeouts & Query Latency"
description: "Protect Express and pg stability with 64kb JSON payload caps, explicit Pool connection and statement timeouts, bounded Promise.all, and Cache-Control."
tags: ["connection", "pool", "timeout", "payload", "statement_timeout", "limit", "cache-control", "latency"]
maturity: "stable"
---

# Bound Payload Size, Connection Pool Timeouts & Query Latency

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Capping request payload size & query result limits

Enforce an explicit JSON body ceiling on `express.json()` in `src/app.ts` and clamp every client-supplied `limit` parameter.

```ts
app.use(express.json({ limit: '64kb' }));

// Error middleware maps body-parser 413 PayloadTooLargeError cleanly:
if (err.type === 'entity.too.large' || err.status === 413) {
  res.status(413).json({ error: 'Request payload exceeds 64kb limit' });
  return;
}
```

- **DO** pass `{ limit: '64kb' }` to `express.json()` for standard JSON APIs (Express defaults to `100kb`, and custom setups often raise it to `'10mb'`, allowing a handful of large requests to stall V8 `JSON.parse` on the main event loop).
- **DO** clamp list `limit` parameters (`Math.min(Math.max(limit, 1), 100)`) and add `LIMIT` to open-ended user-generated tables.
- **DON'T** accept unbounded array inputs in `POST`/`PATCH` bodies without `.max(...)` on the shared `zod` array schema.

### Rule 2: Configuring `pg.Pool` connection & SQL `statement_timeout` bounds

Configure finite pool sizing, acquisition deadlines, idle eviction, and server-side `statement_timeout` in `src/db/pool.ts`.

```ts
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 5_000,
});
```

- **DO** set `max` (`10–20` per Node instance so total instances stay below PostgreSQL `max_connections`), `connectionTimeoutMillis`, `idleTimeoutMillis`, and `statement_timeout` so runaway locks fail fast instead of hanging sockets forever.
- **DON'T** instantiate `new Pool(...)` inside route handlers or per request — share the singleton `pool` exported from `src/db/pool.ts`.

### Rule 3: Bounded query fan-out & HTTP `Cache-Control` before external caches

Parallelize at most `2–3` independent queries per request and use standard HTTP `Cache-Control` headers on public read endpoints before adding Redis or in-memory caches.

```ts
const [profileRes, featuredProjectsRes] = await Promise.all([
  pool.query<Profile>('SELECT id, full_name, headline FROM profiles ORDER BY created_at ASC LIMIT 1'),
  pool.query<ProjectSummary>(
    'SELECT id, title, slug, summary, tech_tags, featured FROM projects WHERE featured = TRUE ORDER BY sort_order ASC LIMIT 6'
  ),
]);
res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
```

- **DO** limit `Promise.all` to a fixed tuple of `2–3` independent queries (otherwise a single request consumes the entire `pg.Pool` `max` budget under concurrency), and set `Cache-Control` on anonymous, read-heavy catalog/portfolio GET endpoints when freshness tolerances allow.
- **DON'T** introduce Redis, custom LRU maps, or manual cache-invalidation hooks when an indexed SQL query (`< 5ms`) plus HTTP `Cache-Control` satisfies latency budgets without stale-state bugs.

## When NOT to replace legacy code

- **Keep existing pattern when:** Endpoints mutate data or immediately reflect newly written rows in E2E read-after-write flows where `max-age > 0` would serve stale state (omit `public, max-age` or use `Cache-Control: no-store`), or when a dedicated upload/webhook route requires an isolated higher body limit (`express.json({ limit: '1mb' })`) mounted only on that route.
