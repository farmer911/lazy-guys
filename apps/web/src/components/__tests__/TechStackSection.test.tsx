import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { TechStackSection } from '../TechStackSection';
import type { TechStack } from '@/lib/api';
import { usePortfolioStore } from '@/store/usePortfolioStore';

const sampleStacks: TechStack[] = [
  { id: '1', name: 'React & TypeScript', category: 'Frontend', proficiency: 95, years_exp: 4 },
  { id: '2', name: 'PostgreSQL', category: 'Database', proficiency: 85, years_exp: 3.5 },
];

describe('TechStackSection', () => {
  beforeEach(() => {
    usePortfolioStore.setState({ selectedCategory: 'All' });
  });

  it('filters tech stacks by selected category', async () => {
    const user = userEvent.setup();
    render(<TechStackSection techStacks={sampleStacks} />);

    expect(screen.getByText('React & TypeScript')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Database' }));

    expect(screen.queryByText('React & TypeScript')).not.toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  });
});
