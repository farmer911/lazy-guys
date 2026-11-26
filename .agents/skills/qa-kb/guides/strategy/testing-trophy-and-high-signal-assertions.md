---
id: "testing-trophy-and-high-signal-assertions"
title: "Testing Trophy Allocation, Real Database Integration & High-Signal Assertions"
description: "Prioritize real PostgreSQL API integration and live-stack Playwright journeys, restrict page.route to fault injection, and ban mock-echo or source-text grep tests."
tags: ["testing", "trophy", "real", "database", "postgresql", "integration", "assertions", "page.route", "fault-injection"]
maturity: "stable"
---

# Testing Trophy Allocation, Real Database Integration & High-Signal Assertions

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Allocate coverage across real boundaries (Testing Trophy)

Put the bulk of verification in **integration** tests against real PostgreSQL and rendered component trees rather than isolated mocks:
1. **API + Database Integration (`apps/api`):** Invoke real Express routers with `supertest` against a real test PostgreSQL schema/seed; assert HTTP status, response shape, and persisted SQL rows (`SELECT ...`).
2. **Stateful UI Integration (`apps/web`):** Drive real React components with `@testing-library/user-event` and assert accessible DOM transitions (`role="alert"`, `aria-pressed`, disabled states) without mocking child components.
3. **Critical End-to-End Journeys (`apps/e2e`):** Run Playwright against the live Vite + Express + PostgreSQL `webServer` stack (`localhost:5173` -> `localhost:4000`).

```ts
import { expect, test } from '@playwright/test';

test('client validation blocks malformed email without mutating live API', async ({ page }) => {
  const contactPosts: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/contact')) {
      contactPosts.push(req.url());
    }
  });

  await page.goto('/');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByRole('button', { name: /send message/i }).click();

  // Settle on the rendered validation barrier FIRST before checking network count
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
  expect(contactPosts).toEqual([]);
});
```

- **DO** observe real requests passively via `page.on('request', ...)` and await the settled validation DOM barrier (`await expect(page.getByRole('alert')).toBeVisible()`) before asserting `expect(contactPosts).toEqual([])`.
- **DON'T** intercept `/api/*` with `page.route(...)` during happy-path or validation specs, and never assert `expect(apiCalled).toBe(false)` synchronously before async form validation settles.

### Rule 2: Use `page.route` strictly for fault injection that seed data cannot trigger

Stub network traffic in Playwright **only** when simulating server crashes (`500`/`503`), aborted sockets, or artificial latency to verify error-recovery UI.

```ts
test('renders non-destructive retry banner when POST /api/contact returns 500', async ({ page }) => {
  await page.route('**/api/contact', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Database unavailable' }),
    })
  );

  await page.goto('/');
  await page.getByLabel('Name').fill('Linh Tran');
  await page.getByLabel('Email').fill('linh@example.com');
  await page.getByLabel('Message').fill('Interested in staff backend role.');
  await page.getByRole('button', { name: /send message/i }).click();

  await expect(page.getByRole('alert')).toContainText(/unavailable|try again/i);
  await expect(page.getByLabel('Message')).toHaveValue('Interested in staff backend role.');
});
```

- **DO** keep fault-injection routes scoped to the exact failing test and verify both the error alert and preserved user input.
- **DON'T** stub `200 OK` API payloads in E2E tests — fake JSON masks real SQL column renames, CORS bugs, and Zod contract drift between `apps/web` and `apps/api`.

### Rule 3: Write hand-derived behavioral assertions (zero mock-echo or source greps)

- **DO** assert concrete, hand-computed expected values (`expect(res.body.projects.map((p) => p.slug)).toEqual(['lazy-guy-platform'])`) rather than recomputing production formulas inside the test.
- **DON'T** write tautological mock-echo tests (`mockPool.query.mockResolvedValue(...)` followed by asserting that exact mock value) or product tests that `fs.readFileSync` `.tsx`/`.ts` files to regex-grep class names instead of rendering behavior.

## When NOT to replace legacy code

- **Keep existing pattern when:** `page.route` stubs an external third-party SaaS webhook, OAuth provider, or rate-limited CDN outside the local Docker stack, or injects `500` / `route.abort('failed')` faults to verify graceful degradation.
