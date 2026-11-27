import { Suspense, lazy, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { HomePage } from '@/components/HomePage';
import { Navbar } from '@/components/Navbar';
import { RecruiterFooterCta } from '@/components/RecruiterFooterCta';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n/translations';
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

const RouteSkeleton = () => {
  const t = useTranslations();
  return (
    <div className="space-y-8" aria-busy="true" aria-label={t.app.loadingPortfolioAria}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <Skeleton className="h-72 w-full lg:col-span-7" />
        <Skeleton className="h-72 w-full lg:col-span-5" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  );
};

export const AppRoutes = () => {
  const location = useLocation();
  const t = useTranslations();

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo(0, 0);
    }
    void portfolioApi.recordVisit(location.pathname || '/');
  }, [location.pathname]);

  const {
    data: profile,
    isPending: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useQuery<Profile>({
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
    <div className="blueprint-grid flex min-h-screen flex-col overflow-x-clip text-on-surface">
      <Navbar
        fullName={profile?.full_name}
        availabilityText={profile?.availability_text}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
        {isProfileLoading ? (
          <RouteSkeleton />
        ) : isProfileError || !profile ? (
          <Card role="alert" className="mx-auto max-w-lg border-error/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-error">
                <AlertTriangle className="h-5 w-5" />
                <span>{t.app.unableToLoadTitle}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-on-surface-variant">
                {t.app.unableToLoadDesc}
              </p>
              <Button type="button" size="sm" onClick={() => void refetchProfile()}>
                {t.app.retry}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Suspense fallback={<RouteSkeleton />}>
            <Routes>
              <Route
                path="/"
                element={
                  <HomePage
                    profile={profile}
                    experiences={experiences}
                    projects={projects}
                    techStacks={techStacks}
                    isProjectsLoading={isProjectsLoading}
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
                    profile={profile}
                    experiences={experiences}
                    techStacks={techStacks}
                    isExperiencesLoading={isExperiencesLoading}
                    isTechStacksLoading={isTechStacksLoading}
                  />
                }
              />
              <Route path="/contact" element={<LazyContactPage profile={profile} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        )}
      </main>

      {profile && <RecruiterFooterCta profile={profile} />}
    </div>
  );
};

export const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
