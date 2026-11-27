import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Download, Menu, Moon, Sun, Terminal, X } from 'lucide-react';
import { NavLink } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { useTranslations } from '@/i18n/translations';
import { portfolioApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { usePortfolioStore } from '@/store/usePortfolioStore';

interface NavbarProps {
  readonly fullName?: string;
  readonly availabilityText?: string;
}

const getInitials = (name?: string): string => {
  const parts = (name ?? 'LG')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'LG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const Navbar = ({ fullName, availabilityText }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const theme = usePortfolioStore((state) => state.theme);
  const setTheme = usePortfolioStore((state) => state.setTheme);
  const toggleTheme = usePortfolioStore((state) => state.toggleTheme);
  const locale = usePortfolioStore((state) => state.locale);
  const setLocale = usePortfolioStore((state) => state.setLocale);
  const toggleLocale = usePortfolioStore((state) => state.toggleLocale);
  const t = useTranslations();

  const navItems = [
    { to: '/', label: t.nav.home, end: true },
    { to: '/projects', label: t.nav.projects, end: false },
    { to: '/case-study', label: t.nav.caseStudy, end: false },
    { to: '/experience', label: t.nav.experience, end: false },
    { to: '/contact', label: t.nav.contact, end: false },
  ] as const;

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    cn(
      'focus-ring rounded-full px-2 py-1.5 text-[11px] font-label transition-all whitespace-nowrap lg:px-3.5 lg:text-xs',
      isActive
        ? 'bg-primary text-on-primary font-semibold shadow-sm'
        : 'font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
    );

  return (
    <header className="glass-header no-print">
      <nav
        aria-label={t.nav.primaryAria}
        className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-1.5 px-4 sm:h-16 lg:gap-3 lg:px-12"
      >
        <div className="flex items-center gap-3 shrink-0">
          <NavLink
            to="/"
            className="focus-ring flex items-center gap-2 rounded-lg font-headline text-base font-bold tracking-tight text-on-surface hover:text-primary transition-colors sm:text-lg"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-on-primary shadow-xs">
              <Terminal className="h-4 w-4" />
            </span>
            <span>
              lazy-guy<span className="text-primary">.dev</span>
            </span>
          </NavLink>
          {availabilityText && (
            <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-surface-low px-2.5 py-1 font-label text-[11px] font-medium text-on-surface-variant border border-outline-variant/25">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-ok-dot opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-status-ok-dot" />
              </span>
              <span>{availabilityText}</span>
            </span>
          )}
        </div>

        <div
          data-testid="desktop-nav-pills"
          className="hidden items-center gap-0.5 rounded-full border border-outline-variant/25 bg-surface-low p-1 md:flex lg:gap-1"
        >
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClassName}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 lg:gap-2.5">
          <div
            role="radiogroup"
            aria-label={t.nav.langSwitcherAria}
            className="hidden items-center rounded-full border border-outline-variant/25 bg-surface-low p-1 sm:flex"
          >
            <button
              type="button"
              role="radio"
              aria-checked={locale === 'en'}
              aria-label={t.nav.englishOptionAria}
              onClick={() => setLocale('en')}
              className={cn(
                'focus-ring flex h-7 items-center justify-center rounded-full px-2 font-mono text-[11px] font-bold transition-colors cursor-pointer',
                locale === 'en'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              EN
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={locale === 'vi'}
              aria-label={t.nav.vietnameseOptionAria}
              onClick={() => setLocale('vi')}
              className={cn(
                'focus-ring flex h-7 items-center justify-center rounded-full px-2 font-mono text-[11px] font-bold transition-colors cursor-pointer',
                locale === 'vi'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              VI
            </button>
          </div>

          <Button
            data-testid="mobile-lang-toggle"
            type="button"
            variant="secondary"
            size="icon"
            className="h-11 min-w-11 px-2 sm:hidden font-mono text-xs font-bold"
            aria-label={t.nav.mobileLangToggleAria}
            onClick={toggleLocale}
          >
            {locale === 'en' ? 'VI' : 'EN'}
          </Button>

          <div
            role="radiogroup"
            aria-label={t.nav.themeSwitcherAria}
            className="hidden items-center rounded-full border border-outline-variant/25 bg-surface-low p-1 sm:flex"
          >
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              aria-label={t.nav.lightModeAria}
              onClick={() => setTheme('light')}
              className={cn(
                'focus-ring flex h-7 w-7 items-center justify-center rounded-full transition-colors cursor-pointer',
                theme === 'light'
                  ? 'bg-surface-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              aria-label={t.nav.darkModeAria}
              onClick={() => setTheme('dark')}
              className={cn(
                'focus-ring flex h-7 w-7 items-center justify-center rounded-full transition-colors cursor-pointer',
                theme === 'dark'
                  ? 'bg-surface-high text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Moon className="h-4 w-4" />
            </button>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-11 w-11 sm:hidden"
            aria-label={t.nav.toggleThemeAria}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <a
            href={portfolioApi.getCvPdfUrl()}
            download="lazy-guy-resume.pdf"
            aria-label={t.nav.downloadCvAria}
            className={cn(
              buttonVariants({ size: 'sm' }),
              'hidden sm:inline-flex px-2.5 lg:px-3.5 uppercase tracking-wider text-xs'
            )}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="md:hidden lg:inline">{t.nav.downloadWord}</span>
            <span>CV</span>
          </a>

          <div className="relative hidden shrink-0 items-center lg:flex" aria-hidden="true">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary font-headline text-xs font-bold text-on-primary shadow-xs">
              {getInitials(fullName)}
            </span>
            <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-status-ok-dot ring-2 ring-surface-lowest" />
          </div>

          <Button
            ref={menuButtonRef}
            type="button"
            variant={mobileOpen ? 'secondary' : 'default'}
            size="icon"
            className="h-11 w-11 md:hidden"
            aria-label={t.nav.toggleMenuAria}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {mobileOpen && (
        <div
          data-testid="mobile-nav-drawer"
          className="border-t border-outline-variant/25 bg-surface-lowest px-4 py-4 shadow-md md:hidden"
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'focus-ring flex h-12 items-center justify-between rounded-xl px-3.5 font-label text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 font-bold text-primary'
                      : 'font-medium text-on-surface hover:bg-surface-low'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-2.5">
                      {isActive && <span className="h-5 w-1.5 rounded-full bg-primary" />}
                      <span>{item.label}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-outline" />
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-3 rounded-xl bg-surface-low p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-medium text-on-surface-variant">
                {t.nav.drawerLangLabel}
              </span>
              <div
                role="group"
                aria-label={t.nav.langSwitcherAria}
                className="flex items-center gap-1.5"
              >
                <Button
                  type="button"
                  size="sm"
                  aria-pressed={locale === 'en'}
                  variant={locale === 'en' ? 'default' : 'outline'}
                  onClick={() => setLocale('en')}
                >
                  EN
                </Button>
                <Button
                  type="button"
                  size="sm"
                  aria-pressed={locale === 'vi'}
                  variant={locale === 'vi' ? 'default' : 'outline'}
                  onClick={() => setLocale('vi')}
                >
                  Tiếng Việt
                </Button>
              </div>
            </div>

            <a
              href={portfolioApi.getCvPdfUrl()}
              download="lazy-guy-resume.pdf"
              onClick={() => setMobileOpen(false)}
              className={cn(buttonVariants({ size: 'lg' }), 'w-full justify-center')}
            >
              <Download className="h-4 w-4" />
              <span>{t.nav.downloadCvPdf}</span>
            </a>
            {availabilityText && (
              <p className="flex items-center justify-center gap-2 font-mono text-xs text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-status-ok-dot" />
                <span>{availabilityText}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
