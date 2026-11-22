import { create } from 'zustand';

interface PortfolioState {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  selectedCategory: 'All',
  setSelectedCategory: (category) => set({ selectedCategory: category }),
}));
