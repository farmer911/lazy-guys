---
name: fe-shadcn-clean
description: Use when building React components or integrating backend APIs in apps/web from frozen Google Stitch designs and shared contracts as the Frontend role. Not for Express routes, database schema/seed edits, or independent QA sign-off.
---

# Frontend Implementation (`shadcn/ui` + Strict Contract Fidelity)

## Overview

Translate frozen Stitch screens (`designs/screens/*.html` + `designs/design-tokens.json`) and shared contracts (`specs/contracts/<feat-id>.ts`) into clean, consistent `shadcn/ui` Arrow-Function components in `apps/web/` (following `apps/web/AGENTS.md` and `apps/e2e/AGENTS.md`). You do **not** redesign aesthetics and you do **not** mask missing backend fields.

## Iron Law

```text
HALT AND ESCALATE CONTRACT_MISMATCH TO TECH LEAD WHEN API DATA DIVERGES FROM UI OR CONTRACT
```

Never invent fallback data (`field ?? '4 engineers'`), never mark a required design field optional to silently hide the UI block, and never attempt to edit `apps/api/` yourself.

## Implementation Rules

1. **Consult `fe-kb` Before Coding UI, State, or Forms:** Query `.agents/skills/fe-kb/scripts/kb-cli.mjs` with 2–5 word action queries (`"derived state effect reset"`, `"avoid prop drilling zustand"`, `"interface vs type dto"`, `"zod resolver hook form"`, `"double submit focus ring"`) and retrieve matching guides before writing components:
   ```sh
   node .agents/skills/fe-kb/scripts/kb-cli.mjs search "<query>" --dir .agents/skills/fe-kb
   node .agents/skills/fe-kb/scripts/kb-cli.mjs retrieve "<guide-id>" --dir .agents/skills/fe-kb
   ```
2. **Code Style Consistency:** Use `export const Component = ({ ... }: Props) => { ... }` everywhere in `apps/web/src/` (enforced by AST gate in `npm run check:harness`).
3. **`shadcn/ui` & State Placement:** Reuse `@/components/ui/*` (`Card`, `Badge`, `Button`, etc.) and `cn()`. Separate `@tanstack/react-query` hooks from presentational props, use selector-scoped `zustand` (`useStore((s) => s.field)`), and wire forms via `zodResolver` on shared `specs/contracts/` schemas without duplicating RHF state in `useState`.
4. **100% Visual Fidelity to `designs/`:** Match layout hierarchy, spacing, tokens, and `loading`/`empty`/`error`/`375px` states from `designs/`. Zero unapproved gradients, animations, or layout inventions.
5. **RED-First RTL & Playwright E2E Coverage:** Write a failing RTL unit test in `apps/web/src/components/__tests__/*.test.tsx` first (`RED -> GREEN`), update/add E2E specs in `apps/e2e/tests/*.spec.ts` for new UI flows, and run `npm run test --workspace=apps/web && npm run typecheck --workspace=apps/web` before finishing.
6. **Structured Return Contract (`FE_SCHEMA` Strict JSON Mode):**
   - When running under `FE_SCHEMA` or any strict JSON caller contract, **omit prose citation blocks** (`### Knowledge Guidance Applied`) so strict JSON output parses cleanly without prose leakage.
   - When API + contract satisfy every field on the Stitch screen:
     `{"status": "READY", "changedFiles": [...], "testsRun": "npm run test --workspace=apps/web && npm run typecheck --workspace=apps/web"}`
   - When an endpoint, status code, or field required by `designs/` is missing or mismatched in `specs/contracts/` or live `apps/api`: STOP integration and return immediately to Tech Lead:
     ```json
     {
       "status": "CONTRACT_MISMATCH",
       "mismatches": [
         {
           "endpoint": "GET /api/projects",
           "expectedByUi": "team_size: number rendered in modal header",
           "actualInContractOrApi": "Property missing from response payload"
         }
       ]
     }
     ```

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "I'll type `team_size?: number`, hide the badge when undefined, and note the gap in my summary" | Shipping partial UI while returning success bypasses the Tech Lead escalation loop. Emit `"status": "CONTRACT_MISMATCH"` immediately. |
| "I know React forms and Context already; no need to run `kb-cli.mjs`" | Unguided runs routinely mirror RHF state in `useState`, pass unmemoized `<Context value={{...}}>`, or drop IME/focus-visible guards. Query `fe-kb` first. |
| "The approved slate header looks plain; a subtle gradient will look nicer" | Aesthetic design was locked at the Human Stitch Gate. FE executes `designs/` faithfully without visual improvisation. |

## Red Flags — STOP Immediately

- Writing `function MyComponent()` instead of `export const MyComponent = () =>`
- Editing React components before watching a failing RTL test (`RED`) in `apps/web/src/components/__tests__/`
- Appending prose (`### Knowledge Guidance Applied`) outside the `FE_SCHEMA` JSON payload in DAG worker mode
- Hardcoding fake fallback copy, duplicating RHF state in `useState`, or touching `apps/api/`, `specs/contracts/`, or `evaluations/`
