# Session Progress Log

## Current State

**Last Updated:** 2026-11-22 23:43
**Active Feature:** feat-005 - Recruiter Portfolio Polish

## Status

### What's Done

- [x] `feat-001`: Monorepo, Docker PostgreSQL & `./init.sh` bootstrap (0 errors, 0 warnings)
- [x] `feat-002`: PostgreSQL schema (`db/schema.sql`), seed (`db/seed.sql`), and Express REST API (`apps/api`)
- [x] `feat-003`: Portfolio UI (`apps/web`) with shadcn/ui, Zustand, TanStack Query, `react-hook-form`, and RTL unit tests (3/3)
- [x] `feat-004`: Live Playwright E2E Smoke Verification (`npm run test:e2e` auto-starting `dev:api` + `dev:web`, asserting PostgreSQL-seeded data)
- [x] Full Agent Harness hardening:
  - Initialized Git repository on `main` with clean baseline commit
  - Added `apps/api` Vitest integration test suite against real Express + PostgreSQL and fixed `/api/contact` whitespace validation via TDD
  - Added `scripts/check-harness.mjs` (+ `scripts/check-harness.test.mjs`) enforcing required artifacts, `feature_list.json` schema/evidence, `SKILL.md <= 250` lines, and no `__dirname` in configs

### What's In Progress

- [ ] `feat-005`: Recruiter Portfolio Polish (next user-facing enhancement)

### What's Next

1. Run `./init.sh` to verify green baseline
2. Align with user on specific scope for `feat-005` (e.g., CV download, project detail modal, or admin CRUD)
3. Implement `feat-005` following strict TDD (RED -> Verify RED -> GREEN -> Verify GREEN)

## Blockers / Risks

- None. Port `5434` is configured in `.env` for Docker PostgreSQL; Playwright `webServer` reuses or starts `4000` and `5173` automatically.

## Decisions Made

- **Playwright dual `webServer`**: `apps/e2e/playwright.config.ts` launches `dev:api` (polling `/api/health`) and `dev:web` automatically using `import.meta.dirname`.
- **Stdlib `scripts/check-harness.mjs`**: Zero-dependency mechanical enforcement of `GEMINI.md` and `AGENTS.md` invariants inside `./init.sh`.
- **Real PostgreSQL integration tests in `apps/api`**: Uses native `fetch` + ephemeral port (`app.listen(0)`) instead of `supertest` mocks.

## Files Modified This Session

- `.gitignore` - Ignore `*.tsbuildinfo`
- `apps/api/package.json` - Added `vitest` test script and excluded `src/__tests__` from `dist` build
- `apps/api/src/config/env.ts` - Enabled `quiet: true` on `dotenv.config` for 0 stderr noise
- `apps/api/src/routes/portfolio.ts` - Rejected whitespace-only strings in `POST /api/contact`
- `apps/api/src/__tests__/portfolio.test.ts` - Added real Express + PostgreSQL integration tests
- `apps/e2e/playwright.config.ts` - Added `webServer` auto-startup for API + Web
- `apps/e2e/tests/portfolio.spec.ts` - Tightened strict-mode heading locators and verified live seeded PostgreSQL rows
- `scripts/check-harness.mjs` & `scripts/check-harness.test.mjs` - Mechanical harness validator and unit tests
- `package.json`, `init.sh`, `AGENTS.md`, `feature_list.json`, `progress.md`, `session-handoff.md` - Wired harness checks and recorded `feat-004` completion

## Evidence of Completion

- [x] `./init.sh`: exit code 0, 0 errors, 0 warnings
- [x] `npm run check:harness`: pass
- [x] `npm run typecheck`: pass (`apps/api`, `apps/web`, `apps/e2e`)
- [x] `npm run test:unit`: pass (4 harness tests + 3 API tests + 3 Web RTL tests = 10/10)
- [x] `npm run build`: pass (`apps/api` + `apps/web`)
- [x] `npm run test:e2e`: pass (1/1 Chromium smoke test against live API + PostgreSQL)

## Notes for Next Session

Run `./init.sh` first, review `git log --oneline -5`, and start `feat-005`.
