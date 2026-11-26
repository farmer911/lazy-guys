---
id: "scale-ready-stateless-design"
title: "Stateless Horizontal API Scaling & Measured Infra Triggers"
description: "Keep Express and PostgreSQL APIs horizontally scalable from day 1 with stateless processes, keyset cursors, and bounded pools while avoiding premature Redis, queues, or boilerplate layers."
tags: ["horizontal", "scale", "stateless", "api", "cursor", "pagination", "pool", "cache", "idempotency"]
maturity: "stable"
---

# Stateless Horizontal API Scaling & Measured Infra Triggers

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Day-1 horizontal scale primitives (zero extra infrastructure)

Design every API process to be 100% stateless and bounded so `1` instance scales to `N` replicas behind a load balancer without code changes.

```ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 3_000,
  statement_timeout: 5_000,
});

// Keyset cursor query: O(limit) index scan with deterministic id tie-breaker
const LIST_PROJECTS_CURSOR_SQL = `
  SELECT id, title, slug, summary, sort_order
  FROM projects
  WHERE profile_id = $1
    AND ($2::int IS NULL OR (sort_order, id) > ($2::int, $3::uuid))
  ORDER BY sort_order ASC, id ASC
  LIMIT $4
`;

export const encodeCursor = (sortOrder: number, id: string): string =>
  Buffer.from(JSON.stringify({ s: sortOrder, id }), 'utf8').toString('base64url');

// Stateless DB-backed write idempotency across horizontal replicas
const INSERT_SUBMISSION_IDEMPOTENT_SQL = `
  INSERT INTO contact_submissions (idempotency_key, name, email, message)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (idempotency_key) DO UPDATE
    SET idempotency_key = EXCLUDED.idempotency_key
  RETURNING id, created_at
`;
```

- **DO** keep request handlers stateless—persist sessions, rate-limit counters, and idempotency records in PostgreSQL (or signed stateless tokens) rather than process memory.
- **DO** paginate growing feeds with keyset cursors (`WHERE (sort_order, id) > ($2, $3) ORDER BY sort_order ASC, id ASC LIMIT $4`, fetching `limit + 1` rows to compute `hasMore` and encoding `{ sortOrder, id }` into `nextCursor`) and clamp `limit` (`Math.min(requestedLimit, 100)`).
- **DO** bound `pg.Pool` (`max`, `connectionTimeoutMillis`, `statement_timeout`), cap JSON body size (`express.json({ limit: '64kb' })`), set `Cache-Control: public, max-age=60, stale-while-revalidate=300` on public read routes, and enforce write idempotency via unique DB keys (`ON CONFLICT (idempotency_key)`).
- **DON'T** store mutable sessions, response caches, or rate-limit buckets in module-scoped `new Map()` / `new Set()` singletons—state diverges across replicas and leaks heap memory under unbounded keys.
- **DON'T** use `OFFSET` pagination on unbounded or frequently mutated tables (`OFFSET 10000` still scans and discards `10,000` heap/index entries per request and skips/duplicates rows on concurrent inserts).

### Rule 2: Add external infrastructure or extra layers only on measured triggers

Keep a lean 2-tier `route -> focused query/domain module` architecture until concrete runtime thresholds are crossed:

| Infrastructure / Layer | Add ONLY When Measured Threshold Crossed | Day-1 Stateless Substitute |
| :--- | :--- | :--- |
| **PgBouncer / Proxy** | `replicas * pool.max > 70%` of Postgres `max_connections` or serverless fan-out | Bounded `pg.Pool({ max: 10, connectionTimeoutMillis: 3000 })` |
| **Redis** | Cross-replica sub-10ms rate limit / pub-sub, or read p95 `> 50ms` after indexing + HTTP cache | Composite B-tree index + `Cache-Control` / `ETag` headers |
| **Job Queue (`pg-boss` / BullMQ)** | Side-effect latency p95 `> 250ms` or independent retry/dead-letter required | Synchronous DB write with `statement_timeout` + `AbortSignal.timeout()` |
| **Service / Repository Layers** | Same domain invariant invoked by `>= 2` transports (HTTP + worker/CLI) | Direct `route -> typed SQL query module` |

- **DO** measure PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` and p95 latency before proposing new stateful services.
- **DON'T** interpret *"design for scale"* as day-1 Redis caches, Kafka/RabbitMQ brokers, CQRS event buses, or 4-layer `Controller -> Service -> Repository -> Mapper` pass-through classes with `1` implementation each.

## When NOT to replace legacy code

- **Keep existing pattern when:** `OFFSET` pagination backs a bounded internal/admin table (`< 5,000` rows) whose UX explicitly requires numbered page jumps (`Page 1 ... 12`), or a module-level `Map` is an immutable constant lookup table (`new Map([['key', 'val']])`) initialized once at startup.
