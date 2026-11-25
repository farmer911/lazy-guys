---
name: writing-plans
description: Use when turning an approved spec or multi-step requirement into an executable TDD implementation plan before writing code. Not for 1-file fixes, Role-DAG feature_delivery.py runs, or open-ended design exploration before requirements are settled.
---

# Writing Plans

Write bite-sized, unambiguous TDD plans saved to `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md` (unless the user specifies another path). DRY, YAGNI, TDD, frequent commits.

## Decomposition Rules

- **Scope check:** If a spec spans independent subsystems, propose splitting into separate plans.
- **File boundaries:** Name exact files to create/modify and their single responsibility before listing tasks.
- **Right-sized tasks:** Each task ends with an independently testable deliverable (fold config/docs into the task that needs them).
- **Unambiguous steps:** Pin exact file paths, TypeScript interfaces/signatures, spec values, and verification commands — never write `"TBD"`, `"handle edge cases"`, or copy full implementation bodies that signatures + tests already determine.

## Required Plan Structure

````markdown
# [Feature Name] Implementation Plan

> **Execution:** Use `.agents/workflows/feature_delivery.py` (`run_workflow`) for role-isolated full-stack delivery, or `executing-plans` for inline TDD execution.

**Goal:** [One sentence] | **Spec:** [path] | **Tech Stack:** TypeScript, Express/pg, React/Vite/Tailwind/shadcn, Vitest, Playwright

## Global Constraints & Review Focus
- [Exact constraints copied from spec]
- [Top 3–5 edge-case inputs/failure modes not explicitly scripted in spec, each pinned to a task test]

### Task N: [Component / Route Name]
**Files:** Create `apps/api/src/...ts` | Modify `apps/web/src/...tsx:10-40` | Test `apps/api/src/__tests__/...test.ts`
**Interfaces:** Consumes `<Type>` | Produces `export const handler = ...`

- [ ] **Step 1 (RED):** Add failing Vitest / RTL / Node test asserting exact spec values
- [ ] **Step 2 (Verify RED):** Run `npm run test --workspace=apps/api` → Expected: FAIL on new assertion
- [ ] **Step 3 (GREEN):** Implement minimal production code in `apps/...`
- [ ] **Step 4 (Verify GREEN):** Run `npm run test:unit && npm run typecheck` → Expected: PASS, 0 warnings
- [ ] **Step 5 (Commit):** `git add <files> && git commit -m "feat: ..."`
````

## Self-Review Before Handoff

Check inline before showing the plan:
1. Every spec requirement maps to a task; every Review Focus edge case has a test.
2. Interface names and types match across producer and consumer tasks.
3. Plan is concise (decisions + signatures + assertions, not a full code transcript).

## Execution Handoff

Link the saved plan and ask the user to confirm it (plus pick an approach if not already chosen):
- **Role-Isolated Workflow DAG (`run_workflow`)**: `.agents/workflows/feature_delivery.py` with `{"featureId": "<feat-id>"}` — best for full-stack `feature_list.json` work.
- **Inline Session (`executing-plans`)**: Single-session TDD with ledger tracking, followed by mandatory `evaluating-features` before `"done"` — fastest for single-domain plans.
