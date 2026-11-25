---
name: self-evolve
description: Use when turning a user correction, reviewer finding, escaped bug, or harness bypass into a permanent mechanical guard (Rule-to-Script Promotion) so the mistake cannot recur. Not for routine feature implementation, first-pass debugging, or speculative refactors without an observed failure.
---

# Self-Evolution & Rule-to-Script Promotion

```text
PROSE RULES CAN BE FORGOTTEN; EXIT CODE 1 IN A SCRIPT CANNOT.
```

Every repeated bug, user correction, or reviewer-caught bypass must leave the repository's mechanical defenses stronger than before — without bloating context.

## Mandatory 5-Step Promotion Loop

1. **Where (Exact Locus):** Pinpoint exact `file:line`, hook event, or workflow boundary where the failure occurred.
2. **Root Cause (Mechanism):** Explain *why* existing checks missed it (e.g., regex matched inside quotes, mock hid live host payload behavior, missing negative boundary).
3. **Minimal Fix (TDD + Negative Control):** Write a failing regression test reproducing the exact failure (`RED`) **plus** a negative-control test proving legitimate commands/inputs are NOT falsely blocked, apply the smallest fix (`GREEN`), and verify zero warnings.
4. **Rule-to-Script Promotion (Choose Highest-Leverage Guard):**
   - **Static / structural invariant** (orphans, frontmatter, forbidden patterns, schema/config drift) → encode in `scripts/check-harness.mjs` + `scripts/check-harness.test.mjs`.
   - **Runtime tool-call / bypass invariant** (shell workarounds, exit-code masking, role isolation) → encode in `scripts/agent-hooks.mjs` + `scripts/agent-hooks.test.mjs`.
   - **Judgment-only discipline** (cannot be checked mechanically) → add 1–3 crisp lines to the narrowest existing skill or `AGENTS.md` (never create a new skill when a 2-line script check suffices).
5. **Verify & Summarize:** Run `./init.sh` fresh after the final edit and report: `Where → Root Cause → Minimal Fix → Automated Guard → Proof`.

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "I fixed the instance, no need to add a guard" | Fixing only the symptom guarantees the same mistake returns in a future session. |
| "I'll just add a bold reminder to `AGENTS.md`" | Promote to `check-harness.mjs` or `agent-hooks.mjs` first whenever mechanically checkable. |
| "Let's create a new skill for every lesson" | New skills increase routing noise; prefer script guards or surgical edits to existing skills. |

## Red Flags — STOP Immediately

- Fixing a recurring harness/hook bug without adding a failing regression test and automated script guard
- Adding prose reminders in `AGENTS.md` when a mechanical exit-code-1 check in `scripts/check-harness.mjs` or `scripts/agent-hooks.mjs` can block the failure
- Claiming a guard is active without running `./init.sh` fresh after the final edit
