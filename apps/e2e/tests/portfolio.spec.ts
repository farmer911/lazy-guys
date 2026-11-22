import { expect, test } from '@playwright/test';

test('portfolio smoke test: renders core sections for recruiters', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /lazy guy/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /experience/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /tech stack/i })).toBeVisible();
});
