# Backend Express & PostgreSQL Knowledge Pack — Guide Index

- [query-optimization-and-eliminating-n-plus-1.md](sql/query-optimization-and-eliminating-n-plus-1.md) — Single-roundtrip `LEFT JOIN LATERAL` / `ANY($1::uuid[])` joins, explicit `pg` `DATE::text` / `NUMERIC::float8` / `TIMESTAMPTZ` serialization, and keyset cursor pagination.
- [transactions-concurrency-and-idempotency.md](sql/transactions-concurrency-and-idempotency.md) — Single-statement writable CTEs, dedicated `pool.connect()` transactions with `finally { client.release() }`, and `ON CONFLICT` / `23505` concurrency safety.
- [zod-request-validation-and-error-envelopes.md](api/zod-request-validation-and-error-envelopes.md) — Shared `zod` `safeParse` boundary validation for `req.body` / `req.query` / `req.params`, contract envelopes, and central `500` SQL error masking.
- [api-latency-pooling-and-bounded-payloads.md](performance/api-latency-pooling-and-bounded-payloads.md) — `express.json({ limit: '64kb' })` payload bounds, `pg.Pool` connection & `statement_timeout` budgets, bounded `Promise.all`, and `Cache-Control` headers.
