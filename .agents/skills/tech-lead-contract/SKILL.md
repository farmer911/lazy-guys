---
name: tech-lead-contract
description: Use when defining system structure, database schemas, or shared API contracts from approved designs, or when triaging CONTRACT_MISMATCH escalations and QA failures as the Tech Lead role.
---

# Tech Lead System Structure & Contract Ownership

## Overview

Own the architectural contract between UI (`designs/`) and implementation (`apps/api`, `apps/web`). Every data field visible in an approved `designs/screens/*.html` screen MUST be backed by `db/schema.sql` and `specs/contracts/<feat-id>.ts`. Backend and Frontend follow your contract; neither may invent or drop fields unilaterally.

## Iron Law

```text
NEVER TELL FE TO SILENTLY HIDE AN APPROVED UI FIELD OR MOCK MISSING API DATA
```

When FE escalates a `CONTRACT_MISMATCH`, telling FE to "make the field optional and hide the UI section for this release" mutilates the approved design and corrupts product evidence. Fix the system properly through contract + BE.

## Required Contract Deliverable (`specs/contracts/<feat-id>.ts`)

Define pure TypeScript interfaces and endpoint constants (lean `ponytail` minimalism—zero speculative abstractions):
- Exact HTTP method, route path, query params, request body, success payload, and `400`/`404` error shape.
- 1-to-1 field mapping from `designs/screens/*.html` to `db/schema.sql` columns (with UTC-safe `YYYY-MM-DD` strings for dates and `number` for numeric metrics).

## Escalation Triage Protocol (`FE -> Tech Lead`)

Classify every `CONTRACT_MISMATCH` into exactly one branch:

1. **`BE_DEVIATION`** (`specs/contracts/<feat-id>.ts` already specifies the field/type, but `apps/api` omitted or mistyped it):
   - Keep `specs/contracts/<feat-id>.ts` unchanged; issue a targeted fix directive to `be` naming the exact route and mismatched field.
2. **`CONTRACT_GAP`** (approved Stitch screen in `designs/` requires a field missing from `specs/contracts/<feat-id>.ts` or `db/schema.sql`):
   - Update `db/schema.sql` and `specs/contracts/<feat-id>.ts` first, then dispatch `be` to implement and test before returning to `fe`.

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "10 minutes to deadline—tell FE to make `architecture_notes` optional, hide the section, and open a follow-up ticket" | Silently dropping approved UI elements ships an incomplete feature and violates `designs/` ground truth. Update the contract and dispatch `be`. |
| "Let FE edit `apps/api/src/routes/portfolio.ts` directly since it's only 2 lines" | Cross-role edits break ownership locks (`PreToolUse` denies `fe` writes to `apps/api/`) and bypass BE integration tests. |

## Red Flags — STOP Immediately

- Recommending optional-field UI hiding or hardcoded React fallbacks to paper over missing API data
- Writing UI component logic inside `apps/web/src/components/` yourself
- Adding speculative endpoints or columns not required by `specs/prd.md` and `designs/`
