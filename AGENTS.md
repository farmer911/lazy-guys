# AGENTS.md

`lazy-guy` is a recruiter-focused developer portfolio monorepo (`apps/web` React + Vite + Tailwind + shadcn/ui, `apps/api` Express + TypeScript + `pg`, `apps/e2e` Playwright, `db/` PostgreSQL schema and seed).

## Startup Workflow

Before writing code:

1. **Confirm working directory** with `pwd`
2. **Read `AGENTS.md` and `GEMINI.md`** completely
3. **Run `./init.sh`** to verify Docker PostgreSQL, typecheck, unit tests, and build are healthy
4. **Read `feature_list.json` and `progress.md`** to see current feature state and next step
5. **Review recent commits** with `git log --oneline -5` (if git is initialized)

If baseline verification fails, fix it before adding new scope.

## Working Rules

- **One feature at a time**: Pick exactly one unfinished feature from `feature_list.json`.
- **Stay in scope**: Do not modify files unrelated to the active feature.
- **Zero-error, zero-warning**: `./init.sh`, `typecheck`, `test:unit`, and `build` must pass with 0 errors and 0 warnings.
- **Update artifacts**: Before ending a session, update `progress.md`, `feature_list.json`, and `session-handoff.md`.
- **Leave clean state**: Next session must be able to run `./init.sh` immediately.

## Required Artifacts

- `feature_list.json` — Feature state tracker (source of truth)
- `progress.md` — Session continuity log
- `init.sh` — Standard startup and verification path
- `session-handoff.md` — Session handoff and restart checklist

## Definition of Done

A feature is done only when ALL of the following are true:

- [ ] Target behavior is implemented
- [ ] Frontend unit tests with React Testing Library (`npm run test:unit`) pass with 0 warnings
- [ ] `./init.sh` (typecheck, RTL unit tests, production build) passes with 0 errors and 0 warnings
- [ ] Evidence is recorded in `feature_list.json` and `progress.md`
- [ ] Repository remains restartable from `./init.sh`

## End of Session

Before ending a session:

1. Update `progress.md` with current state and verification evidence
2. Update `feature_list.json` with new feature status and evidence
3. Update `session-handoff.md` with next-session startup steps and blockers
4. Leave the repository clean enough for `./init.sh` to pass immediately

## Verification Commands

```bash
# Full startup and verification (recommended)
./init.sh

# Individual checks
npm run typecheck
npm run test:unit   # Frontend unit tests (Vitest + React Testing Library + user-event)
npm run build
npm run test:e2e
```
