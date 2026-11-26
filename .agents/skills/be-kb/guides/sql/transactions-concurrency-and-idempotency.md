---
id: "transactions-concurrency-and-idempotency"
title: "Postgres Transactions via pool.connect(), Writable CTEs & ON CONFLICT"
description: "Keep multi-step Postgres writes atomic using single-statement writable CTEs, dedicated pool.connect() clients with finally release, and ON CONFLICT."
tags: ["postgres", "transaction", "pool", "connect", "begin", "rollback", "concurrency", "idempotency", "upsert"]
maturity: "stable"
---

# Postgres Transactions via pool.connect(), Writable CTEs & ON CONFLICT

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Conditional or multi-table writes expressible in one SQL statement

Use a single-statement **writable CTE** (`WITH ... INSERT / UPDATE ... RETURNING`) so PostgreSQL guarantees atomicity in one network roundtrip without manual client checkout.

```sql
WITH upserted_submission AS (
  INSERT INTO contact_submissions (idempotency_key, name, email, message)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (idempotency_key) DO UPDATE
    SET updated_at = NOW()
  RETURNING id, created_at
)
INSERT INTO audit_logs (entity_id, event_type)
SELECT id, 'contact.received'
FROM upserted_submission
RETURNING entity_id;
```

- **DO** prefer single-statement writable CTEs whenever inputs for step 2 derive directly from `RETURNING` columns of step 1.
- **DON'T** open an explicit `BEGIN` / `COMMIT` block across multiple roundtrips when a single writable CTE eliminates idle-in-transaction lock hold time.

### Rule 2: Multi-roundtrip transactions requiring procedural TypeScript logic between queries

Check out a dedicated `PoolClient` via `await pool.connect()` and guarantee `client.release()` inside `finally`.

```ts
import type { Pool, PoolClient } from 'pg';

export async function withTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
```

- **DO** route **every** query inside `work` through `client.query(...)` (never `pool.query(...)`) and lock contested balance/quota rows with `SELECT ... FOR UPDATE`.
- **DO** suppress secondary `ROLLBACK` network errors inside `catch` so the original root-cause error propagates, and always call `client.release()` in `finally`.
- **DON'T** call `await pool.query('BEGIN')` — `pool.query()` dispatches each statement to an arbitrary idle connection from the pool, running subsequent writes **outside** the transaction while leaking an uncommitted transaction on a pooled socket.

### Rule 3: Idempotent writes & race-free uniqueness enforcement

Enforce uniqueness in PostgreSQL with `ON CONFLICT` or typed SQLSTATE `'23505'` (`unique_violation`) handling.

```ts
export const isPgUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as { code?: unknown }).code === '23505';
```

- **DO** use `INSERT ... ON CONFLICT (...) DO NOTHING / DO UPDATE` for idempotent retries, or map `isPgUniqueViolation(err)` to HTTP `409` when duplicates represent user-visible conflicts.
- **DON'T** check existence with `SELECT id FROM ... WHERE slug = $1` before `INSERT` (TOCTOU race) — concurrent requests both observe `0` rows and trigger unhandled `23505` `500` crashes.

## When NOT to replace legacy code

- **Keep existing pattern when:** `db/seed.sql` uses `INSERT ... SELECT ... WHERE NOT EXISTS (...)` on a table that intentionally lacks a `UNIQUE` constraint in `db/schema.sql` (since `db/schema.sql` DDL belongs to Tech Lead), or an isolated test helper uses a dedicated single-connection `pg.Client` (`max: 1`) per test file.
