import { expect, test } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL || 'http://localhost:4000/api';

const ROUTES = [
  '/',
  '/projects',
  '/case-study/lazy-guy-portfolio',
  '/experience',
  '/contact',
] as const;

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
] as const;

test.describe('Electric Cobalt Studio Portfolio E2E', () => {
  const runtimeErrors: string[] = [];

  test.beforeEach(({ page }) => {
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

  test('navigates across 5 Stitch pages and persists segmented Light/Dark theme toggle', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: /lazy guy/i })).toBeVisible();
    await expect(page.getByTestId('hero-telemetry-card')).toBeVisible();
    await expect(page.getByText('Measurable Production Results')).toBeVisible();

    const darkRadio = page.getByRole('radio', { name: /dark mode/i });
    const lightRadio = page.getByRole('radio', { name: /light mode/i });

    await darkRadio.click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(true);

    await page.reload();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(true);

    await lightRadio.click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(false);

    const primaryNav = page.getByRole('navigation', { name: 'Primary' });
    await primaryNav.getByRole('link', { name: 'Projects' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: /selected engineering work/i })
    ).toBeVisible();
    await expect(page.getByTestId('projects-spotlight-card')).toBeVisible();

    await page.getByRole('link', { name: /deep-dive case study/i }).first().click();
    await expect(
      page.getByRole('heading', { name: /technical decisions & trade-offs/i })
    ).toBeVisible();

    await primaryNav.getByRole('link', { name: /experience/i }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: /experience & engineering leadership/i })
    ).toBeVisible();
    await expect(page.getByText('Jan 2024 — Present')).toBeVisible();
    await expect(page.getByTestId('cv-fast-action-card')).toBeVisible();

    await primaryNav.getByRole('link', { name: 'Contact' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: /let's build something resilient/i })
    ).toBeVisible();
    await expect(page.getByTestId('recruiter-footer-cta-banner')).toHaveCount(0);
  });

  test('maintains zero horizontal overflow across all 5 routes at 1280x800, 768x1024, and 375x812 in Light & Dark modes', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await page.addInitScript((selectedTheme) => {
        localStorage.setItem('lg-theme', selectedTheme);
      }, theme);

      for (const vp of VIEWPORTS) {
        await page.setViewportSize(vp);
        for (const route of ROUTES) {
          await page.goto(route);
          await expect(page.locator('h1').first()).toBeVisible();

          const metrics = await page.evaluate(() => ({
            docScrollWidth: document.documentElement.scrollWidth,
            docClientWidth: document.documentElement.clientWidth,
            navScrollWidth: document.querySelector('header nav')?.scrollWidth ?? 0,
            navClientWidth: document.querySelector('header nav')?.clientWidth ?? 0,
          }));

          expect(metrics.docScrollWidth, `${theme} ${vp.width}x${vp.height} ${route}`).toBeLessThanOrEqual(
            metrics.docClientWidth
          );
          expect(metrics.navScrollWidth, `${theme} ${vp.width}x${vp.height} ${route} nav`).toBeLessThanOrEqual(
            metrics.navClientWidth
          );
        }
      }
    }

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const mobileThemeBtn = page.getByRole('button', { name: /toggle color theme/i });
    const themeBox = await mobileThemeBtn.boundingBox();
    expect(themeBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(themeBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const menuBtn = page.getByRole('button', { name: /toggle navigation menu/i });
    const menuBox = await menuBtn.boundingBox();
    expect(menuBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(menuBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('mobile-nav-drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(menuBtn).toBeFocused();
  });

  test('exposes SEO metadata, valid robots.txt, and SVG favicon', async ({ page, request }) => {
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
  });

  test('generates live CV PDF, submits contact with JD link & PDF, and records real daily analytics', async ({
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
    await page.getByLabel(/your full name/i).fill('E2E Recruiter');
    await page.getByLabel(/work email/i).fill('e2e-link@acme.dev');
    await page.getByLabel(/preferred time window/i).fill('Thursday 14:00 ICT');
    await page.getByLabel(/role details/i).fill('Live E2E inquiry with JD URL');

    const jdLinkBtn = page.getByRole('button', { name: /jd link/i });
    await jdLinkBtn.click();
    await expect(jdLinkBtn).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel(/jd url/i).fill('https://boards.greenhouse.io/acme/jobs/101');
    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByRole('status').filter({ hasText: /message sent/i })).toBeVisible();

    await page.getByLabel(/your full name/i).fill('E2E PDF Recruiter');
    await page.getByLabel(/work email/i).fill('e2e-pdf@acme.dev');
    await page.getByLabel(/role details/i).fill('Live E2E inquiry with PDF upload');
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

  test('switches EN <-> VI with reload persistence across 5 routes and zero overflow at 1280/768/375 in Light & Dark', async ({
    page,
  }) => {
    await page.goto('/');

    const langGroup = page.getByRole('radiogroup', { name: /language switcher/i });
    await langGroup.getByRole('radio', { name: /vietnamese/i }).click();

    await expect
      .poll(() =>
        page.evaluate(() => ({
          lang: document.documentElement.lang,
          stored: localStorage.getItem('lg-lang'),
        }))
      )
      .toEqual({ lang: 'vi', stored: 'vi' });

    await expect(page.getByText('Kết quả vận hành đo lường được')).toBeVisible();

    await page.reload();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.lang))
      .toBe('vi');
    await expect(page.getByText('Kết quả vận hành đo lường được')).toBeVisible();

    const primaryNav = page.getByRole('navigation', { name: 'Điều hướng chính' });
    await primaryNav.getByRole('link', { name: 'Dự án' }).click();
    await expect(page.getByText('Kỹ thuật tiêu biểu')).toBeVisible();

    await primaryNav.getByRole('link', { name: 'Case Study' }).click();
    await expect(page.getByText('Mục lục phân tích')).toBeVisible();

    await primaryNav.getByRole('link', { name: 'Hồ sơ & CV' }).click();
    await expect(page.getByText('Thg 1, 2024 — Hiện tại')).toBeVisible();

    await primaryNav.getByRole('link', { name: 'Liên hệ' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Cùng nhau xây dựng những hệ thống bền vững.' })
    ).toBeVisible();

    for (const theme of ['light', 'dark'] as const) {
      await page.addInitScript((selectedTheme) => {
        localStorage.setItem('lg-theme', selectedTheme);
        localStorage.setItem('lg-lang', 'vi');
      }, theme);

      for (const vp of VIEWPORTS) {
        await page.setViewportSize(vp);
        for (const route of ROUTES) {
          await page.goto(route);
          await expect(page.locator('h1').first()).toBeVisible();

          const metrics = await page.evaluate(() => ({
            docScrollWidth: document.documentElement.scrollWidth,
            docClientWidth: document.documentElement.clientWidth,
            navScrollWidth: document.querySelector('header nav')?.scrollWidth ?? 0,
            navClientWidth: document.querySelector('header nav')?.clientWidth ?? 0,
          }));

          expect(
            metrics.docScrollWidth,
            `vi ${theme} ${vp.width}x${vp.height} ${route}`
          ).toBeLessThanOrEqual(metrics.docClientWidth);
          expect(
            metrics.navScrollWidth,
            `vi ${theme} ${vp.width}x${vp.height} ${route} nav`
          ).toBeLessThanOrEqual(metrics.navClientWidth);
        }
      }
    }

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const mobileLangBtn = page.getByTestId('mobile-lang-toggle');
    const langBox = await mobileLangBtn.boundingBox();
    expect(langBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(langBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await mobileLangBtn.click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.lang))
      .toBe('en');
  });
});
