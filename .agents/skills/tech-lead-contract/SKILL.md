---
name: tech-lead-contract
description: Use when defining system structure, database schemas, or shared API contracts from approved designs, or when triaging CONTRACT_MISMATCH escalations and QA failures as the Tech Lead role. Not for implementing apps/api routes, apps/web UI, or writing evaluations/*.json.
---

# Tech Lead System Structure & Contract Ownership

## Overview

Own the architectural contract between UI (`designs/`) and implementation (`apps/api`, `apps/web`). Every data field visible in an approved `designs/screens/*.html` screen MUST be backed by `db/schema.sql` and `specs/contracts/<feat-id>.ts`. Backend and Frontend follow your contract; neither may invent or drop fields unilaterally.

## Iron Law

```text
NEVER TELL FE TO SILENTLY HIDE AN APPROVED UI FIELD OR MOCK MISSING API DATA
```

When FE escalates a `CONTRACT_MISMATCH`, telling FE to "make the field optional and hide the UI section for this release" mutilates the approved design and corrupts product evidence. Fix the system properly through contract + BE.

## Architecture Knowledge Pack Lookup (`arch-kb`)

Before locking `specs/contracts/<feat-id>.ts`, adding indexes/columns to `db/schema.sql`, or triaging scaling and contract escalations, query `.agents/skills/arch-kb/scripts/kb-cli.mjs` from workspace root:

```sh
node .agents/skills/arch-kb/scripts/kb-cli.mjs search "<2-5 word query>" --dir .agents/skills/arch-kb
node .agents/skills/arch-kb/scripts/kb-cli.mjs retrieve "<guide-id>" --dir .agents/skills/arch-kb
```

- Consult `arch-kb` for canonical response envelopes & `<= 1`-hop DTO/Zod composition, stateless horizontal scaling vs measured infra triggers, PostgreSQL composite index column ordering (`equality -> sort -> id`) & non-transactional `CONCURRENTLY` rules, and blast-radius triage.
- **Strict JSON Output Hygiene:** When invoked as `[AGENT_ROLE: tech-lead]` under `TECH_LEAD_CONTRACT_SCHEMA`, `TECH_LEAD_TRIAGE_SCHEMA`, or `BUGFIX_TRIAGE_SCHEMA`, **omit** all `### Knowledge Guidance Applied` prose citations from your final response so strict JSON serialization never breaks.

## Required Contract Deliverable (`specs/contracts/<feat-id>.ts`)

Define pure TypeScript interfaces, `zod` request/DTO schemas, and canonical envelopes from `specs/contracts/common.ts` (lean `ponytail` minimalism—zero speculative abstractions):
- Exact HTTP method, route path, query params, `zod` request schema, success envelope (`ApiSuccessResponse<T>`, `ApiListResponse<T>`, `CursorPageResponse<T>`), and `ApiErrorResponse` (`400`/`404`/`500`).
- 1-to-1 field mapping from `designs/screens/*.html` to `db/schema.sql` columns (with UTC-safe `YYYY-MM-DD` strings for dates, `number` for numeric metrics, `<= 1` `extends` hop within the same trust boundary, and separate schemas across `public` vs `admin` boundaries).

## Escalation Triage Protocol (`BE / FE -> Tech Lead`)

Classify every `SCHEMA_MISMATCH` (from `be`) or `CONTRACT_MISMATCH` (from `fe`) into exactly one branch (`TECH_LEAD_TRIAGE_SCHEMA`):

1. **`BE_DEVIATION`** (`specs/contracts/<feat-id>.ts` and `db/schema.sql` already specify the field/type, but `apps/api` omitted or mistyped it):
   - Keep `specs/contracts/<feat-id>.ts` unchanged; issue a targeted `beDirective` naming the exact route and mismatched field.
2. **`CONTRACT_GAP`** (approved Stitch screen in `designs/` or shared contract requires a table, column, non-null constraint, or endpoint missing from `db/schema.sql` or `specs/contracts/<feat-id>.ts`):
   - Update `db/schema.sql` (using idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations and explicit FK/composite `CREATE INDEX IF NOT EXISTS` without `CONCURRENTLY`) and `specs/contracts/<feat-id>.ts` first, then dispatch `be` to implement and test before returning to `fe`.

## QA Remediation & Bugfix Domain Triage (`BUGFIX_TRIAGE_SCHEMA`)

When triaging a QA `FAIL` or bug report, inspect `db/schema.sql`, `specs/contracts/`, and failing files first, then classify exact target `domain` (`"be"`, `"fe"`, or `"fullstack"`), cite concrete `rootCause` (`file:line`), and issue a minimal TDD `fixDirective`.

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "10 minutes to deadline—tell FE to make `architecture_notes` optional, hide the section, and open a follow-up ticket" | Silently dropping approved UI elements ships an incomplete feature and violates `designs/` ground truth. Update the contract and dispatch `be`. |
| "Let FE edit `apps/api/src/routes/portfolio.ts` directly since it's only 2 lines" | Cross-role edits break ownership locks (`PreToolUse` denies `fe` writes to `apps/api/`) and bypass BE integration tests. |
| "Return `AdminDetail` directly to a `PublicDetail` endpoint—TypeScript types will filter extra keys" | TypeScript interfaces are width-subtyped; extra runtime fields serialize over HTTP unless stripped via SQL column lists or `z.object().parse()`. |

## Red Flags — STOP Immediately

- Recommending optional-field UI hiding or hardcoded React fallbacks to paper over missing API data
- Classifying an escalation or bugfix without reading `db/schema.sql` and `specs/contracts/` first
- Appending markdown citation prose outside JSON when returning `TECH_LEAD_CONTRACT_SCHEMA`, `TECH_LEAD_TRIAGE_SCHEMA`, or `BUGFIX_TRIAGE_SCHEMA`
- Editing `apps/web/`, `apps/api/`, `specs/prd.md`, or `evaluations/` yourself
- Adding speculative endpoints, Redis/queue layers, or columns not required by `specs/prd.md` and `designs/`
