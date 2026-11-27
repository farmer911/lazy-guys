import { create } from 'zustand';
import type { Locale } from '@/i18n/translations';

export type ThemeMode = 'light' | 'dark';

const readInitialTheme = (): ThemeMode => {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  return 'light';
};

const syncDomTheme = (theme: ThemeMode) => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('lg-theme', theme);
    } catch {
      // Ignore storage quota / privacy mode restrictions
    }
  }
};

export const readInitialLocale = (): Locale => {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('lg-lang');
      const resolved: Locale = saved === 'vi' ? 'vi' : 'en';
      if (typeof document !== 'undefined') {
        document.documentElement.lang = resolved;
      }
      return resolved;
    } catch {
      // Fall through to document.documentElement.lang when storage is blocked
    }
  }
  if (typeof document !== 'undefined') {
    if (document.documentElement.lang === 'vi') {
      return 'vi';
    }
    document.documentElement.lang = 'en';
  }
  return 'en';
};

const syncDomLocale = (locale: Locale) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('lg-lang', locale);
    } catch {
      // Ignore storage quota / privacy mode restrictions
    }
  }
};

interface PortfolioState {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedProjectCategory: string;
  setSelectedProjectCategory: (category: string) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  selectedCategory: 'All',
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  selectedProjectCategory: 'All',
  setSelectedProjectCategory: (category) => set({ selectedProjectCategory: category }),
  theme: readInitialTheme(),
  setTheme: (theme) => {
    syncDomTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next: ThemeMode = state.theme === 'dark' ? 'light' : 'dark';
      syncDomTheme(next);
      return { theme: next };
    }),
  locale: readInitialLocale(),
  setLocale: (locale) => {
    syncDomLocale(locale);
    set({ locale });
  },
  toggleLocale: () =>
    set((state) => {
      const next: Locale = state.locale === 'en' ? 'vi' : 'en';
      syncDomLocale(next);
      return { locale: next };
    }),
}));
