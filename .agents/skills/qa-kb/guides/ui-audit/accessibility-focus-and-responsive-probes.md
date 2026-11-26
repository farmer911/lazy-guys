---
id: "accessibility-focus-and-responsive-probes"
title: "Keyboard Focus Traps, ARIA States & Mobile Overflow DOM Probes"
description: "Assert live keyboard Tab reachability, visible focus-visible rings, modal Escape focus restoration, ARIA state toggles, and 1280x800 + 375x812 scrollWidth <= innerWidth in Playwright code."
tags: ["keyboard", "focus", "focus-visible", "focus-trap", "mobile", "overflow", "scrollWidth", "innerWidth", "aria-pressed", "responsive"]
maturity: "stable"
---

# Keyboard Focus Traps, ARIA States & Mobile Overflow DOM Probes

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Assert `scrollWidth <= innerWidth` programmatically on Desktop (`1280x800`) & Mobile (`375x812`)

Prose audit bullets claiming *"verified 375px mobile without overflow"* without DOM assertions miss sticky header bleed, unwrapped pills, and off-canvas horizontal scrollbars.

```ts
import { expect, type Page, test } from '@playwright/test';

const assertZeroHorizontalOverflow = async (page: Page) => {
  const metrics = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    headerScrollWidth: document.querySelector('header')?.scrollWidth ?? 0,
    headerClientWidth: document.querySelector('header')?.clientWidth ?? 0,
  }));
  expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.headerScrollWidth).toBeLessThanOrEqual(metrics.headerClientWidth);
};

test('desktop 1280x800 and mobile 375x812 render hydrated content with zero horizontal overflow', async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await assertZeroHorizontalOverflow(page);
  }
});
```

- **DO** await hydrated data visibility (`await expect(heading).toBeVisible()`) **before** evaluating `document.documentElement.scrollWidth <= window.innerWidth` at both `1280x800` and `375x812`.
- **DON'T** measure `scrollWidth` immediately after `page.goto()` while loading skeletons are still on screen, and never substitute prose claims for executable viewport assertions.

### Rule 2: Drive real `Tab` / `Shift+Tab` traversal to verify `:focus-visible` rings & ARIA states

Calling `element.focus()` via JS does not reliably activate browser `:focus-visible` heuristics. Use `page.keyboard.press('Tab')` to prove real keyboard reachability, visible focus styling, and stateful ARIA attributes.

```ts
test('interactive filter chips expose keyboard focus ring and aria-pressed state', async ({ page }) => {
  await page.goto('/');
  const chip = page.getByRole('button', { name: 'TypeScript' });

  await chip.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(chip).toBeFocused();

  const focusIndicator = await chip.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      matchesFocusVisible: el.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  expect(focusIndicator.matchesFocusVisible).toBe(true);
  expect(
    (focusIndicator.outlineStyle !== 'none' && focusIndicator.outlineWidth !== '0px') ||
      focusIndicator.boxShadow !== 'none'
  ).toBe(true);

  await page.keyboard.press('Space');
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
});
```

- **DO** verify `:focus-visible` produces a rendered outline or `box-shadow` ring, toggle/filter controls flip `aria-pressed`, icon-only links/buttons expose `aria-label`, and invalid inputs bind `<label htmlFor>` + `aria-invalid="true"` + `role="alert"`.
- **DON'T** pass keyboard audits when `focus:outline-none` strips outlines with zero `:focus-visible` ring replacement or when interactive cards use `<div onClick>` unreachable via `Tab`.

### Rule 3: Verify modal/drawer focus containment & `Escape` trigger restoration

- **DO** open dialogs via keyboard (`Enter`), press `Tab` past the last focusable control inside the dialog to confirm focus wraps back to the first dialog control (never escaping to `document.body` background links), press `Escape`, and assert `await expect(dialog).toBeHidden()` + `await expect(triggerBtn).toBeFocused()`.
- **DON'T** only click modal close icons with the mouse without verifying `Escape` dismissal and focus return to the opener button.

## When NOT to replace legacy code

- **Keep existing pattern when:** An inner container such as a wide `<pre>` code block, data table wrapper, or horizontal chip rail intentionally sets `overflow-x-auto` (`el.scrollWidth > el.clientWidth`), provided `document.documentElement.scrollWidth <= window.innerWidth` still holds at the page root.
