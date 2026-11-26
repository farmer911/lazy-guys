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

1. **Query `be-kb` Before Writing SQL or Routes:** Run `node .agents/skills/be-kb/scripts/kb-cli.mjs search "<2-5 word query>" --dir .agents/skills/be-kb` and `node .agents/skills/be-kb/scripts/kb-cli.mjs retrieve "<id1,id2>" --dir .agents/skills/be-kb` before authoring joins/pagination, transactions/upserts, Zod request validation, or pool/payload bounds.
2. **RED-First Real PostgreSQL Tests:** Before editing `apps/api/src/routes/*.ts`, write a failing test in `apps/api/src/__tests__/*.test.ts` that queries real PostgreSQL and asserts distinct stored column values (existing endpoint smoke tests do not cover new contract fields).
3. **Parameterized & Deterministic Queries:** Pass all inputs via `$1, $2` placeholders, eliminate N+1 loops (`LEFT JOIN LATERAL` / `ANY($1::uuid[])`), use `pool.connect()` + `finally { client.release() }` for multi-statement transactions (never `pool.query('BEGIN')`), cast `DATE::text` (`YYYY-MM-DD`) and `NUMERIC::float8`, serialize `pg` `TIMESTAMPTZ` `Date` objects via `.toISOString()`, validate inputs via shared `zod` `safeParse` schemas, and keep `db/seed.sql` 100% re-runnable (`ON CONFLICT` / `WHERE NOT EXISTS`).
4. **Structured Return Contract (`BE_SCHEMA`: `BE_READY` vs `SCHEMA_MISMATCH`):**
   - When dispatched under `BE_SCHEMA` (or `[AGENT_ROLE: be]` strict JSON mode), emit **only** valid JSON matching `BE_SCHEMA` and **omit** `### Knowledge Guidance Applied` or any prose citation text so machine serialization never breaks.
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
| "I'll hand-roll `typeof req.body` checks or run `pool.query('BEGIN')` quickly without checking `be-kb`" | Manual parsing drifts from `specs/contracts/*` and `pool.query('BEGIN')` corrupts pooled connections. Retrieve `be-kb` guides first. |
| "I'll just edit `CREATE TABLE IF NOT EXISTS` in `db/schema.sql` myself" | `PreToolUse` blocks `be` writes to `db/schema.sql` (Tech Lead owns schema + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations). |

## Red Flags — STOP Immediately

- Returning JS object literals, `SELECT <constant> AS col`, or `?? ''` fallbacks for missing/nullable DB columns
- Calling `pool.query('BEGIN')`, running `await pool.query` inside loops, or skipping `zod` `safeParse` boundary validation
- Appending prose or `### Knowledge Guidance Applied` outside JSON when returning `BE_SCHEMA` output
- Editing `apps/api/src/routes/*.ts` before watching a new `apps/api/src/__tests__/*.test.ts` assertion fail (`RED`), or touching `db/schema.sql`, `specs/contracts/`, or `apps/web/`
