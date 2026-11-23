# E2E & Live QA Rules — `apps/e2e`

## 1. Locator & Waiting Discipline
- **User-Facing Locators**: Query elements using `page.getByRole`, `page.getByLabel`, and `page.getByText`. Avoid brittle CSS class chains.
- **Condition-Based Waiting**: Rely on Playwright web-first assertions (`await expect(locator).toBeVisible()`). Never use `page.waitForTimeout()`.

## 2. Live Stack & Viewport Coverage
- Run against the real Express + PostgreSQL + Vite stack (configured in `playwright.config.ts`). Never stub `/api/*` in E2E smoke/acceptance specs unless explicitly testing a network failure banner.
- Assert zero horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`) on both Desktop (`1280x800`) and Mobile (`375x812`), plus zero `console.error` or uncaught `pageerror` events.
