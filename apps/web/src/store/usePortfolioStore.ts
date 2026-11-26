import { create } from 'zustand';

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

interface PortfolioState {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedProjectCategory: string;
  setSelectedProjectCategory: (category: string) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
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
}));
