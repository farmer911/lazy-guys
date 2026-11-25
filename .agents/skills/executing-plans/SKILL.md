---
name: executing-plans
description: Use when executing a written implementation plan inline task-by-task in the current session after the user chooses inline execution. Not for Role-DAG feature_delivery.py runs, ad-hoc tasks without a plan file, or design/brainstorming.
---

# Executing Plans

Execute a written plan inline, task by task, with strict TDD per task, crash-safe ledger tracking, and one fresh-context review at the end.

**Core principle:** Do not pause between tasks to ask "should I continue?". Decide minor ambiguities against the spec and record each as `Ruling: <decision> — <why> — <risk>` in the ledger. Stop only for destructive actions, security-sensitive changes, shared-branch merges/pushes, or a broken spec/plan.

Prefer `.agents/workflows/feature_delivery.py` (`run_workflow`) for full-stack `feature_list.json` features needing role isolation; inline execution still ends with the mandatory `evaluating-features` gate before marking a feature `"done"`.

## Setup

1. Ensure workspace isolation via `using-git-worktrees` (or explicit user consent to work on the active branch). See `../using-superpowers/references/antigravity-tools.md` for platform tool details.
2. Initialize the plan's gitignored workspace and ledger (also sync high-level goal & checklist into `.agents/STATE.md`):
   ```bash
   bash <executing-plans-dir>/scripts/sdd-workspace <PLAN_FILE>
   ```
   - `sdd-workspace` creates `<workspace>/progress.md` starting with `# SDD ledger — plan: <PLAN_FILE>`.
   - On resume after compaction/crash, skip tasks already marked `Task <N>: complete` (verify with `git log`).
3. Read the plan, its linked Spec, and load `test-driven-development`.
4. Run a quick **Pre-flight interface scan**: for each task pair sharing producer/consumer interfaces, verify signature alignment and log any `Ruling:` in the ledger (or write `Pre-flight: no shared interfaces`).

## Per-Task Loop

1. **Start task:**
   ```bash
   bash <executing-plans-dir>/scripts/task-start <PLAN_FILE> <N>
   ```
   Read the generated brief (exact signatures/values) and note `BASE` commit SHA.
2. **Execute RED → GREEN steps in order:**
   - Write and run the failing test first; watch it fail for the expected reason.
   - Compare every command output against `Expected:`:
     - **Code defect:** use `systematic-debugging` (fix root cause, never symptom).
     - **Plan defect:** apply smallest fix matching the Spec and record `Task <N>: Ruling: ...` in the ledger.
   - Commit task changes as specified (`BASE` anchors the task range, never `HEAD~1`).
3. **Complete task (mechanical gate + ledger append):**
   ```bash
   bash <executing-plans-dir>/scripts/task-done <PLAN_FILE> <N> <BASE> -- npm run test:unit
   ```
   (For chained commands like `npm run test:unit && npm run typecheck`, pass `-- bash -c 'npm run test:unit && npm run typecheck'`.)
   `task-done` appends `Task <N>: complete (...)` **only** when `<test command>` exits `0`. Never mark complete on a failing run.

## Final Review & Finish

After all tasks pass, run whole-branch fresh review, apply at most one TDD fix pass for Critical/Important findings, delete the temporary plan workspace, and finish via `finishing-a-development-branch` (plus `evaluating-features` before any `feature_list.json` `"done"` transition).

See [references/final-review-and-rationalizations.md](references/final-review-and-rationalizations.md) for the review prompt, grading rules, and rationalization table.
