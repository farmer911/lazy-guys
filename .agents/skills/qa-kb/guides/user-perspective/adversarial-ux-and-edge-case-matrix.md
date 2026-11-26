---
id: "adversarial-ux-and-edge-case-matrix"
title: "Adversarial UX Probes, Double-Submit Races & Destructive Input Matrix"
description: "Break happy-path forms and filters with rapid double-submit races, whitespace-only strings, 500-char unbroken tokens, Vietnamese IME Enter, literal script tags, and input-preserving error states."
tags: ["adversarial", "double", "submit", "input", "whitespace", "overflow", "isComposing", "ime", "xss", "recovery"]
maturity: "stable"
---

# Adversarial UX Probes, Double-Submit Races & Destructive Input Matrix

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Probe mutations with whitespace-only strings, IME `Enter`, literal HTML, and double-submit races

Testing `""` and `"not-an-email"` catches only textbook validation. Every interactive form or mutation endpoint must survive four adversarial user inputs:

```ts
import { expect, test } from '@playwright/test';

test('rejects whitespace-only fields, ignores IME composition Enter, and blocks double-submit', async ({ page }) => {
  await page.goto('/');

  // 1. Whitespace-only input must fail trim validation (never submit blank spaces)
  await page.getByLabel('Name').fill('   ');
  await page.getByLabel('Email').fill('recruiter@acme.dev');
  await page.getByLabel('Message').fill('   \n\t  ');
  await page.getByRole('button', { name: /send message/i }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  // 2. Vietnamese/CJK IME composition Enter (keyCode 229 / isComposing) must NOT prematurely submit
  const messageBox = page.getByLabel('Message');
  await messageBox.fill('Nguyễn Văn Phúc — <script>window.__xss = 1</script>');
  await messageBox.evaluate((el) => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true, keyCode: 229 }));
  });

  // 3. Rapid double-click during slow in-flight POST sends at most 1 mutation
  let postCount = 0;
  await page.route('**/api/contact', async (route) => {
    postCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });

  await page.getByLabel('Name').fill('Nguyễn Văn Phúc');
  const sendBtn = page.getByRole('button', { name: /send message/i });
  await Promise.all([sendBtn.click(), sendBtn.click({ force: true })]);
  await expect(sendBtn).toBeDisabled();
  await expect.poll(() => postCount).toBe(1);
});
```

- **DO** test `"   "` / `"\t\n "` on every required text input and verify both client validation and Express/Zod `.trim().min(1)` reject blank-padded payloads with `400` / `role="alert"`.
- **DO** submit literal `<script>window.__xss = 1</script>` alongside Unicode diacritics (`"Nguyễn Văn Phúc"`) and verify `await page.evaluate(() => Reflect.get(window, '__xss'))` is `undefined` while literal text renders safely.
- **DON'T** assume disabling a button visually prevents double-submit without asserting in-flight request count (`postCount === 1`) when rapid clicks or `Enter` presses fire before React re-renders.

### Rule 2: Verify non-destructive `400`/`500` error recovery & empty-filter reset CTAs

Users abandon forms that wipe their typed message on a transient error or strand them on a zero-result filter view.

```ts
test('empty filter state exposes working one-click reset CTA', async ({ page }) => {
  await page.goto('/');
  const searchInput = page.getByRole('searchbox');
  await searchInput.fill('zz-nonexistent-stack-token-999');

  await expect(page.getByText(/no matching projects/i)).toBeVisible();
  await page.getByRole('button', { name: /clear|reset/i }).click();
  await expect(searchInput).toHaveValue('');
  await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
});
```

- **DO** verify that `400` validation rejections and `500` server errors render a clear `role="alert"` **and** preserve every user-typed input value (`await expect(input).toHaveValue(...)`).
- **DO** trigger zero-match search/tag combinations and click the rendered `"Clear filters"` / `"Reset"` CTA to confirm full list recovery.
- **DON'T** clear form state inside `catch` / `onError` handlers or render dead-end empty states with no recovery action.

### Rule 3: Stress cards, badges, and URLs with 500-character unbroken tokens

- **DO** inject or render a `500`-character unbroken token (`'https://acme.example/' + 'x'.repeat(480)`) and assert at `375x812` mobile viewport that `card.scrollWidth <= card.clientWidth` (`overflow-wrap: anywhere`, `break-words`, or `truncate` with accessible title/link).
- **DON'T** test layout wrapping only with short 3-word English seed titles that never exercise flex/grid `min-w-0` shrinkage.

## When NOT to replace legacy code

- **Keep existing pattern when:** Clearing an input after error is an intentional security requirement on one-time passcodes, passwords, or secret tokens.
