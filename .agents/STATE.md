# Active Task State

## Goal
Implement static `EN` (default) / `VI` UI internationalization across all 5 portfolio routes (`specs/plans/2026-11-28-ui-i18n-en-vi.md`) with zero external dependencies, `localStorage['lg-lang']` + `<html lang>` sync, accessible Desktop/Mobile `Navbar` switchers, UTC-safe localized dates, and localized Zod v4 form errors.

## Checklist
- [x] Task 1: Typed `EN`/`VI` Dictionary, Store `locale` Slice, Pre-Paint `<html lang>` & `Navbar` Switcher
- [x] Task 2: Home, Projects, Case Study, Footer CTA & Error Boundaries Localization
- [x] Task 3: Experience/CV, Tech Stack & Contact Page + Localized Zod v4 Validation Alerts
- [x] Task 4: Playwright E2E Locale Persistence & Multi-Viewport Zero-Overflow Matrix
- [x] Final Review & Gate: Independent static diff review + fresh synchronous verification suite (`0` errors, `0` warnings)
