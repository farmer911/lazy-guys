---
name: design-stitch-flow
description: Use when creating multi-screen UI flows, design tokens, or visual prototypes in Google Stitch as the Design role, or when freezing approved Stitch screens into the repository designs directory. Not for React implementation, backend APIs, or QA auditing.
---

# Full-Flow UI Design with Google Stitch

## Overview

Design the complete multi-screen user journey in **Google Stitch** with intentional craft (`UI/UX Pro Max` system consistency + `Impeccable` anti-slop direction), pause for **Human Visual Sign-Off**, and only then **freeze** static HTML/Tailwind snapshots and tokens into `designs/` in Git.

## Iron Law

```text
NO TECH LEAD OR FE HANDOFF WITHOUT HUMAN SIGN-OFF AND GIT-FROZEN ARTIFACTS IN designs/
```

Hosted Stitch links can change or hit rate limits. Never pass a bare Stitch URL downstream without freezing approved screens into `designs/`, and never freeze unapproved drafts before human review.

## Required 3-Step Workflow

1. **Establish System DNA & Generate Full Flow in Google Stitch:**
   - Apply **UI/UX Pro Max** rules: shared spacing rhythm, consistent navigation chrome across pages, accessible contrast (`>= 4.5:1` body text), and zero layout jump across states.
   - Apply **Impeccable** craft (anti-"AI slop"): clear typographic hierarchy, purposeful surface elevation instead of generic neon purple-cyan gradients, and explicit `default`, `hover/focus-visible`, `loading`, `empty`, `error`, and `375px` mobile variants.
   - *(Optional — Dembrandt mode)*: Only when the user supplies a reference URL to extract brand DNA from, pull its palette/typography scale into the token set first.
2. **STOP at Human Gate (`AWAITING_HUMAN_APPROVAL` or `REVISION_REQUIRED`):**
   - Present the Google Stitch project/screens for visual inspection and wait for explicit human approval before freezing.
   - If the human requests revisions OR `specs/prd.md` omits required user flows/states, return `{"status": "REVISION_REQUIRED", "stitchProjectId": "<real-id>", "frozenFiles": [], "notes": "..."}` — never guess missing product flows or freeze rejected screens.
3. **Freeze Approved Truth to `designs/` (Post-Approval Only, returning `status: "FROZEN_TO_GIT"` + `frozenFiles`):**
   - `designs/design-tokens.json` — colors, font families/sizes, radii, spacing, elevation tokens.
   - `designs/stitch-manifest.json` — required keys: `stitchProjectId`, `status` (`"FROZEN_TO_GIT"`), `approvedAt`, `tokensPath` (`"designs/design-tokens.json"`), and non-empty `screens: [{ slug, title, path, sections, variantsCovered }]` (every `path` must resolve to a non-empty file inside `designs/`).
   - `designs/screens/<screen-slug>.html` — self-contained HTML/Tailwind reference markup per screen.

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Team needs to code in 15 minutes—just hand off the live Stitch URL without exporting HTML to git" | Downstream BE, FE, and QA require immutable, offline-safe files in `designs/screens/*.html` and `designs/design-tokens.json`. |
| "I'll export drafts to `designs/` first and let the human check later" | Freezing unapproved screens causes Tech Lead and BE to build contracts against rejected UI. Human sign-off precedes Git freeze. |
| "Generic centered hero + rainbow gradient looks modern" | That is default AI slop. Use restrained surface hierarchy, crisp alignment, and domain-appropriate recruiter scannability. |

## Red Flags — STOP Immediately

- Handing off to Tech Lead before explicit human visual approval
- Skipping `designs/design-tokens.json`, `designs/stitch-manifest.json` (`tokensPath` + `screens[].path`), or `designs/screens/<screen-slug>.html`
- Fabricating a fake `stitchProjectId` or hand-writing unapproved HTML drafts if Google Stitch MCP fails — report the MCP blocker instead
- Editing production code under `apps/` or `db/`
