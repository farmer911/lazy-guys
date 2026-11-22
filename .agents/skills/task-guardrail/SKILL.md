---
name: task-guardrail
description: Use when executing any coding, bugfix, refactoring, configuration, or multi-step task that touches 2 or more files or verification steps, especially under time pressure or terse prompts where jumping straight into edits risks silent assumptions, skipped checks, or incomplete reporting.
---

# Task Execution Guardrail

## Overview

Decompose work explicitly before touching files, verify every step before advancing, and report changes, omissions, and empirical proof in a fixed contract.

**Violating the letter of this rule is violating the spirit of this rule.** Internal `<thought>` planning is invisible to your human partner and disappears across turns; externalizing a compact brief and output contract costs under 10 lines while catching wrong assumptions before code is written.

## Iron Law

```text
NO MULTI-STEP FILE EDITS WITHOUT A PRE-EDIT BRIEF AND VERIFIED OUTPUT CONTRACT
```

## Activation Predicate

- **Activate when:** The task creates or modifies `>= 2` files OR requires `>= 2` distinct verification steps.
- **Skip when:** The request is read-only analysis, Q&A, diff review, or a `1`-file single-locus tweak. When a full spec plan from `writing-plans` is already active, follow `executing-plans` instead.

## Required 3-Phase Contract

### Phase 1: Pre-Edit Brief (Before First `edit_file` / `write_file`)

Output a compact brief (`<= 10` lines) containing all three mandatory fields (`Goal & Scope`, `Assumptions / Non-Goals`, and `Steps` with `>= 2` entries, each paired with `| Verify:`) **before** your first file edit. Unless two mutually incompatible spec interpretations block safe progress, **do not stall waiting for approval** — emit the brief and execute **only Step 1** in that turn:

```markdown
**Goal & Scope:** Add status filter across `src/routes/orders.ts` and `src/components/OrderList.tsx`.
**Assumptions / Non-Goals:** Exact enum match (`open` | `closed`); URL query sync and multi-select excluded.
**Steps:**
1. RED: Add API + UI filter tests | Verify: `npm run test:unit` fails on new filter assertions
2. GREEN: Implement route query filter + UI filter chips | Verify: `npm run test:unit && npm run typecheck` passes (`0` warnings)
3. GATE: Run full repository verification suite | Verify: `./init.sh && npm run test:e2e` exits `0`
```

### Phase 2: Step-Gated Execution

Execute steps strictly in order:
- For any runtime behavior change, Step 1 **must** be the failing test (`RED`) before any production file edit.
- Never batch file edits from Step `N+1` in the same tool-call turn before Step `N`'s `Verify` command has executed and returned output.
- If a RED test passes immediately or a GREEN/GATE check fails unexpectedly, stop stacking edits and trace root cause first.
- Clean up only imports, variables, or helpers orphaned by your own edits; leave pre-existing dead code untouched.

### Phase 3: Structured Completion Report

End the turn with these three mandatory sections in order:

1. **Changes:** Concise bullet list with clickable `file:line` links naming exact behavior added or changed.
2. **Skipped / Unchanged:** Explicit 1-2 lines naming defaulted boundaries, intentionally excluded scope (with trigger to add later), or unrelated dead code noticed. **Never use this section to skip required repository gates for speed** — an unrun check may appear here only when blocked by an unavailable external service or an explicit user instruction to skip tests.
3. **Empirical Proof:** Verbatim terminal snippet from the final verification gate run **fresh after your very last file edit** (including config, artifact, or documentation updates), showing exit code `0`, pass counts, and `0` warnings.

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "User said 'urgent / no fluff / just do it' — a brief will annoy them" | Ceremony is "Sure, I'd be happy to help!". A compact Pre-Edit Brief emitted without stalling takes ~50 tokens and prevents building the wrong thing fast. |
| "I already decomposed the steps inside `<thought>`" | Hidden thoughts cannot be audited by the user and vanish on context compaction. Write the brief visibly. |
| "I'll collapse everything into `1. Implement & test | Verify: ./init.sh`" | Single-step collapse defeats RED-before-GREEN verification. `Steps` must have `>= 2` step-gated entries. |
| "I'll skip E2E / harness checks for speed and disclose them in `Skipped / Unchanged`" | Disclosing negligence is still negligence. Required project gates must run unless externally blocked or waived by the user. |
| "I ran `./init.sh` before updating `progress.md` / `feature_list.json`, no need to re-run" | Post-gate artifact edits can break JSON schemas or line-count gates. Always run the final gate after your very last file edit. |

## Red Flags — STOP Before Editing

- Calling `edit_file` or `write_file` on a multi-file task with `0` user-facing brief lines emitted first
- Batching Step 1 test edits and Step 2 production edits in the same turn before running Step 1's `Verify` command
- Collapsing `Steps` into 1 mega-step or omitting `Assumptions / Non-Goals`
- Skipping required repo gates for speed or editing artifacts after the final verification run
