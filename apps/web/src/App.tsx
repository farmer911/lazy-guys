import { Suspense, lazy, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { HomePage } from '@/components/HomePage';
import { Navbar } from '@/components/Navbar';
import { RecruiterFooterCta } from '@/components/RecruiterFooterCta';
import { Skeleton } from '@/components/ui/skeleton';
import {
  portfolioApi,
  type Experience,
  type Profile,
  type Project,
  type TechStack,
} from '@/lib/api';

const LazyProjectsPage = lazy(() =>
  import('@/components/ProjectsPage').then((mod) => ({ default: mod.ProjectsPage }))
);
const LazyCaseStudyPage = lazy(() =>
  import('@/components/CaseStudyPage').then((mod) => ({ default: mod.CaseStudyPage }))
);
const LazyExperienceCvPage = lazy(() =>
  import('@/components/ExperienceCvPage').then((mod) => ({ default: mod.ExperienceCvPage }))
);
const LazyContactPage = lazy(() =>
  import('@/components/ContactPage').then((mod) => ({ default: mod.ContactPage }))
);

const RouteSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading page">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

const fallbackProfile: Profile = {
  id: 'fallback',
  full_name: 'Lazy Guy',
  headline: 'Full-Stack Software Engineer — React, TypeScript, Node.js & PostgreSQL',
  bio: 'Product-minded engineer focused on clean architecture, fast UX, and reliable automated testing.',
  location: 'Ho Chi Minh City, Vietnam',
  email: 'hello@lazyguy.dev',
  github_url: 'https://github.com/lazyguy',
  linkedin_url: 'https://linkedin.com/in/lazyguy',
  resume_url: '/api/cv/pdf',
  avatar_url: null,
  achievements: [
    'Reduced API p95 latency by 45% via PostgreSQL indexing and query tuning',
    'Led migration to TypeScript monorepo with 90%+ E2E critical-path coverage',
    'Built internal design system adopted across 4 product squads',
  ],
  availability_text: 'Open to Senior / Staff Roles',
  calendar_url: 'https://cal.com/lazyguy/20min',
  kpi_metrics: [
    {
      label: 'API p95 Latency',
      value: '-45%',
      detail: 'PostgreSQL composite B-tree indexing & CTE batching',
    },
    {
      label: 'E2E Critical Coverage',
      value: '94%',
      detail: 'Playwright Chromium + real PostgreSQL CI gates',
    },
    {
      label: 'Lighthouse Production',
      value: '100/100',
      detail: 'Zero-CLS skeletons & lazy-split route chunks',
    },
  ],
};

export const AppRoutes = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo(0, 0);
    }
    void portfolioApi.recordVisit(location.pathname || '/');
  }, [location.pathname]);

  const { data: profile } = useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: portfolioApi.getProfile,
    retry: false,
  });

  const { data: experiences = [], isPending: isExperiencesLoading } = useQuery<Experience[]>({
    queryKey: ['experiences'],
    queryFn: portfolioApi.getExperiences,
    retry: false,
  });

  const { data: projects = [], isPending: isProjectsLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: portfolioApi.getProjects,
    retry: false,
  });

  const { data: techStacks = [], isPending: isTechStacksLoading } = useQuery<TechStack[]>({
    queryKey: ['tech-stacks'],
    queryFn: portfolioApi.getTechStacks,
    retry: false,
  });

  const resolvedProfile = profile ?? fallbackProfile;

  return (
    <div className="blueprint-grid flex min-h-screen flex-col text-ink">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Suspense fallback={<RouteSkeleton />}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  profile={resolvedProfile}
                  experiences={experiences}
                  projects={projects}
                  techStacks={techStacks}
                  isExperiencesLoading={isExperiencesLoading}
                  isProjectsLoading={isProjectsLoading}
                  isTechStacksLoading={isTechStacksLoading}
                />
              }
            />
            <Route
              path="/projects"
              element={<LazyProjectsPage projects={projects} isLoading={isProjectsLoading} />}
            />
            <Route path="/case-study" element={<LazyCaseStudyPage projects={projects} />} />
            <Route path="/case-study/:slug" element={<LazyCaseStudyPage projects={projects} />} />
            <Route
              path="/experience"
              element={
                <LazyExperienceCvPage
                  profile={resolvedProfile}
                  experiences={experiences}
                  techStacks={techStacks}
                  isExperiencesLoading={isExperiencesLoading}
                  isTechStacksLoading={isTechStacksLoading}
                />
              }
            />
            <Route path="/contact" element={<LazyContactPage profile={resolvedProfile} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <RecruiterFooterCta profile={resolvedProfile} />
    </div>
  );
};

export const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
