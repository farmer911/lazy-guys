import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AboutSection } from '@/components/AboutSection';
import { ExperienceSection } from '@/components/ExperienceSection';
import { ProjectsSection } from '@/components/ProjectsSection';
import { TechStackSection } from '@/components/TechStackSection';
import {
  portfolioApi,
  type Experience,
  type Profile,
  type Project,
  type TechStack,
} from '@/lib/api';

const LazyContactForm = lazy(() =>
  import('@/components/ContactForm').then((mod) => ({ default: mod.ContactForm })),
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
  resume_url: null,
  avatar_url: null,
  achievements: [
    'Reduced API p95 latency by 45% via PostgreSQL indexing and query tuning',
    'Led migration to TypeScript monorepo with 90%+ E2E critical-path coverage',
    'Built internal design system adopted across 4 product squads',
  ],
};

const ContactFormPlaceholder = () => (
  <section id="contact" aria-busy="true" aria-label="Loading contact form">
    <div className="h-[348px] animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
  </section>
);

const DeferredContactSection = () => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    if (shouldLoad) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  if (!shouldLoad) {
    return (
      <div ref={sentinelRef}>
        <ContactFormPlaceholder />
      </div>
    );
  }

  return (
    <Suspense fallback={<ContactFormPlaceholder />}>
      <LazyContactForm />
    </Suspense>
  );
};

export const App = () => {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 text-sm">
          <span className="whitespace-nowrap font-semibold text-sky-400">lazy-guy</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 sm:gap-5 sm:text-sm">
            <a href="#about" className="hover:text-slate-50">
              About
            </a>
            <a href="#experience" className="hover:text-slate-50">
              Experience
            </a>
            <a href="#projects" className="hover:text-slate-50">
              Projects
            </a>
            <a href="#tech-stack" className="hover:text-slate-50">
              Tech Stack
            </a>
            <a href="#contact" className="hover:text-slate-50">
              Contact
            </a>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10">
        <AboutSection profile={profile ?? fallbackProfile} />
        <ExperienceSection experiences={experiences} isLoading={isExperiencesLoading} />
        <ProjectsSection projects={projects} isLoading={isProjectsLoading} />
        <TechStackSection techStacks={techStacks} isLoading={isTechStacksLoading} />
        <DeferredContactSection />
      </main>
    </div>
  );
};

export default App;
