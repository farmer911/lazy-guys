import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Navbar } from '@/components/Navbar';
import { usePortfolioStore } from '@/store/usePortfolioStore';

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    usePortfolioStore.setState({ theme: 'light' });
  });

  it('renders 5 Stitch navigation links, CV PDF link, theme toggle, and mobile drawer', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: 'Case Study' })).toHaveAttribute('href', '/case-study');
    expect(screen.getByRole('link', { name: /experience/i })).toHaveAttribute('href', '/experience');
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');

    const cvLink = screen.getByRole('link', { name: /download cv/i });
    expect(cvLink).toHaveAttribute('href', expect.stringContaining('/cv/pdf'));

    const themeBtn = screen.getByRole('button', { name: /toggle color theme/i });
    await user.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('lg-theme')).toBe('dark');

    await user.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('lg-theme')).toBe('light');

    const menuBtn = screen.getByRole('button', { name: /toggle navigation menu/i });
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    await user.click(menuBtn);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    expect(menuBtn).toHaveFocus();
  });
});
