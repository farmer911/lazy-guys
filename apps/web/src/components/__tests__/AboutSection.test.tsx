import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AboutSection } from '../AboutSection';
import type { Profile } from '@/lib/api';

const sampleProfile: Profile = {
  id: '11111111-1111-1111-1111-111111111111',
  full_name: 'Lazy Guy',
  headline: 'Full-Stack Software Engineer',
  bio: 'Building fast, maintainable web applications.',
  location: 'Ho Chi Minh City',
  email: 'hello@lazyguy.dev',
  github_url: 'https://github.com/lazyguy',
  linkedin_url: 'https://linkedin.com/in/lazyguy',
  resume_url: null,
  avatar_url: null,
  achievements: ['Reduced API p95 latency by 45%'],
};

describe('AboutSection', () => {
  it('renders profile name, headline, bio, and achievements', () => {
    render(
      <MemoryRouter>
        <AboutSection profile={sampleProfile} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Lazy Guy' })).toBeInTheDocument();
    expect(screen.getByText('Full-Stack Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Building fast, maintainable web applications.')).toBeInTheDocument();
    expect(screen.getByText('Reduced API p95 latency by 45%')).toBeInTheDocument();
  });
});
