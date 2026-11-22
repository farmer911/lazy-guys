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

test('mobile 375x812 viewport renders header and content with zero horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await expect(page.getByText('Acme Tech')).toBeVisible();

  const overflow = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    docClientWidth: document.documentElement.clientWidth,
    navScrollWidth: document.querySelector('header nav')?.scrollWidth ?? 0,
    navClientWidth: document.querySelector('header nav')?.clientWidth ?? 0,
  }));

  expect(overflow.docScrollWidth).toBeLessThanOrEqual(overflow.docClientWidth);
  expect(overflow.navScrollWidth).toBeLessThanOrEqual(overflow.navClientWidth);
});
