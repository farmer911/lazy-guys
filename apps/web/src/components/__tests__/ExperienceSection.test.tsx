import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExperienceSection } from '@/components/ExperienceSection';

describe('ExperienceSection', () => {
  it('formats YYYY-MM-DD dates without timezone month/year drift', () => {
    render(
      <ExperienceSection
        experiences={[
          {
            id: '1',
            company: 'Acme Tech',
            role: 'Senior Full-Stack Engineer',
            location: 'Ho Chi Minh City',
            start_date: '2024-01-01',
            end_date: null,
            is_current: true,
            summary: 'Building resilient apps.',
            highlights: [],
          },
          {
            id: '2',
            company: 'Beta Studio',
            role: 'Frontend Engineer',
            location: 'Remote',
            start_date: '2022-03-01',
            end_date: '2023-12-31',
            is_current: false,
            summary: 'Frontend architecture.',
            highlights: [],
          },
        ]}
      />
    );

    expect(screen.getByText('Jan 2024 — Present')).toBeInTheDocument();
    expect(screen.getByText('Mar 2022 — Dec 2023')).toBeInTheDocument();
  });
});
