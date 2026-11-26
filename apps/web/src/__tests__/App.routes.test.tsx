import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/App';
import { portfolioApi, type Experience, type Profile, type Project, type TechStack } from '@/lib/api';

const sampleProfile: Profile = {
  id: '1',
  full_name: 'Lazy Guy',
  headline: 'Senior Full-Stack Software Engineer',
  bio: 'Building resilient distributed web apps.',
  location: 'Ho Chi Minh City, Vietnam',
  email: 'hello@lazyguy.dev',
  github_url: 'https://github.com/lazyguy',
  linkedin_url: 'https://linkedin.com/in/lazyguy',
  resume_url: '/api/cv/pdf',
  avatar_url: null,
  achievements: ['Reduced API p95 latency by 45%'],
  availability_text: 'Open to Senior / Staff Roles',
  calendar_url: 'https://cal.com/lazyguy/20min',
  kpi_metrics: [{ label: 'API p95 Latency', value: '-45%', detail: 'PostgreSQL indexing' }],
};

const sampleProjects: Project[] = [
  {
    id: 'p1',
    title: 'Lazy Guy Portfolio Platform',
    slug: 'lazy-guy-portfolio',
    category: 'Full-Stack Web',
    summary: 'Recruiter-focused portfolio.',
    role: 'Sole Author',
    highlights: ['Monorepo with React + Express + PostgreSQL'],
    tech_tags: ['React', 'PostgreSQL'],
    impact_metrics: [{ label: 'Lighthouse', value: '100/100', detail: 'Zero CLS' }],
    case_study: {
      subtitle: 'Zero-build contracts & stateless analytics',
      bottleneck: 'Hydration CLS jumps and timezone-shifted dates.',
      architectureFlow: ['React SPA', 'Zod Contracts', 'Express API', 'PostgreSQL'],
      adrDecisions: [
        {
          title: 'Zero-Build Monorepo Contracts',
          decision: 'Share TypeScript contracts directly.',
          tradeoff: 'Requires NodeNext .js extensions.',
        },
      ],
      benchmarks: [{ metric: 'Desktop Lighthouse', before: '94', after: '100' }],
      nextSteps: 'Add recruiter webhook notifications.',
    },
    repo_url: 'https://github.com/lazyguy/lazy-guy',
    live_url: 'https://lazyguy.dev',
    featured: true,
  },
  {
    id: 'p2',
    title: 'Pulse Metrics Dashboard',
    slug: 'pulse-metrics',
    category: 'Backend & PostgreSQL',
    summary: 'Real-time observability board.',
    role: 'Lead Frontend',
    highlights: ['Keyset cursors'],
    tech_tags: ['PostgreSQL', 'Node.js'],
    repo_url: 'https://github.com/lazyguy/pulse-metrics',
    live_url: null,
    featured: true,
  },
];

const sampleExperiences: Experience[] = [
  {
    id: 'e1',
    company: 'Acme Tech',
    role: 'Senior Full-Stack Engineer',
    location: 'Ho Chi Minh City',
    start_date: '2024-01-01',
    end_date: null,
    is_current: true,
    summary: 'Scalable Node.js services.',
    highlights: ['50k+ DAU'],
    tech_tags: ['TypeScript', 'PostgreSQL'],
  },
];

const sampleStacks: TechStack[] = [
  { id: 's1', name: 'React & TypeScript', category: 'Frontend', proficiency: 95, years_exp: 4 },
  { id: 's2', name: 'PostgreSQL', category: 'Database', proficiency: 85, years_exp: 3.5 },
];

const renderRoute = (initialEntry: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AppRoutes multi-page navigation & views', () => {
  beforeEach(() => {
    vi.spyOn(portfolioApi, 'getProfile').mockResolvedValue(sampleProfile);
    vi.spyOn(portfolioApi, 'getExperiences').mockResolvedValue(sampleExperiences);
    vi.spyOn(portfolioApi, 'getProjects').mockResolvedValue(sampleProjects);
    vi.spyOn(portfolioApi, 'getProjectBySlug').mockResolvedValue(sampleProjects[0]);
    vi.spyOn(portfolioApi, 'getTechStacks').mockResolvedValue(sampleStacks);
    vi.spyOn(portfolioApi, 'recordVisit').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders /projects with category filter chips and aria-pressed state', async () => {
    const user = userEvent.setup();
    renderRoute('/projects');

    expect(await screen.findByText('Lazy Guy Portfolio Platform')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /selected engineering work/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Pulse Metrics Dashboard')).toBeInTheDocument();

    const backendBtn = screen.getByRole('button', { name: /backend & postgresql/i });
    await user.click(backendBtn);

    expect(backendBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Lazy Guy Portfolio Platform')).not.toBeInTheDocument();
    expect(screen.getByText('Pulse Metrics Dashboard')).toBeInTheDocument();
  });

  it('renders /case-study/:slug with 5-chapter ADR architecture deep dive', async () => {
    renderRoute('/case-study/lazy-guy-portfolio');

    expect(await screen.findByText('Zero-Build Monorepo Contracts')).toBeInTheDocument();
    expect(screen.getByText('Desktop Lighthouse')).toBeInTheDocument();
    expect(screen.getByText('Hydration CLS jumps and timezone-shifted dates.')).toBeInTheDocument();
  });

  it('renders Case study not found for unknown /case-study/:slug instead of falling back', async () => {
    vi.spyOn(portfolioApi, 'getProjectBySlug').mockRejectedValueOnce(new Error('404'));
    renderRoute('/case-study/nonexistent-slug-999');

    expect(await screen.findByText(/case study not found/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Lazy Guy Portfolio Platform' })
    ).not.toBeInTheDocument();
  });

  it('renders /experience with PDF Resume download CTA and interactive skillset matrix', async () => {
    renderRoute('/experience');

    expect(await screen.findByText('Jan 2024 — Present')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /experience & engineering leadership/i })).toBeInTheDocument();
    const pdfLink = screen.getByRole('link', { name: /download pdf resume/i });
    expect(pdfLink).toHaveAttribute('href', expect.stringContaining('/cv/pdf'));
  });

  it('renders /contact with availability slots that populate ContactForm', async () => {
    const user = userEvent.setup();
    renderRoute('/contact');

    const slotBtn = await screen.findByRole('button', { name: /thursday · 02:00 pm ict/i });
    expect(slotBtn).toHaveAttribute('aria-pressed', 'false');
    await user.click(slotBtn);
    expect(slotBtn).toHaveAttribute('aria-pressed', 'true');

    expect(screen.getByLabelText(/preferred slot/i)).toHaveValue('Thursday · 02:00 PM ICT (UTC+7)');
  });
});
