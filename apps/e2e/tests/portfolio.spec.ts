import { expect, test } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL || 'http://localhost:4000/api';

test.describe('Electric Cobalt Portfolio E2E', () => {
  const runtimeErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    runtimeErrors.length = 0;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        runtimeErrors.push(`console.error: ${msg.text()}`);
      }
    });
    page.on('pageerror', (err) => {
      runtimeErrors.push(`pageerror: ${err.message}`);
    });
  });

  test.afterEach(() => {
    expect(runtimeErrors).toEqual([]);
  });

  test('navigates across 5 React Router pages and persists Light/Dark theme toggle', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Lazy Guy', exact: true, level: 1 })).toBeVisible();
    await expect(page.getByText('Acme Tech')).toBeVisible();

    const themeBtn = page.getByRole('button', { name: /toggle color theme/i });
    const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await themeBtn.click();
    const isNowDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isNowDark).toBe(!wasDark);

    await page.reload();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(isNowDark);

    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Projects' }).click();
    await expect(page.getByRole('heading', { name: /selected engineering work/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lazy Guy Portfolio Platform' })).toBeVisible();

    await page.getByRole('link', { name: /read case study/i }).first().click();
    await expect(page.getByRole('heading', { name: /technical decisions & trade-offs/i })).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: /experience/i })
      .click();
    await expect(page.getByRole('heading', { name: /experience & engineering leadership/i })).toBeVisible();
    await expect(page.getByText('Jan 2024 — Present')).toBeVisible();

    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Contact' }).click();
    await expect(page.getByRole('heading', { name: /let's build something resilient/i })).toBeVisible();
  });

  test('renders Desktop (1280x800), Tablet (768x1024), and Mobile (375x812) with zero horizontal overflow', async ({
    page,
  }) => {
    for (const vp of [
      { width: 1280, height: 800 },
      { width: 768, height: 1024 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(vp);
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
    }

    await page.setViewportSize({ width: 375, height: 812 });
    const menuBtn = page.getByRole('button', { name: /toggle navigation menu/i });
    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
  });

  test('exposes SEO metadata, valid robots.txt, SVG favicon, and lazy-loaded contact form on scroll', async ({
    page,
    request,
  }) => {
    const robotsResponse = await request.get('/robots.txt');
    expect(robotsResponse.status()).toBe(200);
    expect(robotsResponse.headers()['content-type']).toContain('text/plain');
    expect(await robotsResponse.text()).toContain('User-agent: *');

    const faviconResponse = await request.get('/favicon.svg');
    expect(faviconResponse.status()).toBe(200);
    expect(faviconResponse.headers()['content-type']).toContain('image/svg+xml');

    await page.goto('/');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Full-Stack Software Engineer/i
    );
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(page.getByLabel('Name')).toBeVisible();
  });

  test('generates live CV PDF, submits contact with JD link & PDF, and records daily analytics', async ({
    page,
    request,
  }) => {
    const beforeAnalyticsRes = await request.get(`${API_BASE}/analytics/daily?days=7`);
    expect(beforeAnalyticsRes.status()).toBe(200);
    const beforeAnalytics = (await beforeAnalyticsRes.json()) as {
      data: {
        summary: { todayViews: number; allTimeContactInquiries: number; allTimeCvDownloads: number };
      };
    };

    await page.goto('/experience');
    const cvHref = await page
      .getByRole('link', { name: /download pdf resume/i })
      .getAttribute('href');
    expect(cvHref).toBeTruthy();

    const pdfRes = await request.get(cvHref as string);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()['content-type']).toContain('application/pdf');
    const pdfBytes = await pdfRes.body();
    expect(pdfBytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    await page.goto('/contact');
    await page.getByRole('button', { name: /thursday · 02:00 pm ict/i }).click();
    await page.getByLabel('Name').fill('E2E Recruiter');
    await page.getByLabel('Email').fill('e2e-link@acme.dev');
    await page.getByLabel('Message').fill('Live E2E inquiry with JD URL');
    await page.getByRole('button', { name: /jd link/i }).click();
    await page.getByLabel(/jd url/i).fill('https://boards.greenhouse.io/acme/jobs/101');
    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByRole('status').filter({ hasText: /message sent/i })).toBeVisible();

    await page.getByLabel('Name').fill('E2E PDF Recruiter');
    await page.getByLabel('Email').fill('e2e-pdf@acme.dev');
    await page.getByLabel('Message').fill('Live E2E inquiry with PDF upload');
    await page.getByRole('button', { name: /upload pdf/i }).click();
    await page.getByLabel(/upload jd pdf/i).setInputFiles({
      name: 'e2e-role.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n'),
    });
    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByRole('status').filter({ hasText: /message sent/i })).toBeVisible();

    const afterAnalyticsRes = await request.get(`${API_BASE}/analytics/daily?days=7`);
    expect(afterAnalyticsRes.status()).toBe(200);
    const afterAnalytics = (await afterAnalyticsRes.json()) as {
      data: {
        summary: { todayViews: number; allTimeContactInquiries: number; allTimeCvDownloads: number };
      };
    };

    expect(afterAnalytics.data.summary.todayViews).toBeGreaterThanOrEqual(
      beforeAnalytics.data.summary.todayViews + 2
    );
    expect(afterAnalytics.data.summary.allTimeCvDownloads).toBeGreaterThanOrEqual(
      beforeAnalytics.data.summary.allTimeCvDownloads + 1
    );
    expect(afterAnalytics.data.summary.allTimeContactInquiries).toBeGreaterThanOrEqual(
      beforeAnalytics.data.summary.allTimeContactInquiries + 2
    );
  });
});
