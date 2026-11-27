import { ArrowRight, Code2, ExternalLink, Layers } from 'lucide-react';
import { Link } from 'react-router';
import { AboutSection } from '@/components/AboutSection';
import { KpiMetricCard } from '@/components/KpiMetricCard';
import { SectionHeader } from '@/components/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n/translations';
import type { Experience, Profile, Project, TechStack } from '@/lib/api';

interface HomePageProps {
  readonly profile: Profile;
  readonly experiences: readonly Experience[];
  readonly projects: readonly Project[];
  readonly techStacks: readonly TechStack[];
  readonly isProjectsLoading: boolean;
}

export const HomePage = ({
  profile,
  experiences,
  projects,
  techStacks,
  isProjectsLoading,
}: HomePageProps) => {
  const t = useTranslations();
  const kpiMetrics = profile.kpi_metrics ?? [];
  const featuredList = projects.filter((p) => p.featured).slice(0, 2);
  const featuredProjects = featuredList.length > 0 ? featuredList : projects.slice(0, 2);

  return (
    <div className="space-y-16 lg:space-y-20">
      <AboutSection
        profile={profile}
        projectsCount={projects.length}
        experiencesCount={experiences.length}
        techStacks={techStacks}
      />

      {kpiMetrics.length > 0 ? (
        <section aria-label={t.home.measurableResultsTitle} className="space-y-6">
          <SectionHeader
            eyebrow={t.home.hardNumbersEyebrow}
            title={t.home.measurableResultsTitle}
            description={t.home.measurableResultsDesc}
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {kpiMetrics.map((metric) => (
              <KpiMetricCard key={metric.label} metric={metric} />
            ))}
          </div>
        </section>
      ) : (
        profile.achievements.length > 0 && (
          <section aria-label={t.home.keyAchievementsTitle} className="space-y-6">
            <SectionHeader
              eyebrow={t.home.outcomesEyebrow}
              title={t.home.keyAchievementsTitle}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {profile.achievements.map((item) => (
                <Card key={item}>
                  <CardContent className="pt-6 text-sm leading-relaxed text-on-surface-variant">
                    {item}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )
      )}

      <section aria-label={t.home.featuredShowcasesTitle} className="space-y-8">
        <SectionHeader
          eyebrow={t.home.prodSystemsEyebrow}
          title={t.home.featuredShowcasesTitle}
          action={
            <Link
              to="/projects"
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg font-label text-xs font-bold uppercase tracking-wider text-primary hover:text-primary-dim transition-colors"
            >
              <span>{t.home.viewAllProjects(projects.length)}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        {isProjectsLoading ? (
          <div
            className="grid grid-cols-1 gap-8 lg:grid-cols-2"
            aria-busy="true"
            aria-label={t.home.loadingFeaturedAria}
          >
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : featuredProjects.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-on-surface-variant">
              {t.home.noProjectsYet}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {featuredProjects.map((project) => {
              const primaryMetric = project.impact_metrics?.[0];
              const secondaryMetric = project.impact_metrics?.[1];
              const flowNodes = project.case_study?.architectureFlow ?? [];

              return (
                <article
                  key={project.id}
                  className="surface-card-interactive flex flex-col justify-between p-6 sm:p-7"
                >
                  <div>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <Badge
                        variant="default"
                        className="rounded-md font-mono text-[10px] font-bold uppercase tracking-wider"
                      >
                        <Layers className="h-3 w-3" />
                        <span>{project.category || t.home.architectureFallback}</span>
                      </Badge>
                      {project.role && (
                        <span className="font-mono text-xs text-on-surface-variant">
                          {project.role}
                        </span>
                      )}
                    </div>

                    <h3 className="font-headline text-xl font-bold text-on-surface sm:text-2xl">
                      {project.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                      {project.summary}
                    </p>

                    {(primaryMetric || secondaryMetric) && (
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-low p-3">
                        {primaryMetric && (
                          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-on-surface">
                            <span className="h-2 w-2 rounded-full bg-status-ok-dot" />
                            <span>
                              {primaryMetric.label}: {primaryMetric.value}
                            </span>
                          </div>
                        )}
                        {secondaryMetric && (
                          <span className="font-mono text-xs font-bold text-primary">
                            {secondaryMetric.label}: {secondaryMetric.value}
                          </span>
                        )}
                      </div>
                    )}

                    {flowNodes.length > 0 && (
                      <div className="mt-5 rounded-xl bg-surface-high/40 p-3.5 dark:bg-surface-low">
                        <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[11px]">
                          {flowNodes.map((node, index) => (
                            <div key={node} className="flex items-center gap-2">
                              <span className="rounded-lg border border-outline-variant/40 bg-surface-lowest px-2.5 py-1.5 font-semibold text-on-surface shadow-2xs">
                                {node}
                              </span>
                              {index < flowNodes.length - 1 && (
                                <span className="font-bold text-primary" aria-hidden="true">
                                  →
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {project.tech_tags.map((tag) => (
                        <Badge key={tag} variant="mono">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-surface-container pt-4 dark:border-outline-variant/30">
                    <Link
                      to={`/case-study/${project.slug}`}
                      className="focus-ring inline-flex items-center gap-1.5 rounded font-label text-xs font-bold text-primary hover:text-primary-dim transition-colors"
                    >
                      <span>{t.home.readCaseStudy}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <div className="flex items-center gap-3">
                      {project.live_url && (
                        <a
                          href={project.live_url}
                          target="_blank"
                          rel="noreferrer"
                          className="focus-ring inline-flex items-center gap-1 rounded font-label text-xs font-semibold text-on-surface-variant hover:text-on-surface"
                        >
                          <span>{t.home.liveDemo}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {project.repo_url && (
                        <a
                          href={project.repo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="focus-ring inline-flex items-center gap-1 rounded font-label text-xs font-semibold text-on-surface-variant hover:text-on-surface"
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          <span>{t.home.source}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
