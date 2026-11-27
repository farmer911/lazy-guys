# Session Progress Log

## Current State

**Last Updated:** 2026-11-28 01:24
**Active Feature:** `feat-001` — 1-to-1 Electric Cobalt Studio Stitch UI & Zero-Fake Data Fidelity (`ready-for-eval`)
**Approved Design Ground Truth:** Stitch `Portfolio Demo 01 — Electric Cobalt Studio` (`projects/15082605221977705976`, 35 screens)

## Status

### What's Done

- [x] **Exact Stitch Tokens & Typography (`designs/design-tokens.json`, `apps/web/index.html`, `apps/web/src/index.css`):** Applied Stitch Light (`#f8f5ff` surface, `#ffffff` surface-lowest, `#f1efff` surface-low, `#e7e6ff` surface-container, `#282b51` on-surface, `#555881` on-surface-variant, `#0050d4` primary) and Dark (`#0b1120` 24px blueprint grid, `#111827` / `#1e293b`, `#3b82f6` primary) palettes with `Space Grotesk`, `Inter`, `Public Sans`, and `JetBrains Mono`.
- [x] **Zero-Fake Data Cleanup (`db/seed.sql`, `apps/web/src/App.tsx`, `ContactPage.tsx`, `ContactForm.tsx`):** Removed fake seeded `analytics_daily_metrics` rows in `db/seed.sql`, removed hardcoded `fallbackProfile` in `App.tsx` (replaced with loading skeletons & recoverable Retry error card), removed hardcoded fake meeting slots and salary brackets.
- [x] **1-to-1 Stitch Shell & 5 Pages (`apps/web/src/components/*`):**
  - `Navbar`: Pill nav bar (`desktop-nav-pills`), segmented Light/Dark `radiogroup` toggle, compact `CV` tablet adaptation (0 overflow at `768px`), `44x44px` mobile touch targets, `48px` mobile drawer rows with `Escape` focus restoration.
  - `HomePage` & `AboutSection`: 7/5 Hero + Mac-window `engineer_profile.ts` Telemetry Card (real DB counts), `Measurable Production Results` Bento KPI strip, and `Featured Architecture Showcases` (without duplicating Experience/TechStack/ContactForm).
  - `ProjectsPage`: Header stats, mobile scroll `FilterChipRail` with edge fade, 7/5 `Flagship Spotlight Card`, remaining 2-col grid, and 4-card `Strict Engineering Standards`.
  - `CaseStudyPage`: Sticky breadcrumb, KPI Bento cards, sticky `Case Outline` + `Project Spec`, equal-width 4-stage responsive pipeline (`STAGE 01..04`), ADRs, 4-col benchmarks table (`VERIFIED`), and Next Case Study card.
  - `ExperienceCvPage`: 7/5 Hero + `Curriculum Vitae (PDF)` Fast-Action card, 7/5 Timeline (left accent bar, UTC-safe dates) + `Skillset Matrix`, and 3-col Engineering Philosophy.
  - `ContactPage` & `ContactForm`: 3-col real Info Bar, Calendar link (only if present in DB), `Direct Verified Channels`, semantic `<details>` FAQ accordion, Zod v4 + RHF form with IME `Enter` guard, drag-and-drop `%PDF-` dropzone (accepting empty MIME when `%PDF-` matches), and duplicate Footer CTA omitted on `/contact`.
- [x] **Verified via RTL + Responsive E2E + Live Screenshots:** `11/11` RTL unit tests, `4/4` Playwright E2E tests (0 horizontal overflow on all 5 routes across `375x812`, `768x1024`, `1280x800` in Light & Dark modes, `>= 44x44px` mobile buttons), and 7 full-page `preview:web` screenshots visually inspected.
- [x] **Zero-Dep Static UI Internationalization (`EN` / `VI`) Across All 5 Routes (`apps/web/src/i18n/translations.ts`, `usePortfolioStore.ts`, `index.html`, 15 UI components):**
  - Added compile-time-enforced `en`/`vi` dictionary (`typeof en`), `localStorage['lg-lang']` + `<html lang>` pre-paint & live sync, desktop `radiogroup` (`EN`/`VI`) + `44x44px` mobile quick toggle + `aria-pressed` drawer switcher in `Navbar`, UTC-safe `formatExperienceDate` (`Thg 1, 2024 — Hiện tại`), and reactive Zod v4 validation alert translation in `ContactForm` (preserving `specs/contracts/portfolio.ts` and dynamic DB records).
  - Passed independent `Senior i18n Code Reviewer` pass (fixed all 3 Important findings via RED -> GREEN TDD) with `15/15` Web RTL tests and `5/5` Playwright E2E specs (`0` overflow across `1280x800`, `768x1024`, `375x812` in Light & Dark for both `en` and `vi`).

### What's Next

1. Dispatch an Independent Evaluator subagent against committed `HEAD` to evaluate `feat-001` and write `evaluations/feat-001.json` (or refine any real portfolio copy/data the user supplies next).

## Blockers / Risks

- Note: If Docker PostgreSQL already held prior `analytics_daily_metrics` rows from earlier sessions, `db/seed.sql` no longer inserts them on fresh DBs, while existing local volumes keep prior rows until truncated/recreated.
