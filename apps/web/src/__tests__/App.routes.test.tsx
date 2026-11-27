import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/App';
import { portfolioApi, type Experience, type Profile, type Project, type TechStack } from '@/lib/api';
import { usePortfolioStore } from '@/store/usePortfolioStore';

const sampleProfile: Profile = {
  id: '1',
  full_name: 'Lazy Guy',
  headline: 'Full-Stack Software Engineer — React, TypeScript, Node.js & PostgreSQL',
  bio: 'Product-minded engineer focused on clean architecture and reliable testing.',
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

describe('AppRoutes (1-to-1 Stitch Pages & Zero-Fake Loading/Error Boundaries)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
    usePortfolioStore.setState({
      locale: 'en',
      selectedCategory: 'All',
      selectedProjectCategory: 'All',
    });
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

  it('renders loading skeletons without fake fallbackProfile while profile query is pending', () => {
    vi.spyOn(portfolioApi, 'getProfile').mockReturnValue(new Promise(() => {}));
    renderRoute('/');

    expect(screen.getByLabelText(/loading portfolio/i)).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading', { name: 'Lazy Guy' })).not.toBeInTheDocument();
  });

  it('renders recoverable error UI with Retry button when profile fails to load', async () => {
    const user = userEvent.setup();
    const getProfileSpy = vi
      .spyOn(portfolioApi, 'getProfile')
      .mockRejectedValueOnce(new Error('API offline'))
      .mockResolvedValueOnce(sampleProfile);

    renderRoute('/');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/unable to load portfolio/i);
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByRole('heading', { level: 1, name: /lazy guy/i })).toBeInTheDocument();
    expect(getProfileSpy).toHaveBeenCalledTimes(2);
  });

  it('renders Stitch Home (/) with 2-col Hero + Telemetry Card + Impact Bento + Featured Projects without duplicating Experience/TechStack/ContactForm', async () => {
    renderRoute('/');

    expect(await screen.findByRole('heading', { level: 1, name: /lazy guy/i })).toBeInTheDocument();
    expect(screen.getByTestId('hero-telemetry-card')).toBeInTheDocument();
    expect(screen.getByText('Measurable Production Results')).toBeInTheDocument();
    expect(screen.getByText('Lazy Guy Portfolio Platform')).toBeInTheDocument();

    expect(screen.queryByRole('heading', { name: /roles & production impact/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /skillset matrix/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send message/i })).not.toBeInTheDocument();
  });

  it('renders /projects with Spotlight card, category filter chips (aria-pressed), and remaining project grid', async () => {
    const user = userEvent.setup();
    renderRoute('/projects');

    expect(
      await screen.findByRole('heading', { level: 1, name: /selected engineering work/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('projects-spotlight-card')).toBeInTheDocument();
    expect(screen.getByText('Lazy Guy Portfolio Platform')).toBeInTheDocument();
    expect(screen.getByText('Pulse Metrics Dashboard')).toBeInTheDocument();

    const backendBtn = screen.getByRole('button', { name: /backend & postgresql/i });
    await user.click(backendBtn);

    expect(backendBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Lazy Guy Portfolio Platform')).not.toBeInTheDocument();
    expect(screen.getByText('Pulse Metrics Dashboard')).toBeInTheDocument();
  });

  it('renders /case-study/:slug with 5-chapter ADR deep dive and handles unknown slug 404 cleanly', async () => {
    renderRoute('/case-study/lazy-guy-portfolio');

    expect(await screen.findByText('Zero-Build Monorepo Contracts')).toBeInTheDocument();
    expect(screen.getByText('Desktop Lighthouse')).toBeInTheDocument();
    expect(screen.getByText('Hydration CLS jumps and timezone-shifted dates.')).toBeInTheDocument();
    expect(screen.getByTestId('case-study-outline')).toBeInTheDocument();

    vi.spyOn(portfolioApi, 'getProjectBySlug').mockRejectedValueOnce(new Error('404'));
    renderRoute('/case-study/nonexistent-slug-999');
    expect(await screen.findByText(/case study not found/i)).toBeInTheDocument();
  });

  it('renders /experience with CV Fast-Action card, UTC-safe timeline, and Skillset Matrix filter', async () => {
    const user = userEvent.setup();
    renderRoute('/experience');

    expect(
      await screen.findByRole('heading', { level: 1, name: /experience & engineering leadership/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Jan 2024 — Present')).toBeInTheDocument();
    expect(screen.getByTestId('cv-fast-action-card')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /download pdf resume/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/cv/pdf')
    );

    const skillsetCard = screen.getByTestId('skillset-matrix-card');
    await user.click(within(skillsetCard).getByRole('button', { name: /^database$/i }));
    expect(within(skillsetCard).getByText('PostgreSQL')).toBeInTheDocument();
    expect(within(skillsetCard).queryByText('React & TypeScript')).not.toBeInTheDocument();
  });

  it('renders /contact with Direct Verified Channels, <details> FAQ accordion, ContactForm, and omits duplicate Footer CTA banner', async () => {
    renderRoute('/contact');

    expect(
      await screen.findByRole('heading', { level: 1, name: /let's build something resilient/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('direct-verified-channels')).toBeInTheDocument();
    expect(screen.getByTestId('contact-faq-accordion')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    expect(screen.queryByTestId('recruiter-footer-cta-banner')).not.toBeInTheDocument();
  });

  it('localizes Home, Projects (preserving canonical All filter across locale toggle), Case Study, Footer CTA, and Error UI into Vietnamese while keeping DB records verbatim', async () => {
    const user = userEvent.setup();
    usePortfolioStore.getState().setLocale('vi');

    vi.spyOn(portfolioApi, 'getProfile').mockRejectedValueOnce(new Error('offline'));
    const firstRender = renderRoute('/');
    expect(await screen.findByText('Không thể tải hồ sơ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    firstRender.unmount();

    vi.spyOn(portfolioApi, 'getProfile').mockResolvedValue(sampleProfile);
    const homeRender = renderRoute('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Lazy Guy' })).toBeInTheDocument();
    expect(screen.getByText('Kết quả vận hành đo lường được')).toBeInTheDocument();
    expect(screen.getByText('Kiến trúc hệ thống tiêu biểu')).toBeInTheDocument();
    expect(screen.getByText('Xem dự án tiêu biểu')).toBeInTheDocument();
    expect(screen.getByText('LỐI TẮT CHO NHÀ TUYỂN DỤNG')).toBeInTheDocument();
    expect(screen.getByText('Lazy Guy Portfolio Platform')).toBeInTheDocument();
    homeRender.unmount();

    const projectsRender = renderRoute('/projects');
    expect(await screen.findByText('Kỹ thuật tiêu biểu')).toBeInTheDocument();
    expect(screen.getByText('ƯU TIÊN QUAN SÁT HỆ THỐNG')).toBeInTheDocument();
    const allChipVi = screen.getByRole('button', { name: /tất cả dự án/i });
    expect(allChipVi).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      usePortfolioStore.getState().setLocale('en');
    });
    expect(await screen.findByRole('button', { name: /all projects/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    act(() => {
      usePortfolioStore.getState().setLocale('vi');
    });
    expect(await screen.findByRole('button', { name: /tất cả dự án/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await user.click(screen.getByRole('button', { name: /backend & postgresql/i }));
    expect(screen.getByText('Pulse Metrics Dashboard')).toBeInTheDocument();
    projectsRender.unmount();

    const csRender = renderRoute('/case-study/lazy-guy-portfolio');
    expect(await screen.findByText('Zero-Build Monorepo Contracts')).toBeInTheDocument();
    expect(screen.getByText('Mục lục phân tích')).toBeInTheDocument();
    expect(screen.getByText('01. Điểm nghẽn')).toBeInTheDocument();
    expect(screen.getByText('Quyết định kỹ thuật & Sự đánh đổi')).toBeInTheDocument();
    expect(screen.getByText('Đánh đổi:')).toBeInTheDocument();
    expect(screen.getByText('ĐÃ KIỂM CHỨNG')).toBeInTheDocument();
    csRender.unmount();

    vi.spyOn(portfolioApi, 'getProjectBySlug').mockRejectedValueOnce(new Error('404'));
    renderRoute('/case-study/nonexistent-slug-999');
    expect(await screen.findByText('Không tìm thấy bài phân tích dự án.')).toBeInTheDocument();
  });

  it('localizes /experience (UTC-safe Vietnamese dates, Philosophy, Tech Stack All chip) and /contact (FAQ & channels) into Vietnamese', async () => {
    usePortfolioStore.getState().setLocale('vi');

    const expRender = renderRoute('/experience');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kinh nghiệm & Dẫn dắt Kỹ thuật' })
    ).toBeInTheDocument();
    expect(screen.getByText('Thg 1, 2024 — Hiện tại')).toBeInTheDocument();
    expect(screen.getByText('Không dùng Test giả lập')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tải cv bản pdf/i })).toBeInTheDocument();
    const skillsetCard = screen.getByTestId('skillset-matrix-card');
    expect(within(skillsetCard).getByRole('button', { name: /tất cả/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expRender.unmount();

    renderRoute('/contact');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Cùng nhau xây dựng những hệ thống bền vững.',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Kênh liên hệ xác thực')).toBeInTheDocument();
    expect(screen.getByText('Câu hỏi thường gặp (FAQ)')).toBeInTheDocument();
    expect(
      screen.getByText('Tôi có thể đính kèm link JD hoặc file PDF trực tiếp không?')
    ).toBeInTheDocument();
  });
});
