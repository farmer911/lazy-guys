# Root Cause Tracing

Bugs often surface deep in a stack (SQL error, timezone shift, broken UI render, hook rejection). Patching the symptom site masks the real defect and invites regressions.

**Core principle:** Trace invalid values backward across every layer until you reach the original producer, fix it at the source, and reinforce boundaries with `defense-in-depth.md`.

## Backward Tracing Protocol

1. **Capture exact failure evidence:** Full stack trace, HTTP status + body, SQL error, or Playwright assertion diff.
2. **Inspect the immediate failure site:** Identify the exact variable or payload that violated expectations.
3. **Walk one boundary up at a time:**
   - **Frontend (`apps/web/src/`):** Rendered DOM → component props → TanStack Query / Zustand state → `src/lib/api.ts` payload.
   - **Backend (`apps/api/src/`):** HTTP JSON response → route handler (`src/routes/*.ts`) → SQL query & type casts → `db/schema.sql` / `db/seed.sql`.
   - **Harness (`scripts/`):** `Stop` / `PreToolUse` decision → `.agents/logs/exec-state-*.json` & `hook-events.jsonl` → raw tool payload / `transcript.jsonl`.
4. **Confirm the origin before editing:** State a single testable hypothesis (*"Root cause is X at `file:line` because Y"*).
5. **Fix at the source with TDD:** Write a failing regression test proving the origin defect, apply the surgical fix, and run `npm run test:unit && npm run typecheck`.

## Isolating Test Pollution

When a test suite fails only in aggregate (shared DB rows, temp files, or module state), run individual files one-by-one until the polluter reproduces cleanly:

```bash
npx vitest run apps/api/src/__tests__/portfolio.test.ts
node --test scripts/agent-hooks.test.mjs
```

Use temporary directories (`fs.mkdtempSync(path.join(os.tmpdir(), '...'))`) with `finally` cleanup in all harness/hook tests so tests never mutate the repository working tree.
