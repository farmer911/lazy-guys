# Backend Rules — `apps/api`

## 1. Layering & Contract Fidelity
- **Follow Tech Lead Contracts**: Every route path, query parameter, HTTP status code, and JSON response envelope MUST match `specs/contracts/` and `db/schema.sql` (escalate `SCHEMA_MISMATCH` via `be-express-pg` when `db/schema.sql` lacks required columns or non-null constraints). Never invent ad-hoc wrappers, hardcode fallback literals, or edit `db/schema.sql`.
- **Express & Pool Structure**: Register `express.json({ limit: '64kb' })` and central `500` error masking (never leaking raw SQL/constraint messages) in `src/app.ts`; keep modular route handlers in `src/routes/*.ts` and bounded `pg.Pool` config (`max`, timeouts, `statement_timeout`) in `src/db/pool.ts`.

## 2. PostgreSQL Queries, Transactions & Concurrency
- **Parameterized & Explicit Projections**: Pass all inputs via `$1, $2` placeholders and list explicit columns (never `SELECT *` or string-interpolated SQL).
- **Zero N+1 Queries**: Never execute `await pool.query` / `client.query` inside JS loops or unbounded `Promise.all(rows.map(...))`; collapse joins via `LEFT JOIN LATERAL`, `jsonb_agg`, or `ANY($1::uuid[])`, and use keyset `(sort_col, id)` cursors for paginated feeds.
- **Transactions & Atomic Idempotency**: Prefer single-statement writable CTEs; for multi-roundtrip transactions, check out `const client = await pool.connect()` with `BEGIN` / `COMMIT` / `ROLLBACK` and mandatory `finally { client.release() }` (**never** `pool.query('BEGIN')`). Enforce uniqueness via `INSERT ... ON CONFLICT` or SQLSTATE `'23505'` handling—never TOCTOU `SELECT`-before-`INSERT`—and keep `db/seed.sql` re-runnable (`ON CONFLICT` / `WHERE NOT EXISTS`).

## 3. Deterministic Serialization & Boundary Validation
- **Type Parity**: Cast `DATE` columns `::text` (`YYYY-MM-DD`), cast `NUMERIC` columns `::float8`, and serialize top-level `pg` `TIMESTAMPTZ` `Date` objects via `.toISOString()` (never type raw `pg` `TIMESTAMPTZ` columns as `string` without SQL text conversion).
- **Zod `safeParse` & RED Tests**: Validate `req.body`, `req.query` (clamping `limit`), and `req.params` with shared `zod` `safeParse` schemas from `specs/contracts/*` (never manual `as Record<string, unknown>` chains), return contract JSON errors (`{ error: string }`) on `400`/`404`/`409`, and write a failing RED real-PostgreSQL test in `src/__tests__/*.test.ts` first.
