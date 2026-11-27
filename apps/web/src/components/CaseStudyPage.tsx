import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  Gauge,
  Layers,
  Printer,
  Shield,
} from 'lucide-react';
import { Link, useParams } from 'react-router';
import { SectionHeader } from '@/components/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n/translations';
import { portfolioApi, type Project } from '@/lib/api';

interface CaseStudyPageProps {
  readonly projects: readonly Project[];
}

const STAGE_ICONS = [Layers, Shield, Cpu, Database] as const;

export const CaseStudyPage = ({ projects }: CaseStudyPageProps) => {
  const t = useTranslations();
  const { slug } = useParams();
  const hasExplicitSlug = Boolean(slug);
  const activeSlug = slug || projects[0]?.slug || '';

  const { data: project, isPending, isError } = useQuery<Project>({
    queryKey: ['project', activeSlug],
    queryFn: () => portfolioApi.getProjectBySlug(activeSlug),
    enabled: Boolean(activeSlug),
    retry: false,
  });

  const resolvedProject = hasExplicitSlug
    ? project ?? (isError ? undefined : projects.find((p) => p.slug === slug))
    : project ?? projects[0];
  const cs = resolvedProject?.case_study;
  const nextProject = projects.find((p) => p.slug !== resolvedProject?.slug);

  return (
    <div className="space-y-10">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-lowest px-4 py-3 shadow-xs border border-outline-variant/25">
        <div className="flex items-center gap-2 text-xs font-label">
          <Link
            to="/projects"
            className="focus-ring inline-flex items-center gap-1 rounded font-semibold text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.caseStudy.breadcrumbProjects}</span>
          </Link>
          <span className="font-mono text-outline">/</span>
          <span className="max-w-xs truncate font-semibold text-on-surface sm:max-w-md">
            {resolvedProject?.title || (hasExplicitSlug ? slug : t.caseStudy.breadcrumbFallback)}
          </span>
        </div>

        {projects.length > 1 && (
          <div className="chip-rail max-w-full" aria-label={t.caseStudy.switchCaseAria}>
            {projects.map((p) => (
              <Link
                key={p.slug}
                to={`/case-study/${p.slug}`}
                className={buttonVariants({
                  variant: p.slug === resolvedProject?.slug ? 'default' : 'outline',
                  size: 'sm',
                })}
              >
                {p.title}
              </Link>
            ))}
          </div>
        )}
      </div>

      {isPending && !resolvedProject ? (
        <div className="space-y-6" aria-busy="true" aria-label={t.caseStudy.loadingAria}>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : !resolvedProject ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-on-surface-variant">{t.caseStudy.notFound}</p>
            <Link to="/projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <ArrowLeft className="h-4 w-4" />
              <span>{t.caseStudy.returnToProjects}</span>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-12">
          <header className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {resolvedProject.category && <Badge>{resolvedProject.category}</Badge>}
                {resolvedProject.role && <Badge variant="mono">{resolvedProject.role}</Badge>}
              </div>
              <h1 className="heading-h1 font-bold text-on-surface">{resolvedProject.title}</h1>
              <p className="max-w-3xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
                {cs?.subtitle || resolvedProject.summary}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-1.5">
                {resolvedProject.tech_tags.map((tag) => (
                  <Badge key={tag} variant="mono">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="no-print flex flex-wrap items-center gap-2.5">
                {resolvedProject.live_url && (
                  <a
                    href={resolvedProject.live_url}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ size: 'sm' })}
                  >
                    <span>{t.caseStudy.liveSystem}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {resolvedProject.repo_url && (
                  <a
                    href={resolvedProject.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    <span>{t.caseStudy.repository}</span>
                  </a>
                )}
                <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5" />
                  <span>{t.caseStudy.printBrief}</span>
                </Button>
              </div>
            </div>

            {resolvedProject.impact_metrics && resolvedProject.impact_metrics.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {resolvedProject.impact_metrics.map((metric) => (
                  <Card key={metric.label}>
                    <CardContent className="space-y-2 pt-6">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                        {metric.label}
                      </span>
                      <div className="stat-kpi font-bold text-on-surface">{metric.value}</div>
                      <p className="text-xs leading-relaxed text-on-surface-variant">
                        {metric.detail}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </header>

          <div className="flex flex-col items-start gap-10 lg:flex-row">
            <aside className="no-print w-full shrink-0 space-y-5 lg:sticky lg:top-24 lg:w-72">
              <div data-testid="case-study-outline" className="surface-card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
                    {t.caseStudy.caseOutline}
                  </span>
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {t.caseStudy.fiveChapters}
                  </span>
                </div>
                <nav
                  aria-label={t.caseStudy.sectionsNavAria}
                  className="flex flex-col gap-1 font-label text-xs"
                >
                  <a
                    href="#bottleneck"
                    className="focus-ring flex items-center justify-between rounded-xl bg-surface-container px-3 py-2 font-semibold text-primary"
                  >
                    <span>{t.caseStudy.ch1Nav}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href="#architecture"
                    className="focus-ring flex items-center justify-between rounded-xl px-3 py-2 text-on-surface-variant hover:bg-surface-low hover:text-on-surface"
                  >
                    <span>{t.caseStudy.ch2Nav}</span>
                    <span className="font-mono text-[10px] text-outline">{t.caseStudy.ch2Meta}</span>
                  </a>
                  <a
                    href="#adrs"
                    className="focus-ring flex items-center justify-between rounded-xl px-3 py-2 text-on-surface-variant hover:bg-surface-low hover:text-on-surface"
                  >
                    <span>{t.caseStudy.ch3Nav}</span>
                    <span className="font-mono text-[10px] text-outline">{t.caseStudy.ch3Meta}</span>
                  </a>
                  <a
                    href="#benchmarks"
                    className="focus-ring flex items-center justify-between rounded-xl px-3 py-2 text-on-surface-variant hover:bg-surface-low hover:text-on-surface"
                  >
                    <span>{t.caseStudy.ch4Nav}</span>
                    <span className="font-mono text-[10px] text-outline">{t.caseStudy.ch4Meta}</span>
                  </a>
                  <a
                    href="#next-steps"
                    className="focus-ring flex items-center justify-between rounded-xl px-3 py-2 text-on-surface-variant hover:bg-surface-low hover:text-on-surface"
                  >
                    <span>{t.caseStudy.ch5Nav}</span>
                    <span className="font-mono text-[10px] text-outline">{t.caseStudy.ch5Meta}</span>
                  </a>
                </nav>
              </div>

              <div className="surface-card space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-on-surface">
                    {t.caseStudy.projectSpec}
                  </span>
                  <Badge variant="default" className="rounded font-mono text-[10px]">
                    {t.caseStudy.databasedBadge}
                  </Badge>
                </div>
                <dl className="space-y-2 text-xs">
                  <div>
                    <dt className="font-label text-[11px] text-on-surface-variant">
                      {t.caseStudy.roleLabel}
                    </dt>
                    <dd className="font-semibold text-on-surface">
                      {resolvedProject.role || t.caseStudy.contributorFallback}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-label text-[11px] text-on-surface-variant">
                      {t.caseStudy.categoryLabel}
                    </dt>
                    <dd className="font-medium text-on-surface">
                      {resolvedProject.category || t.caseStudy.engineeringFallback}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-label text-[11px] text-on-surface-variant">
                      {t.caseStudy.slugLabel}
                    </dt>
                    <dd className="font-mono text-[11px] text-primary">{resolvedProject.slug}</dd>
                  </div>
                </dl>
              </div>
            </aside>

            <div className="w-full flex-1 space-y-12">
              <section id="bottleneck" className="space-y-4">
                <SectionHeader eyebrow={t.caseStudy.ch1Eyebrow} title={t.caseStudy.ch1Title} />
                <Card>
                  <CardContent className="pt-6 text-sm leading-relaxed text-on-surface-variant sm:text-base">
                    {cs?.bottleneck || resolvedProject.summary}
                  </CardContent>
                </Card>
              </section>

              {cs?.architectureFlow && cs.architectureFlow.length > 0 && (
                <section id="architecture" className="space-y-4">
                  <SectionHeader
                    eyebrow={t.caseStudy.ch2Eyebrow}
                    title={t.caseStudy.ch2Title}
                    icon={<Layers className="h-5 w-5 text-primary" />}
                  />
                  <div className="surface-card p-5 sm:p-6">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-4">
                      {cs.architectureFlow.map((node, index) => {
                        const StageIcon = STAGE_ICONS[index % STAGE_ICONS.length];
                        return (
                          <div key={node} className="relative flex flex-col items-center gap-2">
                            <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-surface-low p-4 text-center shadow-xs">
                              <StageIcon className="mb-1.5 h-5 w-5 text-primary" />
                              <span className="font-mono text-[10px] font-bold text-primary">
                                {t.caseStudy.stageLabel(index + 1)}
                              </span>
                              <span className="mt-0.5 font-headline text-xs font-bold text-on-surface">
                                {node}
                              </span>
                            </div>
                            {index < cs.architectureFlow.length - 1 && (
                              <>
                                <ArrowDown
                                  aria-hidden="true"
                                  className="h-4 w-4 shrink-0 text-primary md:hidden"
                                />
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute top-1/2 -right-3.5 z-10 hidden -translate-y-1/2 rounded-full bg-surface-lowest p-1 text-primary shadow-xs md:inline-flex"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {cs?.adrDecisions && cs.adrDecisions.length > 0 && (
                <section id="adrs" className="space-y-4">
                  <SectionHeader
                    eyebrow={t.caseStudy.ch3Eyebrow}
                    title={t.caseStudy.ch3Title}
                    icon={<Cpu className="h-5 w-5 text-primary" />}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    {cs.adrDecisions.map((adr, idx) => (
                      <Card key={adr.title}>
                        <CardHeader>
                          <span className="font-mono text-[11px] font-bold text-primary">
                            {t.caseStudy.decisionLabel(idx + 1)}
                          </span>
                          <CardTitle className="text-base">{adr.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <p className="leading-relaxed text-on-surface-variant">{adr.decision}</p>
                          <p className="rounded-xl bg-surface-low p-3 text-xs leading-relaxed text-on-surface-variant">
                            <span className="font-mono font-semibold text-on-surface">
                              {t.caseStudy.tradeoffLabel}
                            </span>{' '}
                            {adr.tradeoff}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {cs?.benchmarks && cs.benchmarks.length > 0 && (
                <section id="benchmarks" className="space-y-4">
                  <SectionHeader
                    eyebrow={t.caseStudy.ch4Eyebrow}
                    title={t.caseStudy.ch4Title}
                    icon={<Gauge className="h-5 w-5 text-primary" />}
                  />
                  <div className="surface-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="bg-surface-low font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                            <th className="p-4">{t.caseStudy.thMetric}</th>
                            <th className="p-4">{t.caseStudy.thBefore}</th>
                            <th className="p-4">{t.caseStudy.thAfter}</th>
                            <th className="p-4">{t.caseStudy.thStatus}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container font-mono text-xs dark:divide-outline-variant/30">
                          {cs.benchmarks.map((row) => (
                            <tr key={row.metric}>
                              <td className="p-4 font-semibold text-on-surface">{row.metric}</td>
                              <td className="p-4 text-error">{row.before}</td>
                              <td className="p-4 font-bold text-primary">{row.after}</td>
                              <td className="p-4">
                                <span className="rounded bg-surface-container px-2 py-0.5 text-[10px] font-bold text-primary">
                                  {t.caseStudy.verifiedBadge}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              <section id="next-steps" className="space-y-4">
                <SectionHeader
                  eyebrow={t.caseStudy.ch5Eyebrow}
                  title={t.caseStudy.ch5Title}
                  icon={<CheckCircle2 className="h-5 w-5 text-status-ok" />}
                />
                <Card>
                  <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm leading-relaxed text-on-surface-variant">
                      {cs?.nextSteps || t.caseStudy.nextStepsFallback}
                    </p>
                    <Link to="/contact" className={buttonVariants({ size: 'sm' })}>
                      {t.caseStudy.discussArchCta}
                    </Link>
                  </CardContent>
                </Card>

                {nextProject && (
                  <Link
                    to={`/case-study/${nextProject.slug}`}
                    className="surface-card-interactive group block p-6"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                          {t.caseStudy.nextCaseStudyEyebrow}
                        </span>
                        <h3 className="font-headline text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                          {nextProject.title}
                        </h3>
                        <p className="text-xs text-on-surface-variant">{nextProject.summary}</p>
                      </div>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    </div>
                  </Link>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
