---
name: be-express-pg
description: Use when implementing Express routes, PostgreSQL queries, or seed updates in apps/api and db/seed.sql as the Backend role. Not for frontend React UI, schema DDL ownership, or QA evaluation.
---

# Backend Implementation (`Express` + Real `PostgreSQL` Contract Fidelity)

## Overview

Implement API endpoints in `apps/api/` and idempotent seed rows in `db/seed.sql` strictly from `specs/contracts/<feat-id>.ts` and `db/schema.sql` (following `apps/api/AGENTS.md`). Every response field must come from real PostgreSQL persistence via `apps/api/src/db/pool.ts`—never from route-layer stubs.

## Iron Law

```text
ZERO HARDCODED ROUTE LITERALS, SQL CONSTANT PROJECTIONS, OR SILENT SCHEMA COALESCING FOR CONTRACT FIELDS
```

Never synthesize missing columns (`SELECT 4 AS team_size`, `row.field ?? 'default'`), never mask nullable DB columns when the contract specifies non-null types, and never attempt to edit `db/schema.sql` or `specs/contracts/` yourself.

## Implementation & Escalation Rules

1. **RED-First Real PostgreSQL Tests:** Before editing `apps/api/src/routes/*.ts`, write a failing test in `apps/api/src/__tests__/*.test.ts` that queries real PostgreSQL and asserts distinct stored column values (existing endpoint smoke tests do not cover new contract fields).
2. **Parameterized & Deterministic Queries:** Pass all inputs via `$1, $2` placeholders to `pool.query`, cast `DATE` columns `::text` (`YYYY-MM-DD`), cast `NUMERIC` columns to `number`, and keep `db/seed.sql` 100% re-runnable (`ON CONFLICT` / `WHERE NOT EXISTS`).
3. **Structured Return Contract (`BE_READY` vs `SCHEMA_MISMATCH`):**
   - When `db/schema.sql` backs every field and nullability constraint in `specs/contracts/<feat-id>.ts` and tests pass:
     `{"status": "BE_READY", "changedFiles": [...], "testsRun": "npm run test --workspace=apps/api && npm run typecheck --workspace=apps/api"}`
   - When `specs/contracts/<feat-id>.ts` requires a table, column, or non-null constraint absent from `db/schema.sql`: STOP before touching routes and escalate to Tech Lead:
     ```json
     {
       "status": "SCHEMA_MISMATCH",
       "mismatches": [
         {
           "endpoint": "GET /api/projects",
           "expectedByUi": "team_size: number & non-null resume_url: string in contract",
           "actualInContractOrApi": "projects.team_size missing and profiles.resume_url is nullable TEXT in db/schema.sql"
         }
       ]
     }
     ```

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "PM said demo is in 3 minutes—hardcode `team_size: 4` or `COALESCE(resume_url, '')` so FE unblocks" | Faking DB fields in JS/SQL corrupts persistence truth and hides schema drift. Emit `"status": "SCHEMA_MISMATCH"` so Tech Lead updates `db/schema.sql`. |
| "`GET /api/projects` already has an integration test in `portfolio.test.ts`" | Pre-existing endpoint tests do not verify new contract fields. Add a failing RED assertion on real DB row values first. |
| "I'll just edit `CREATE TABLE IF NOT EXISTS` in `db/schema.sql` myself" | `PreToolUse` blocks `be` writes to `db/schema.sql` (Tech Lead owns schema + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations). |

## Red Flags — STOP Immediately

- Returning JS object literals, `SELECT <constant> AS col`, or `?? ''` fallbacks for missing/nullable DB columns
- Editing `apps/api/src/routes/*.ts` before watching a new `apps/api/src/__tests__/*.test.ts` assertion fail (`RED`)
- Touching `db/schema.sql`, `specs/contracts/`, or `apps/web/`
