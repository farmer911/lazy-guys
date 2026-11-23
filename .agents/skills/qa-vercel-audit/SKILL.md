---
name: qa-vercel-audit
description: Use when auditing frontend and full-stack features against Vercel Web Design Guidelines, frozen Google Stitch screens, and live runtime endpoints as the Independent QA and Evaluator role.
---

# QA Live Audit (`Vercel Web Design Guidelines` + Stitch Ground Truth)

## Overview

Pair with `evaluating-features` to verify completed work from a skeptical, zero-trust white-room context. Passing `tsc` and developer-written smoke tests is the starting line, never the finish line: probe the live app against `designs/screens/*.html`, `specs/prd.md`, and **Vercel Web Design Guidelines**.

## Iron Law

```text
NO PASS VERDICT WITHOUT LIVE ACCESSIBILITY, RESPONSIVE, INTERACTION, AND STITCH FIDELITY CHECKS
```

Never rubber-stamp a git diff under time pressure. Every defect below drops the corresponding rubric score below `7` and populates `blockingIssues` in `evaluations/<feat-id>.json`.

## Mandatory Live Audit Checklist (Vercel Web Design Guidelines + Stitch)

1. **Stitch Visual & Data Fidelity (`designs/`):**
   - Every section, data field, and token approved in `designs/screens/*.html` and `designs/design-tokens.json` renders from real PostgreSQL/Express data (zero hidden sections or hardcoded placeholder strings).
2. **Keyboard & Focus Accessibility (a11y):**
   - Every interactive control is reachable via `Tab` with a visible `:focus-visible` ring; modals trap focus and close cleanly on `Escape`; toggle/filter buttons expose `aria-pressed`; icon-only links/buttons carry `aria-label`; form inputs bind `<label htmlFor>` and announce errors via `role="alert"`.
3. **Interactive & Async States:**
   - Submit buttons disable and show pending state during flight (preventing double-submit); empty filters and API `400`/`500` responses render clear user recovery states.
4. **Layout, Overflow & Typography (`1280x800` & `375x812`):**
   - Zero horizontal scroll (`scrollWidth <= innerWidth`) at `375px`; long unbroken titles/URLs wrap or truncate cleanly; numeric metrics align cleanly; zero `console.error` or failed network requests.

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Developer's unit tests and 2 Playwright tests passed, and release is in 3 minutes" | Self-authored tests miss missing `aria-pressed`, missing focus rings, `375px` overflow, and silently dropped Stitch fields. Run live probes first. |
| "Missing focus ring or missing `aria-pressed` is minor polish, I'll still give 8/10 PASS" | Accessibility and interaction hygiene are core Vercel Web Design Guidelines gates; broken keyboard/ARIA states block `PASS`. |

## Red Flags — STOP Immediately

- Issuing `PASS` from static diff reading without booting/probing the live UI and API
- Skipping comparison against `designs/screens/*.html` and `specs/prd.md`
- Editing production files in `apps/web/` or `apps/api/` instead of returning `blockingIssues`
