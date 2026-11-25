---
name: systematic-debugging
description: Use when diagnosing a bug, failing unit or E2E test, build error, or unexpected runtime behavior before proposing fixes. Not for greenfield feature design, pure style refactors, or planned TDD implementation without failures.
---

# Systematic Debugging

```text
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Symptom fixes create cascading regressions. Complete each phase before moving to the next.

## Phase 1: Root Cause Investigation

1. **Read full error output:** Stack traces, compiler codes, line numbers, HTTP status, and SQL errors.
2. **Reproduce deterministically:** Run the narrowest failing command (`npm run test --workspace=apps/api`, `apps/web`, or `npm run test:e2e`) and confirm consistent reproduction.
3. **Check recent changes:** Inspect `git diff` and `git log -5` for config, schema, or contract drift.
4. **Trace boundaries in multi-layer bugs (UI → Express API → PostgreSQL):**
   Log inputs/outputs across each boundary (request payload, SQL query/rows, serialized JSON, React state) once to isolate the exact failing layer before editing.
5. **Backward trace:** Follow bad values up the call stack to their origin (see `root-cause-tracing.md`).

## Phase 2: Pattern Analysis

- Compare the failing path against a working peer in the same workspace (`apps/api/src/` or `apps/web/src/`).
- List every difference in types, serialization (e.g. PostgreSQL `DATE` / `NUMERIC`), async state, or config.

## Phase 3: Single-Hypothesis Verification

- State one explicit hypothesis: *"Root cause is X because Y."*
- Test minimally (one variable at a time). If disproven, revert and form a new hypothesis — never stack speculative patches.
- If uncertain, say `"unverified"` and inspect further instead of guessing.

## Phase 4: TDD Fix & 3-Fix Circuit Breaker

1. **RED:** Write the minimal failing Vitest / RTL / Playwright regression test reproducing the bug (`test-driven-development`).
2. **GREEN:** Apply a single surgical fix at the root cause — no bundled refactors.
3. **Verify:** Run the targeted suite plus `npm run typecheck` and `./init.sh` (fresh after final edit).
4. **3-Fix Architecture Gate:** If **3 fixes fail**, STOP immediately. Do not try Fix #4 — question the underlying architecture with the user.

## Red Flags & Supporting Techniques

See [references/red-flags-and-rationalizations.md](references/red-flags-and-rationalizations.md) for rationalizations, red flags, and defense-in-depth techniques.
