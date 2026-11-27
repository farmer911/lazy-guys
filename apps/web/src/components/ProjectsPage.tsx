import {
  Activity,
  ArrowRight,
  Check,
  Code2,
  Database,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Layers,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { Link } from 'react-router';
import { FilterChipRail, type FilterChipOption } from '@/components/FilterChipRail';
import { ProjectsSection } from '@/components/ProjectsSection';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n/translations';
import type { Project } from '@/lib/api';
import { usePortfolioStore } from '@/store/usePortfolioStore';

interface ProjectsPageProps {
  readonly projects: readonly Project[];
  readonly isLoading: boolean;
}

const STANDARD_ICONS = [Activity, ShieldCheck, GitBranch, Database] as const;

export const ProjectsPage = ({ projects, isLoading }: ProjectsPageProps) => {
  const t = useTranslations();
  const selectedProjectCategory = usePortfolioStore((state) => state.selectedProjectCategory);
  const setSelectedProjectCategory = usePortfolioStore(
    (state) => state.setSelectedProjectCategory
  );

  const categoryCounts = new Map<string, number>();
  for (const proj of projects) {
    const cat = proj.category || 'Full-Stack Web';
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  const options: FilterChipOption[] = [
    { value: 'All', label: t.projectsPage.allProjects, count: projects.length },
    ...Array.from(categoryCounts.entries()).map(([cat, count]) => ({
      value: cat,
      label: cat,
      count,
    })),
  ];

  const filteredProjects =
    selectedProjectCategory === 'All'
      ? projects
      : projects.filter((p) => (p.category || 'Full-Stack Web') === selectedProjectCategory);

  const spotlight = filteredProjects[0];
  const remaining = filteredProjects.slice(1);

  return (
    <div className="space-y-12">
      <section className="space-y-6 pt-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-surface-low px-3 py-1 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface">
            {t.projectsPage.catalogBadge}
          </span>
        </div>

        <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h1 className="heading-hero font-bold text-on-surface">
              {t.projectsPage.heroTitlePrefix}{' '}
              <span className="text-primary underline decoration-primary-container decoration-4 underline-offset-8">
                {t.projectsPage.heroTitleHighlight}
              </span>
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
              {t.projectsPage.heroDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:col-span-4 lg:justify-end">
            <div className="flex items-center gap-3 rounded-xl bg-surface-lowest p-3.5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-primary">
                <FolderGit2 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-mono text-xs text-on-surface-variant">
                  {t.projectsPage.shippedLabel}
                </div>
                <div className="font-headline text-lg font-bold text-on-surface">
                  {t.projectsPage.systemsCount(projects.length)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-surface-lowest p-3.5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-status-ok">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="font-mono text-xs text-on-surface-variant">
                  {t.projectsPage.domainsLabel}
                </div>
                <div className="font-headline text-lg font-bold text-on-surface">
                  {t.projectsPage.categoriesCount(categoryCounts.size)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 pt-2 md:flex-row md:items-center">
          <FilterChipRail
            ariaLabel={t.projectsPage.filterAria}
            options={options}
            selected={selectedProjectCategory}
            onSelect={setSelectedProjectCategory}
          />
          <span className="shrink-0 font-mono text-xs text-on-surface-variant">
            {t.projectsPage.showingPrefix}{' '}
            <strong className="text-on-surface">{filteredProjects.length}</strong>{' '}
            {t.projectsPage.showingOf(projects.length)}
          </span>
        </div>
      </section>

      {isLoading ? (
        <div
          className="space-y-6"
          aria-busy="true"
          aria-label={t.projectsPage.loadingProjectsAria}
        >
          <Skeleton className="h-80 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : !spotlight ? (
        <ProjectsSection
          projects={[]}
          onResetFilter={() => setSelectedProjectCategory('All')}
        />
      ) : (
        <>
          <section
            data-testid="projects-spotlight-card"
            className="surface-card p-6 shadow-md transition-shadow hover:shadow-lg lg:p-8"
          >
            <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
              <div className="flex flex-col justify-between lg:col-span-7">
                <div>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="emerald"
                      className="rounded font-mono text-[11px] font-bold uppercase tracking-wider"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-status-ok-dot" />
                      <span>{spotlight.role || t.projectsPage.leadContributorFallback}</span>
                    </Badge>
                    <Badge variant="mono" className="uppercase tracking-wider">
                      {spotlight.category || 'Full-Stack Web'}
                    </Badge>
                  </div>

                  <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                    {spotlight.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-on-surface-variant sm:text-base">
                    {spotlight.summary}
                  </p>

                  {spotlight.highlights.length > 0 && (
                    <ul className="mt-6 space-y-2.5">
                      {spotlight.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary">
                            <Check className="h-3 w-3" />
                          </span>
                          <span className="text-xs leading-normal text-on-surface sm:text-sm">
                            {highlight}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-6 flex flex-wrap gap-1.5">
                    {spotlight.tech_tags.map((tag) => (
                      <Badge key={tag} variant="mono">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3 pt-4">
                  <Link
                    to={`/case-study/${spotlight.slug}`}
                    className={buttonVariants({ size: 'default' })}
                  >
                    <span>{t.projectsPage.deepDiveCta}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  {spotlight.live_url && (
                    <a
                      href={spotlight.live_url}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ variant: 'outline', size: 'default' })}
                    >
                      <span>{t.projectsPage.liveDemo}</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {spotlight.repo_url && (
                    <a
                      href={spotlight.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ variant: 'ghost', size: 'default' })}
                    >
                      <Code2 className="h-4 w-4" />
                      <span>{t.projectsPage.githubSource}</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-surface-low p-5 shadow-inner lg:col-span-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-error-container" />
                      <span className="h-2.5 w-2.5 rounded-full bg-primary-container" />
                      <span className="h-2.5 w-2.5 rounded-full bg-status-ok-dot" />
                      <span className="ml-2 font-mono text-[11px] font-semibold text-on-surface-variant">
                        {spotlight.slug}.spec.ts
                      </span>
                    </div>
                    <Terminal className="h-4 w-4 text-primary" />
                  </div>

                  {spotlight.case_study?.subtitle && (
                    <div className="rounded-lg bg-surface-lowest p-4 font-mono text-xs leading-relaxed text-on-surface shadow-xs">
                      <p className="text-on-surface-variant opacity-75">
                        {t.projectsPage.archFocusComment}
                      </p>
                      <p className="mt-1 font-medium text-on-surface">
                        {spotlight.case_study.subtitle}
                      </p>
                    </div>
                  )}

                  {spotlight.impact_metrics && spotlight.impact_metrics.length > 0 && (
                    <div className="grid grid-cols-2 gap-2.5">
                      {spotlight.impact_metrics.map((metric) => (
                        <div key={metric.label} className="rounded-lg bg-surface-lowest p-3 shadow-xs">
                          <div className="font-mono text-[10px] uppercase text-on-surface-variant">
                            {metric.label}
                          </div>
                          <div className="mt-0.5 font-headline text-base font-bold text-primary">
                            {metric.value}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-on-surface-variant">
                            {metric.detail}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {spotlight.case_study?.architectureFlow &&
                  spotlight.case_study.architectureFlow.length > 0 && (
                    <div className="mt-5 pt-3">
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                        {t.projectsPage.pipelineTopology}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-lowest p-3 font-mono text-[11px] text-on-surface shadow-xs">
                        {spotlight.case_study.architectureFlow.map((node, index) => (
                          <div key={node} className="flex items-center gap-1.5">
                            <span className="font-semibold text-primary">{node}</span>
                            {index <
                              (spotlight.case_study?.architectureFlow.length ?? 0) - 1 && (
                              <span className="text-outline" aria-hidden="true">
                                →
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </section>

          {remaining.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between font-mono text-xs text-on-surface-variant">
                <span className="uppercase tracking-widest">{t.projectsPage.additionalBuilds}</span>
                <span>{t.projectsPage.moreCount(remaining.length)}</span>
              </div>
              <ProjectsSection projects={remaining} />
            </section>
          )}
        </>
      )}

      <section className="rounded-2xl bg-surface-low p-6 lg:p-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="mb-3 inline-flex items-center gap-2 rounded bg-surface-container px-3 py-1 font-mono text-xs font-semibold text-primary">
              <Terminal className="h-3.5 w-3.5" />
              <span>{t.projectsPage.howVerifiedBadge}</span>
            </div>
            <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
              {t.projectsPage.standardsHeading}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              {t.projectsPage.standardsDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
            {t.projectsPage.standards.map((item, idx) => {
              const Icon = STANDARD_ICONS[idx % STANDARD_ICONS.length];
              return (
                <div key={item.title} className="rounded-xl bg-surface-lowest p-4 shadow-xs">
                  <div className="mb-1.5 flex items-center gap-2 font-mono text-xs font-bold text-primary">
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-on-surface-variant">{item.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
