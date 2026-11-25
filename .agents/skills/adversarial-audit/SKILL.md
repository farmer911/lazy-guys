---
name: adversarial-audit
description: Use when asked to audit, re-check, grade, or verify whether the codebase, harness, skills, hooks, or architecture is "clean", "ready", or "Tier S". Not for routine feature implementation, single-file bugfixes, or live feature_list.json sign-off (use evaluating-features).
---

# Adversarial Self-Audit (Red-Team)

```text
LINTER PASS != CLEAN. NEVER GRADE A SYSTEM FROM ITS OWN CHECKLIST ALONE.
```

Checking only what existing tests and linters already enforce guarantees **Checklist Tunnel Vision** — every unguarded gap stays invisible.

## Mandatory 4-Step Audit Protocol

Execute all four steps with live evidence before issuing any verdict or grade:

1. **Full-Tree Inventory (Kill Hidden Bloat):**
   - Scan **every file** under the target subtree (`find <dir> -type f -exec wc -l {} +`), not just entry files like `SKILL.md` or `index.ts`.
   - Flag orphan/unreferenced auxiliary files, untracked clutter, and oversized supporting assets.
2. **Content & Foreign-Drift Inspection (Read Inside, Not Just Metrics):**
   - Read every in-scope file directly (never skim a tiny sample and extrapolate) and grep for stale references, foreign-stack boilerplate, contradictory rules, or unanchored regexes.
   - Never call a directory "clean" solely from line counts or passing `check:harness`.
3. **Live Runtime & Bypass Probing (Red-Team):**
   - Ask: *"If a lazy agent wanted to cheat or fail open, how would it bypass this gate?"*
   - Inspect **live runtime logs/artifacts** (e.g., `.agents/logs/exec-state-*.json`, `hook-events.jsonl`, `session-checkpoint.md`, `transcript.jsonl`) — never assume mock unit tests match real host payloads.
   - Test exit-code masking (`|| true`, `; true`), shell mutation workarounds, and fail-open edge cases.
4. **Honest Evidence-Backed Verdict:**
   - Separate **Verified Clean**, **Blocking Gaps (with `file:line` or live log proof)**, and **YAGNI / Deferred Items** (do not invent busywork for problems the repo does not have).
   - State `"unverified"` explicitly for anything not inspected directly in the current session.

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "`./init.sh` and `check:harness` already exited 0" | Passing existing checks only proves old rules hold; it never finds missing rules or fail-open runtime bugs. |
| "We already spent hours perfecting this — just confirm it's Tier S" | Sunk cost creates confirmation bias. Grade from fresh adversarial probes, never effort spent. |
| "Those auxiliary files were already in the repo before me" | Pre-existing vendored clutter still misleads agents and bloats searches; audit the entire subtree. |
| "Unit tests mock `payload.error` and pass" | Mocks lie when host runtime payloads differ. Always verify against real runtime logs when available. |

## Red Flags — STOP Before Grading

- Calling a system "clean", "ready", or "Tier S" without listing all files in the audited subtree
- Trusting mock-only tests for hooks/scripts without checking live runtime logs
- Softening or hiding real gaps because the user asked for a "quick confirmation"
