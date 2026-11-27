# Static UI Internationalization (`EN` / `VI`) — Written Design

## 1. Intent & Why

Enable recruiters and hiring managers in Vietnam and globally to switch all static UI chrome across the 5-route Electric Cobalt Studio portfolio between **English (`en`, default)** and **Vietnamese (`vi`)** instantaneously, with persistent preference (`localStorage`), accessible ARIA semantics, `<html lang>` synchronization, UTC-safe localized date formatting, and zero third-party bundle bloat.

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- Support two locales: `'en'` (default) and `'vi'`, persisted under `localStorage['lg-lang']` and synced to `document.documentElement.lang` (both in `apps/web/index.html` pre-paint script and live on toggle).
- Translate 100% of static UI text, aria-labels, empty/loading/error states, `STANDARDS`, `PHILOSOPHY`, `FAQ_ITEMS`, UTC calendar date ranges (`Present` / `Hiện tại`), and `ContactForm` client/validation/status messages across all 5 routes (`/`, `/projects`, `/case-study/:slug?`, `/experience`, `/contact`) plus `Navbar`, `RecruiterFooterCta`, and `ErrorFallback`.
- Expose an accessible Language Switcher in `Navbar`:
  - Desktop/Tablet (`>= 640px`, `sm:flex`): segmented `radiogroup` (`aria-label` localized, `EN` / `VI` radios with `aria-checked`).
  - Mobile (`< 640px`, `375x812`): `44x44px` (`h-11 min-w-11`) quick-toggle button in the top bar **plus** a full segmented `EN` / `Tiếng Việt` control inside `mobile-nav-drawer`.
- Maintain `0` horizontal overflow (`scrollWidth <= clientWidth` for both `documentElement` and `header nav`) at `1280x800`, `768x1024`, and `375x812` in both `en` and `vi` and both `light` and `dark` themes.

### Non-Goals
- Translating PostgreSQL-stored candidate records (`profiles`, `experiences`, `projects`, `case_study` JSONB, `tech_stacks`, and `/api/cv/pdf` generated resume content) — dynamic DB fields continue rendering verbatim from Express/PostgreSQL.
- Modifying `db/schema.sql`, `db/seed.sql`, `apps/api/**`, or `specs/contracts/portfolio.ts` validation logic.
- URL-prefixed locale routing (`/vi/projects`) or browser `Accept-Language` auto-redirect that would break deterministic `'en'` default assertions in existing E2E/RTL suites.

### Anti-Goals
- Adding `i18next`, `react-i18next`, `react-intl`, or runtime JSON HTTP fetchers (adds ~20–28 kB gzip, async FOUC/CLS risk, and loses compile-time TypeScript key checking).

## 3. Constraints

- **Code Hygiene & Harness Rules (`apps/web/AGENTS.md`):** 100% arrow functions in `apps/web/src/**/*.{ts,tsx}`, strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, zero `any`, zero `@ts-ignore`), selector-scoped `zustand` reads (`usePortfolioStore((s) => s.locale)`), and zero `useEffect` derived-state sync.
- **Filter Value Stability:** Category filter state in `usePortfolioStore` (`selectedCategory`, `selectedProjectCategory`) keeps canonical `'All'` as its internal `value` while rendering localized `label` (`'All'` / `'Tất cả'`, `'All Projects'` / `'Tất cả dự án'`) so switching locales mid-filter never orphans active selections.
- **Navbar Width Budget at `768x1024` (`md`) & `375x812`:** Concise Vietnamese nav pill labels (`Trang chủ`, `Dự án`, `Case Study`, `Hồ sơ & CV`, `Liên hệ`) and compact pill/button spacing so `header nav` never overflows `768px` or `375px`.
- **Zod v4 Validation Localization Without Contract Drift:** `ContactSubmissionSchema` in `specs/contracts/portfolio.ts` remains the single source of truth; `ContactForm.tsx` maps known contract validation messages (`'Name is required'`, `'Email is required'`, `'Valid email is required'`, `'Message is required'`, `'JD URL must start with http:// or https://'`, `'Valid JD URL is required'`, `'Provide either a JD link or a PDF file, not both'`) through the active dictionary at render time so switching `EN <-> VI` immediately updates visible field alerts.

## 4. Approaches Considered & Chosen

| Approach | Bundle Cost | Type Safety | Verdict |
| :--- | :--- | :--- | :--- |
| **A. Zero-Dep Typed TS Dictionary + Zustand `locale` Slice (Chosen)** | `~2.5 kB` gzip, `0` new npm packages | 100% compile-time structural parity (`satisfies TranslationDictionary` on `vi` against `en` schema) | **Chosen** — matches existing `theme` pattern in `usePortfolioStore.ts`, zero FOUC/CLS, instant reactive updates. |
| **B. React Context `<I18nProvider>` Wrapper** | `~2.5 kB` gzip | 100% compile-time | Rejected — introduces a parallel state provider alongside `usePortfolioStore` and requires wrapping every isolated component unit test (`Navbar.test.tsx`, `ContactForm.test.tsx`) in an extra provider. |
| **C. `i18next` + `react-i18next`** | `+24 kB` gzip, external dep | String-keyed unless heavy declaration merging | Rejected — YAGNI bloat that degrades initial JS budget and Lighthouse Mobile score. |

## 5. Architecture & Files Touched

