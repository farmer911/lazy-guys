import { expect, test } from '@playwright/test';

test('portfolio smoke test: renders core sections for recruiters', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Lazy Guy', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Experience', exact: true })).toBeVisible();
  await expect(page.getByText('Acme Tech')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lazy Guy Portfolio Platform', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tech Stack', exact: true })).toBeVisible();
});
