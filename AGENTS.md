# AGENTS.md

`lazy-guy` is a recruiter-focused developer portfolio monorepo (`apps/web` React + Vite + Tailwind + shadcn/ui, `apps/api` Express + TypeScript + `pg`, `apps/e2e` Playwright, `db/` PostgreSQL schema and seed).

## Startup Workflow

Before writing code:

1. **Confirm working directory** with `pwd`
2. **Read `AGENTS.md` and `GEMINI.md`** completely
3. **Run `./init.sh`** to verify Docker PostgreSQL, harness rules, typecheck, unit tests, and build are healthy
4. **Read `feature_list.json` and `progress.md`** to see current feature state and next step
5. **Review recent commits** with `git log --oneline -5`

If baseline verification fails, fix it before adding new scope.

## Working Rules & Generator–Evaluator Separation

- **One feature at a time**: Pick exactly one unfinished feature from `feature_list.json`.
- **Task Execution Guardrail (`.agents/skills/task-guardrail/SKILL.md`)**: For any task modifying `>= 2` files or verification steps, read and follow `task-guardrail` (emit Pre-Edit Brief with `Goal & Scope`, `Assumptions / Non-Goals`, and `Step | Verify` list before editing; run step-gated checks; end with `Changes`, `Skipped / Unchanged`, and `Empirical Proof`).
- **Surface assumptions & push back**: If a spec in `feature_list.json` has multiple interpretations or a simpler approach exists, state assumptions and ask before writing the first test.
- **Stay in scope & clean only your own orphans**: Every changed line must trace directly to the active feature. Remove imports, variables, or helpers made unused by your changes; never delete pre-existing dead code or reformat adjacent code (log unrelated dead code in `progress.md` instead).
- **Zero-error, zero-warning & Mechanical Hygiene**: `./init.sh`, `typecheck`, `test:unit`, `build`, and `test:e2e` must pass with 0 errors and 0 warnings. All workspace `tsconfig*.json` enforce `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, and `noUncheckedSideEffectImports`, while `check:harness` bans `@ts-ignore`/`@ts-nocheck`, explicit `any`, `debugger`, stray `console.log`, `.only`/`.skip` tests, and non-arrow functions (`function` declarations/expressions) in `apps/web/src/`.
- **Multi-Agent Branching Graphs & Google Stitch UI Ground Truth (`.agents/workflows/`)**:
  - **6 Role-Isolated Sub-Agents** (`[AGENT_ROLE: pm | design | tech-lead | be | fe | qa]`): Each role loads only its folder `AGENTS.md` (`apps/web/AGENTS.md`, `apps/api/AGENTS.md`, `apps/e2e/AGENTS.md`) and dedicated skill (`pm-prd-story`, `design-stitch-flow`, `tech-lead-contract`, `fe-shadcn-clean`, `qa-vercel-audit`). `PreToolUse` in `scripts/agent-hooks.mjs` mechanically blocks cross-directory writes.
  - **3 Executable `run_workflow` Python DAGs**:
    1. `.agents/workflows/project_init.py` — `PM (specs/prd.md) -> Design (Google Stitch Full Flow + UI/UX Pro Max + Impeccable) -> Human Gate -> Freeze to designs/ -> Tech Lead`.
    2. `.agents/workflows/feature_delivery.py` — `Tech Lead Contract (specs/contracts/<id>.ts) -> BE -> FE <-> Tech Lead Escalation (max_retries=2) -> Hard Mechanical Gate (./init.sh) -> White-Room QA Evaluator`.
    3. `.agents/workflows/bugfix.py` — `Tech Lead Root Cause -> Scoped BE/FE TDD Fix -> Hard Mechanical Gate -> QA Regression Verification`.
- **Lifecycle & Git Hooks (`.agents/hooks.json`, `.githooks/`)**:
  - `PreToolUse` (`scripts/agent-hooks.mjs`) mechanically blocks Generator sessions from writing/forging `evaluations/*.json`, enforces `[AGENT_ROLE: ...]` directory write allowlists, and blocks `--no-verify` or altering `core.hooksPath`.
  - `Stop` (`scripts/agent-hooks.mjs`) blocks turn completion whenever `npm run check:harness` has violations.
  - `./init.sh` configures `git config core.hooksPath .githooks` (`pre-commit` runs `check:harness` + `typecheck`; `pre-push` adds `test:unit` + `build`) and idempotently applies `db/schema.sql` and `db/seed.sql`.
- **Strict Generator–Evaluator Split (`.agents/skills/evaluating-features/SKILL.md`)**:
  - The implementing agent (**Generator**) MUST NEVER self-grade a feature as `"done"` or write/edit `evaluations/<feat-id>.json`.
  - When implementation and tests pass, the Generator sets `"status": "ready-for-eval"`, commits `HEAD`, and dispatches a fresh-context **Independent AI Evaluator** subagent (`feature-evaluator`) using `.agents/skills/evaluating-features/evaluator-prompt.md`.
  - Only after the independent Evaluator probes the live running app/API and writes `evaluations/<feat-id>.json` with `"verdict": "PASS"` (all 4 rubric criteria `>= 7/10`, `blockingIssues: []`, and `evaluatedCommit` verified as an ancestor of `HEAD`) may the feature be marked `"status": "done"`.
- **Update artifacts**: Before ending a session, update `progress.md`, `feature_list.json`, and `session-handoff.md`.
- **Leave clean state**: Next session must be able to run `./init.sh` immediately.

## Required Artifacts

- `feature_list.json` — Feature state tracker (`not-started` | `in-progress` | `ready-for-eval` | `done`)
- `evaluations/<feat-id>.json` — Independent AI Evaluator rubric & `PASS` sign-off required for every `done` feature
- `progress.md` — Session continuity log
- `init.sh` — Standard startup and mechanical verification gate
- `session-handoff.md` — Session handoff and restart checklist

## Definition of Done

A feature is `"done"` only when ALL of the following are true:

- [ ] Target behavior is implemented via TDD
- [ ] Unit/integration tests (`npm run test:unit`) and Playwright E2E (`npm run test:e2e`) pass with 0 warnings
- [ ] Generator staged `"status": "ready-for-eval"` and dispatched an independent Evaluator subagent
- [ ] Independent Evaluator verified live runtime UX/API and wrote `evaluations/<feat-id>.json` with `"verdict": "PASS"` (all rubric scores `>= 7`)
- [ ] Evidence is recorded in `feature_list.json` and `progress.md`, and `./init.sh` passes with 0 errors and 0 warnings

## End of Session

Before ending a session:

1. Update `progress.md` with current state and verification evidence
2. Update `feature_list.json` (`ready-for-eval` if awaiting evaluation, or `done` only with `evaluations/<feat-id>.json` PASS)
3. Update `session-handoff.md` with next-session startup steps and blockers
4. Run `./init.sh` fresh after final edits and commit a clean checkpoint

## Verification Commands

```bash
# Full startup and verification (recommended)
./init.sh

# Individual checks
npm run check:harness  # Mechanical check: artifacts, feature_list.json, evaluations/*.json PASS gates, SKILL.md <= 250, ESM
npm run typecheck
npm run test:unit      # Harness + API integration (Vitest) + Web unit tests (Vitest + RTL)
npm run build
npm run test:e2e       # Playwright E2E (auto-starts dev:api & dev:web via webServer)
```
