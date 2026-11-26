import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { portfolioApi } from '@/lib/api';

let observerCallback: IntersectionObserverCallback | null = null;
const originalIntersectionObserver = globalThis.IntersectionObserver;

class FakeIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly scrollMargin = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];

  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

const renderApp = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
};

describe('App Lighthouse runtime optimizations', () => {
  beforeEach(() => {
    observerCallback = null;
    globalThis.IntersectionObserver = FakeIntersectionObserver;
    vi.spyOn(portfolioApi, 'recordVisit').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.IntersectionObserver = originalIntersectionObserver;
  });

  it('renders accessible fixed-geometry loading skeletons while portfolio queries are pending', () => {
    vi.spyOn(portfolioApi, 'getProfile').mockReturnValue(new Promise(() => {}));
    vi.spyOn(portfolioApi, 'getExperiences').mockReturnValue(new Promise(() => {}));
    vi.spyOn(portfolioApi, 'getProjects').mockReturnValue(new Promise(() => {}));
    vi.spyOn(portfolioApi, 'getTechStacks').mockReturnValue(new Promise(() => {}));

    renderApp();

    expect(screen.getByLabelText('Loading experience')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByLabelText('Loading projects')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByLabelText('Loading tech stack')).toHaveAttribute('aria-busy', 'true');
  });

  it('defers ContactForm bundle mount until #contact enters near viewport', async () => {
    vi.spyOn(portfolioApi, 'getProfile').mockResolvedValue({
      id: '1',
      full_name: 'Lazy Guy',
      headline: 'Full-Stack Software Engineer',
      bio: 'Clean architecture.',
      location: 'Ho Chi Minh City, Vietnam',
      email: 'hello@lazyguy.dev',
      github_url: 'https://github.com/lazyguy',
      linkedin_url: 'https://linkedin.com/in/lazyguy',
      resume_url: null,
      avatar_url: null,
      achievements: ['Shipped reliable software'],
    });
    vi.spyOn(portfolioApi, 'getExperiences').mockResolvedValue([]);
    vi.spyOn(portfolioApi, 'getProjects').mockResolvedValue([]);
    vi.spyOn(portfolioApi, 'getTechStacks').mockResolvedValue([]);

    renderApp();

    const contactSection = document.getElementById('contact');
    expect(contactSection).not.toBeNull();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true, target: contactSection as Element } as IntersectionObserverEntry],
        new FakeIntersectionObserver(() => {}),
      );
    });

    expect(await screen.findByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });
});
