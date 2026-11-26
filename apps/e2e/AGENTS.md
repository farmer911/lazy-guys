# E2E & Live QA Rules — `apps/e2e`

Consult `.agents/skills/qa-kb/SKILL.md` (`kb-cli.mjs search` / `retrieve`) before authoring complex Playwright flows or live QA audits.

## 1. Anti-Flake Locators & Synchronization
- **User-Facing Locators**: Query via `page.getByRole`, `page.getByLabel`, and `page.getByText`; avoid brittle CSS/DOM chains.
- **Web-First Assertions Only**: Use auto-retrying `await expect(locator).toBeVisible()` / `toBeHidden()` and `page.waitForResponse()`. Never write one-shot `expect(await locator.isVisible())` or hardcoded `page.waitForTimeout()`.

## 2. Live Stack & Fault-Only `page.route`
- Run against the real Vite + Express + PostgreSQL stack (`playwright.config.ts`). Never stub `/api/*` with `page.route` in happy-path or client-validation specs; restrict `page.route` strictly to fault-injecting `500` / network outages that seed data cannot trigger.

## 3. Programmatic Runtime, Viewport & Adversarial Probes
- **Error Collectors**: Wire `page.on('console')` (`console.error`), `page.on('pageerror')`, and unexpected `>= 500` response listeners in `beforeEach`/`afterEach` and assert `expect(errors).toEqual([])`.
- **Responsive Overflow**: Assert `document.documentElement.scrollWidth <= window.innerWidth` in code on both Desktop (`1280x800`) and Mobile (`375x812`).
- **Adversarial UX**: Probe whitespace-only `"   "` strings, `500`-char unbroken token wrapping, rapid double-submit disabling, IME `isComposing` `Enter` guards, and non-destructive `400`/`500` error states that preserve typed user inputs.
