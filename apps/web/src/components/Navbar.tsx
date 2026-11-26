import { useState } from 'react';
import { Download, Menu, Moon, Sun, Terminal, X } from 'lucide-react';
import { NavLink } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { portfolioApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { usePortfolioStore } from '@/store/usePortfolioStore';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/projects', label: 'Projects', end: false },
  { to: '/case-study', label: 'Case Study', end: false },
  { to: '/experience', label: 'Experience & CV', end: false },
  { to: '/contact', label: 'Contact', end: false },
] as const;

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = usePortfolioStore((state) => state.theme);
  const toggleTheme = usePortfolioStore((state) => state.toggleTheme);

  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    cn(
      'focus-ring rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
      isActive
        ? 'bg-cobalt-tint text-cobalt'
        : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
    );

  return (
    <header className="glass-header no-print">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8"
      >
        <NavLink
          to="/"
          className="focus-ring flex items-center gap-2 rounded-lg font-mono text-sm font-semibold text-ink"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-cobalt text-white">
            <Terminal className="h-4 w-4" />
          </span>
          <span>lazy-guy.dev</span>
        </NavLink>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClassName}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Toggle color theme"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <a
            href={portfolioApi.getCvPdfUrl()}
            download="lazy-guy-resume.pdf"
            className={cn(buttonVariants({ size: 'sm' }), 'hidden sm:inline-flex')}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download CV</span>
          </a>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-subtle bg-surface px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'focus-ring rounded-xl px-3 py-2.5 text-sm font-medium',
                    isActive
                      ? 'bg-cobalt-tint text-cobalt'
                      : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href={portfolioApi.getCvPdfUrl()}
              download="lazy-guy-resume.pdf"
              onClick={() => setMobileOpen(false)}
              className={cn(buttonVariants({ size: 'lg' }), 'mt-2 w-full justify-center')}
            >
              <Download className="h-4 w-4" />
              <span>Download CV (PDF)</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
