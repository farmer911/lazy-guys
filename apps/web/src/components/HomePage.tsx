import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AboutSection } from '@/components/AboutSection';
import { ExperienceSection } from '@/components/ExperienceSection';
import { KpiMetricCard } from '@/components/KpiMetricCard';
import { ProjectsSection } from '@/components/ProjectsSection';
import { SectionHeader } from '@/components/SectionHeader';
import { TechStackSection } from '@/components/TechStackSection';
import { Skeleton } from '@/components/ui/skeleton';
import type { Experience, Profile, Project, TechStack } from '@/lib/api';

const LazyContactForm = lazy(() =>
  import('@/components/ContactForm').then((mod) => ({ default: mod.ContactForm }))
);

const ContactFormPlaceholder = () => (
  <section id="contact" aria-busy="true" aria-label="Loading contact form">
    <Skeleton className="h-[348px] w-full" />
  </section>
);

const DeferredContactSection = () => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof IntersectionObserver === 'undefined'
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
      { rootMargin: '200px 0px' }
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

interface HomePageProps {
  readonly profile: Profile;
  readonly experiences: readonly Experience[];
  readonly projects: readonly Project[];
  readonly techStacks: readonly TechStack[];
  readonly isExperiencesLoading: boolean;
  readonly isProjectsLoading: boolean;
  readonly isTechStacksLoading: boolean;
}

export const HomePage = ({
  profile,
  experiences,
  projects,
  techStacks,
  isExperiencesLoading,
  isProjectsLoading,
  isTechStacksLoading,
}: HomePageProps) => (
  <div className="space-y-12">
    <AboutSection profile={profile} />

    {profile.kpi_metrics && profile.kpi_metrics.length > 0 && (
      <section aria-label="Measurable Production Results" className="space-y-4">
        <SectionHeader eyebrow="Telemetry & Proof" title="Measurable Production Results" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profile.kpi_metrics.map((metric) => (
            <KpiMetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      </section>
    )}

    <ProjectsSection projects={projects} isLoading={isProjectsLoading} showViewAllLink />
    <ExperienceSection experiences={experiences} isLoading={isExperiencesLoading} />
    <TechStackSection techStacks={techStacks} isLoading={isTechStacksLoading} />
    <DeferredContactSection />
  </div>
);
