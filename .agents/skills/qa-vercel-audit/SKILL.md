---
name: qa-vercel-audit
description: Use when auditing frontend and full-stack features against Vercel Web Design Guidelines, frozen Google Stitch screens, and live runtime endpoints as the Independent QA and Evaluator role. Not for authoring production source code in apps/web or apps/api.
---

# QA Live Audit (`Vercel Web Design Guidelines` + Stitch Ground Truth)

## Overview

Pair with `evaluating-features`, `apps/e2e/AGENTS.md`, and the QA Knowledge Pack (`qa-kb`) to verify completed work from a skeptical, zero-trust white-room context. Passing `tsc` and developer-written smoke tests is the starting line, never the finish line: probe the live app against `designs/screens/*.html`, `specs/prd.md`, and **Vercel Web Design Guidelines**.

## Iron Law

```text
NO PASS VERDICT WITHOUT LIVE ACCESSIBILITY, RESPONSIVE, INTERACTION, AND STITCH FIDELITY CHECKS
```

Never rubber-stamp a git diff under time pressure or fabricate `liveChecks` if a server/browser fails to start. For feature evaluations, every defect below drops the corresponding rubric score below `7` and populates `blockingIssues` in `evaluations/<feat-id>.json` (for standalone `bugfix.py` regressions without a `featureId`, report findings inline without writing `evaluations/`).

## Step 0: Consult `qa-kb` Verification Guides Before Probing

Before writing Playwright audit probes or executing live browser checks, query `.agents/skills/qa-kb/scripts/kb-cli.mjs` for targeted verification patterns:

```sh
node .agents/skills/qa-kb/scripts/kb-cli.mjs search "<2-5 word query>" --dir .agents/skills/qa-kb
node .agents/skills/qa-kb/scripts/kb-cli.mjs retrieve "<id1,id2>" --dir .agents/skills/qa-kb
```

- Run focused searches matching the surface under audit (e.g., `"keyboard focus mobile overflow"`, `"adversarial double submit input"`, `"playwright flaky wait locator"`, `"testing trophy real database"`).
- **Strict JSON Output Hygiene (`QA_EVAL_SCHEMA`):** When dispatched as `[AGENT_ROLE: qa]` or returning structured `QA_EVAL_SCHEMA` / `evaluations/<feat-id>.json` output, return **strict JSON only** and omit `### Knowledge Guidance Applied` prose citations so schema validation never breaks.

## Mandatory Live Audit Checklist (Vercel Web Design Guidelines + Stitch)

1. **Stitch Visual & Live Data Fidelity (`designs/`):**
   - Every section, data field, and token in `designs/screens/*.html` and `designs/design-tokens.json` renders from real PostgreSQL/Express data (`0` hidden sections, `0` hardcoded placeholder strings, `0` happy-path `page.route` stubs).
2. **Programmatic Keyboard & Focus Accessibility (a11y):**
   - Verify real `Tab`/`Shift+Tab` reachability and rendered `:focus-visible` rings; modals trap focus and restore trigger focus on `Escape`; toggle/filter chips update `aria-pressed`; icon-only controls carry `aria-label`; invalid inputs set `aria-invalid="true"` and announce via `role="alert"`.
3. **Adversarial UX & Async Resilience:**
   - Probe rapid double-submit disabling (`1` in-flight mutation max), whitespace-only `"   "` rejection, Vietnamese/CJK IME `isComposing` `Enter` safety, literal `<script>` text escaping, empty-filter reset CTAs, and non-destructive `400`/`500` error recovery that preserves typed form inputs.
4. **Programmatic Viewport Overflow & Error Collectors (`1280x800` & `375x812`):**
   - Assert `document.documentElement.scrollWidth <= window.innerWidth` in code at both `1280x800` and `375x812` (including `500`-char unbroken tokens) and attach `page.on('console')` (`console.error`), `page.on('pageerror')`, and `>= 500` response collectors (`expect(errors).toEqual([])`).

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Developer's unit tests and 2 Playwright tests passed, and release is in 3 minutes" | Self-authored tests skip whitespace-only inputs, missing `:focus-visible` rings, `375px` overflow, and dropped Stitch fields. Run live probes first. |
| "I visually skimmed localhost so I can write '0 console errors and 0 mobile overflow' in `liveChecks`" | Prose claims without `page.on('console')`/`pageerror` listeners and `scrollWidth <= innerWidth` DOM checks miss silent hydration/layout bugs. |
| "Missing focus ring or missing `aria-pressed` is minor polish, I'll still give 8/10 PASS" | Accessibility and interaction hygiene are core Vercel Web Design Guidelines gates; broken keyboard/ARIA states block `PASS`. |

## Red Flags — STOP Immediately

- Issuing `PASS` from static diff reading without booting/probing the live UI and API
- Stubbing `/api/*` via `page.route` on happy-path or client-validation checks instead of hitting live Express + PostgreSQL
- Leaking `### Knowledge Guidance Applied` prose into `QA_EVAL_SCHEMA` JSON responses
- Editing production files in `apps/web/` or `apps/api/` instead of returning `blockingIssues`
