---
name: brainstorming
description: Use when starting an ambiguous new feature, architecture design, or product change whose requirements or trade-offs are not yet settled. Not for clear single-file edits, well-specified tasks with an existing contract, or Role-DAG project_init.py runs.
---

# Brainstorming

Clarify **what** the user wants and **why** before writing code or plans.

## Step 0: Check If Brainstorming Is Needed

- **Already fully specified** (clear scope, zero ambiguity): skip brainstorming and move directly to `task-guardrail` or `writing-plans`.
- **Non-trivial ambiguity exists:** inspect the relevant codebase files first (never ask what existing code already answers), then run the short alignment flow below:
  1. Clarify intent & constraints (one focused question at a time).
  2. Present 2–3 concrete approaches with trade-offs + your recommendation.
  3. Write a concise design doc (short for small changes, full for projects) and get approval.
  4. Hand off to `writing-plans`.

## Alignment Rules

- **Look before asking:** Read referenced files/specs first and summarize what the change touches in plain words.
- **Offer an escape hatch:** If the user didn't explicitly ask to brainstorm, end your first message with a one-line opt-out (*"Or if you'd rather I just dive in with my recommended approach, say so."*).
- **One question per turn:** Ask only when the answer changes what gets built; otherwise state your assumption as a concrete proposal they can correct.
- **Challenge scope (anti-sycophancy):** Flag cheaper paths, YAGNI cuts, or conflicts with existing architecture plainly before designing.
- **Lay out approaches before writing docs:** Drop weak options, compare the remaining 2–3 concretely against this repo's stack (React/Vite/Tailwind/shadcn + Express/PostgreSQL), recommend one, and let the user pick.
- **Show, don't tell:** Use brief text sketches or diagrams when layout, flow, or data shape is easier to see than read.
- **Spikes:** Offer a quick throwaway spike when uncertainty is technical rather than conceptual; bring findings back into the design.

## Sizing the Design Doc

| Size | Design Doc |
|------|------------|
| Small change | Short summary: goal, chosen approach + why others didn't fit, files touched, non-goals |
| Multi-component feature | Full design doc (approaches, contracts, UI states, edge cases, verification plan) |

If scope splits into independent subsystems, agree on order and design one at a time.

## Design Template & Red Flags

See [references/written-design-and-red-flags.md](references/written-design-and-red-flags.md) for the written design structure and red flags (use `design-stitch-flow` for UI mockups).