1. **`apps/web/index.html`:** Extend pre-paint IIFE to read `localStorage.getItem('lg-lang')` and set `document.documentElement.lang = savedLang === 'vi' ? 'vi' : 'en'`.
2. **`apps/web/src/i18n/translations.ts` (New):** Define `export type Locale = 'en' | 'vi'`, canonical `en` dictionary object, `export type Translations = typeof en`, and `vi: Translations` (compiler-enforced 1:1 key & formatter parity across `nav`, `common`, `home`, `about`, `projects`, `caseStudy`, `experience`, `techStack`, `contactPage`, `contactForm`, `footer`, `errors`). Export helper `useTranslations = () => translations[usePortfolioStore((s) => s.locale)]` plus `formatExperienceDate(isoOrDate, locale, presentLabel)` using UTC `Intl.DateTimeFormat`.
3. **`apps/web/src/store/usePortfolioStore.ts`:** Add `locale: Locale`, `setLocale: (locale: Locale) => void`, and `toggleLocale: () => void` mirroring `theme` (`readInitialLocale` from `localStorage['lg-lang']` / `document.documentElement.lang`, defaulting strictly to `'en'`; `syncDomLocale` updating `document.documentElement.lang` and `localStorage['lg-lang']`).
4. **UI Components Updated (`apps/web/src/`):**
   - `App.tsx` (`RouteSkeleton` aria-label, profile load error alert & `Retry` button)
   - `components/Navbar.tsx` (5 nav links, desktop `Language Switcher` radiogroup, mobile `44x44` quick toggle + mobile drawer language switcher, CV download labels, theme/menu `aria-label`s; fallback `availabilityText` only when DB prop is unset)
   - `components/AboutSection.tsx` (CTA buttons, `CORE STACK` badge, telemetry card labels `Projects`/`Roles`/`Skills`, `TypeScript Clean Contract`, `Zod v4 Verified`, `Experience & CV →`, fallback `'Open to Opportunities'` / `'Remote'`)
   - `components/HomePage.tsx` (KPI & Achievements headers, Featured Architecture header, `View All {n} Projects`, loading/empty labels, card CTAs `Read Deep-Dive Case Study`, `Live Demo`, `Source`)
   - `components/ProjectsPage.tsx`, `components/ProjectsSection.tsx`, `components/ProjectBentoCard.tsx` (catalog hero, `Shipped`/`Domains` counters, `All Projects` filter label, `Showing X of Y`, spotlight labels, `02 // Additional Builds`, `HOW WORK IS VERIFIED` + 4 `STANDARDS` items, empty filter reset button)
   - `components/CaseStudyPage.tsx` (breadcrumbs, loading/404 card, `Live System`/`Repository`/`Print Brief`, `Case Outline` + 5 chapter links/eyebrows/titles, `PROJECT SPEC` labels, `Trade-off:`, benchmark table headers + `VERIFIED` badge, handover CTA + `NEXT ARCHITECTURAL CASE STUDY`)
   - `components/ExperienceCvPage.tsx`, `components/ExperienceSection.tsx`, `components/TechStackSection.tsx` (hero badges/stats, CV fast-action card + copy/print buttons & clipboard status, section `01`/`02`/`03` headers, 3 `PHILOSOPHY` cards, UTC date range & `Present` badge, `All` chip label, `{n} Yrs` unit, empty/loading states)
   - `components/ContactPage.tsx`, `components/ContactForm.tsx` (hero & status cards, calendar card, `Direct Verified Channels` + copy status, `Fast Recruiter FAQ` + 2 `FAQ_ITEMS`, all form labels/placeholders, 3 `ENGAGEMENT_OPTIONS`, JD attachment mode buttons/dropzone/errors, localized Zod error message mapping, submit button states, success/error alerts, privacy footer note)
   - `components/RecruiterFooterCta.tsx`, `components/ErrorFallback.tsx` (fast-track banner heading/CTAs/copy state, footer contact link, error boundary title & `Try again` button)
5. **Automated Tests (`RED -> GREEN`):**
   - `apps/web/src/components/__tests__/Navbar.test.tsx`: Test `EN`/`VI` radiogroup + mobile toggle, `localStorage['lg-lang']` persistence, `document.documentElement.lang` sync, and translated nav links.
   - `apps/web/src/components/__tests__/ContactForm.test.tsx`: Test localized Vietnamese labels & Zod validation alerts when `locale === 'vi'`, plus live alert updates on `EN <-> VI` switch.
   - `apps/web/src/__tests__/App.routes.test.tsx`: Test switching to `'vi'` translates route headings, `STANDARDS`/`PHILOSOPHY`/`FAQ`, and UTC experience dates (`Hiện tại`) while preserving DB strings.
   - `apps/e2e/tests/portfolio.spec.ts`: Verify live `EN -> VI -> reload -> EN` persistence across routes AND extend the `1280x800` / `768x1024` / `375x812` zero-overflow matrix to cover `'vi'` alongside `'en'`.

## 6. Settled vs Builder Decisions

- **Settled (Locked with User):**
  - UI-only translation across all 5 pages; dynamic PostgreSQL records remain untouched.
  - Supported locales: `'en'` (default) and `'vi'`.
  - Zero external i18n dependencies (`zustand` + typed TS dictionary).
- **Left to Builder:**
  - Exact idiomatic Vietnamese phrasing for technical engineering headings (keeping universally standard English terms like `Case Study`, `CV`, `PDF`, `GitHub`, `LinkedIn`, `PostgreSQL`, `Zod v4`, `ADR` natural for Vietnamese tech recruiters).
  - Exact responsive Tailwind padding tweaks on `Navbar` pills (`px-2 lg:px-3`) if needed to keep `768px` headroom comfortable in `'vi'`.
