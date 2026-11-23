# Backend Rules — `apps/api`

## 1. Layering & Contract Fidelity
- **Follow Tech Lead Contracts**: Every route path, query parameter, HTTP status code, and JSON response shape MUST match `specs/contracts/` and `db/schema.sql`. Do not invent ad-hoc fields or rename keys without a Tech Lead contract update.
- **Express Structure**: Register middleware and error handlers in `src/app.ts`; keep domain route handlers modular in `src/routes/*.ts` and database pooling in `src/db.ts`.

## 2. PostgreSQL & Serialization Safety
- **Parameterized Queries Only**: Always pass user inputs via `$1, $2, ...` placeholders to `pg`. Never interpolate SQL strings.
- **Deterministic Types**:
  - Cast PostgreSQL `DATE` columns `::text` (`YYYY-MM-DD`) so calendar dates never shift across timezones.
  - Cast `NUMERIC` columns (`::float8` or `Number(...)`) when contract specifies `number`.
- **Idempotent Seeds**: Any additions to `db/seed.sql` MUST remain 100% re-runnable (`ON CONFLICT` or `WHERE NOT EXISTS`).

## 3. Validation & Error Envelopes
- Trim string inputs and return `400` JSON errors (`{ error: string }`) on missing/whitespace fields, invalid email formats, or malformed JSON payloads.
- Verify every endpoint against real PostgreSQL in `src/__tests__/*.test.ts` (no mocked SQL query results).
