import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Navbar } from '@/components/Navbar';
import { readInitialLocale, usePortfolioStore } from '@/store/usePortfolioStore';

describe('Navbar (Stitch 1-to-1 Pill Bar, Segmented Theme Toggle & Mobile Drawer)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.lang = 'en';
    usePortfolioStore.setState({ theme: 'light', locale: 'en' });
  });

  it('renders 5 Stitch links inside pill nav, Download CV link, segmented Light/Dark toggle, and 44px mobile drawer with Escape focus restore', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar fullName="Lazy Guy" availabilityText="Open to Senior / Staff Roles" />
      </MemoryRouter>
    );

    const primaryNav = screen.getByRole('navigation', { name: 'Primary' });
    const pillList = within(primaryNav).getByTestId('desktop-nav-pills');
    expect(pillList.className).toMatch(/rounded-full/);

    expect(within(pillList).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(pillList).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
    expect(within(pillList).getByRole('link', { name: 'Case Study' })).toHaveAttribute('href', '/case-study');
    expect(within(pillList).getByRole('link', { name: /experience/i })).toHaveAttribute('href', '/experience');
    expect(within(pillList).getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');

    const cvLink = screen.getByRole('link', { name: /download cv/i });
    expect(cvLink).toHaveAttribute('href', expect.stringContaining('/cv/pdf'));

    const themeGroup = screen.getByRole('radiogroup', { name: /theme switcher/i });
    const lightBtn = within(themeGroup).getByRole('radio', { name: /light mode/i });
    const darkBtn = within(themeGroup).getByRole('radio', { name: /dark mode/i });

    expect(lightBtn).toHaveAttribute('aria-checked', 'true');
    await user.click(darkBtn);
    expect(darkBtn).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('lg-theme')).toBe('dark');

    await user.click(lightBtn);
    expect(lightBtn).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('lg-theme')).toBe('light');

    const mobileThemeBtn = screen.getByRole('button', { name: /toggle color theme/i });
    expect(mobileThemeBtn.className).toMatch(/\bh-11\b/);
    expect(mobileThemeBtn.className).toMatch(/\bw-11\b/);

    const menuBtn = screen.getByRole('button', { name: /toggle navigation menu/i });
    expect(menuBtn.className).toMatch(/\bh-11\b/);
    expect(menuBtn.className).toMatch(/\bw-11\b/);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuBtn);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    expect(menuBtn).toHaveFocus();
  });

  it('switches EN <-> VI via desktop radiogroup, 44px mobile button, and drawer, persisting lg-lang and falling back to en on invalid storage', async () => {
    localStorage.setItem('lg-lang', 'vi');
    expect(readInitialLocale()).toBe('vi');
    expect(document.documentElement.lang).toBe('vi');

    localStorage.setItem('lg-lang', 'fr');
    expect(readInitialLocale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');

    document.documentElement.lang = 'vi';
    localStorage.setItem('lg-lang', '');
    expect(readInitialLocale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    localStorage.clear();

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar fullName="Lazy Guy" availabilityText="Open to Senior / Staff Roles" />
      </MemoryRouter>
    );

    const langGroup = screen.getByRole('radiogroup', { name: /language switcher|chuyển ngôn ngữ/i });
    const enRadio = within(langGroup).getByRole('radio', { name: /english/i });
    const viRadio = within(langGroup).getByRole('radio', { name: /tiếng việt|vietnamese/i });

    expect(enRadio).toHaveAttribute('aria-checked', 'true');
    await user.click(viRadio);

    expect(viRadio).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('lg-lang')).toBe('vi');
    expect(document.documentElement.lang).toBe('vi');
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();

    const pillList = screen.getByTestId('desktop-nav-pills');
    expect(within(pillList).getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/');
    expect(within(pillList).getByRole('link', { name: 'Dự án' })).toHaveAttribute('href', '/projects');
    expect(within(pillList).getByRole('link', { name: 'Case Study' })).toHaveAttribute('href', '/case-study');
    expect(within(pillList).getByRole('link', { name: 'Hồ sơ & CV' })).toHaveAttribute('href', '/experience');
    expect(within(pillList).getByRole('link', { name: 'Liên hệ' })).toHaveAttribute('href', '/contact');

    const mobileLangBtn = screen.getByTestId('mobile-lang-toggle');
    expect(mobileLangBtn.className).toMatch(/\bh-11\b/);
    expect(mobileLangBtn.className).toMatch(/\bmin-w-11\b|\bw-11\b/);

    await user.click(mobileLangBtn);
    expect(localStorage.getItem('lg-lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(within(pillList).getByRole('link', { name: 'Home' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    const drawer = screen.getByTestId('mobile-nav-drawer');
    const drawerLangGroup = within(drawer).getByRole('group', { name: /language switcher/i });
    const drawerEnBtn = within(drawerLangGroup).getByRole('button', { name: 'EN' });
    const drawerViBtn = within(drawerLangGroup).getByRole('button', { name: 'Tiếng Việt' });
    expect(drawerEnBtn).toHaveAttribute('aria-pressed', 'true');
    expect(drawerViBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(drawerViBtn);
    expect(drawerViBtn).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('lg-lang')).toBe('vi');
  });
});
