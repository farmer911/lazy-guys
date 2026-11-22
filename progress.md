# Session Progress Log

## Current State

**Last Updated:** 2026-11-23 00:43
**Active Feature:** feat-005 - Recruiter Portfolio Polish

## Status

### What's Done

- [x] `feat-001`: Monorepo, Docker PostgreSQL & `./init.sh` bootstrap — Evaluator `PASS` (`evaluations/feat-001.json`, 9/8/8/8)
- [x] `feat-002`: PostgreSQL schema, seed & Express REST API — Evaluator `PASS` (`evaluations/feat-002.json`, 9/8/8/9 after fixing 3 defects surfaced in Round 1)
- [x] `feat-003`: Portfolio UI & RTL tests — Evaluator `PASS` (`evaluations/feat-003.json`, 9/8/8/9 after fixing 4 mobile/timezone/form defects surfaced in Round 1)
- [x] `feat-004`: Live Playwright E2E Smoke Verification — Evaluator `PASS` (`evaluations/feat-004.json`, 8/7/7/8)
- [x] Standalone AI Evaluator Architecture (Generator–Evaluator Separation):
  - Created `.agents/skills/evaluating-features/SKILL.md` (`89` lines, verified RED -> GREEN under combined pressure scenario) and `evaluator-prompt.md`
  - Upgraded `scripts/check-harness.mjs` (+ `8` unit tests in `scripts/check-harness.test.mjs`) to mechanically block `"status": "done"` without a valid `evaluations/<feat-id>.json` (`evaluatorRole: "independent-evaluator"`, 4 rubric scores `>= 7/10`, `blockingIssues: []`, `verdict: "PASS"`)
  - Updated `AGENTS.md` to enforce `ready-for-eval` -> Independent `feature-evaluator` subagent -> `done`
- [x] CI/CD & Harness Commit-Verification Upgrade:
  - Added `.github/workflows/ci.yml` covering `push`, `pull_request`, weekly Monday `schedule` (`0 2 * * 1` + `npm audit --audit-level=high`), and `workflow_dispatch` with PostgreSQL 16 service container, full git history (`fetch-depth: 0`), `check:harness`, `typecheck`, `test:unit`, `build`, and Playwright Chromium `test:e2e`
  - Tightened `scripts/check-harness.mjs` (+ `3` new TDD unit tests in `scripts/check-harness.test.mjs`, `11/11` total) to enforce `.github/workflows/ci.yml` presence/triggers/gates and verify `evaluatedCommit` exists in real git history via `git cat-file -e`

### What's In Progress

- [ ] `feat-005`: Recruiter Portfolio Polish (awaiting scope selection)

### What's Next

1. Run `./init.sh` to verify baseline health
2. Choose `feat-005` enhancement (Evaluator noted CV download CTA, `aria-pressed` on tech stack filter buttons, and Project card alignment as high-value recruiter polish items)
3. Implement via TDD -> stage `ready-for-eval` -> dispatch `feature-evaluator`

## Blockers / Risks

- None.

## Decisions Made

- **Strict Generator–Evaluator Split**: Generator cannot self-certify `"done"` or write `evaluations/*.json`; mechanical gate in `scripts/check-harness.mjs` enforces rubric thresholds (`>= 7/10`).
- **UTC-Safe Calendar Dates**: Cast PostgreSQL `DATE` columns `::text` in `apps/api` and format with `timeZone: 'UTC'` in `ExperienceSection.tsx` to eliminate US/UTC month/year shift.

## Files Modified This Session

- `.github/workflows/ci.yml` - Unified GitHub Actions CI + weekly mechanical drift sweep workflow
- `.agents/skills/evaluating-features/SKILL.md` & `evaluator-prompt.md` - Standalone AI Evaluator skill and prompt contract
- `evaluations/feat-001.json` .. `evaluations/feat-004.json` - Independent AI Evaluator `PASS` artifacts
- `scripts/check-harness.mjs` & `scripts/check-harness.test.mjs` - Mechanical Evaluator, git commit SHA, and CI workflow gate (`11/11` unit tests)
- `apps/api/src/app.ts`, `apps/api/src/routes/portfolio.ts`, `apps/api/src/__tests__/portfolio.test.ts`, `apps/api/package.json` - Fixed malformed JSON 400, email validation, date/numeric serialization, and `featured=false` filter (7/7 tests)
- `apps/web/src/App.tsx`, `apps/web/src/components/ExperienceSection.tsx`, `apps/web/src/components/ContactForm.tsx`, `apps/web/src/components/__tests__/ContactForm.test.tsx`, `apps/web/src/components/__tests__/ExperienceSection.test.tsx` - Fixed mobile `375px` overflow, UTC date formatting, accessible labels, and error alerts (5/5 RTL suites)
- `apps/e2e/tests/portfolio.spec.ts` - Added mobile `375x812` horizontal-overflow E2E assertion (2/2 E2E tests)
- `AGENTS.md`, `feature_list.json`, `progress.md`, `session-handoff.md` - Updated harness rules and state

## Evidence of Completion

- [x] `./init.sh`: exit code 0, 0 errors, 0 warnings
- [x] `npm run check:harness`: pass (CI workflow + all 4 `evaluations/feat-00*.json` SHAs verified `PASS`)
- [x] `npm run typecheck`: pass (`apps/api`, `apps/web`, `apps/e2e`)
- [x] `npm run test:unit`: pass (11 harness + 7 API + 5 Web RTL = 23/23 tests)
- [x] `npm run build`: pass (`apps/api` + `apps/web`, 0 warnings)
- [x] `npm run test:e2e`: pass (2/2 Chromium E2E tests)
