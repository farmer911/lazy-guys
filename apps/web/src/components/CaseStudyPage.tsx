import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, Cpu, Gauge, Layers } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { SectionHeader } from '@/components/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { portfolioApi, type Project } from '@/lib/api';

interface CaseStudyPageProps {
  readonly projects: readonly Project[];
}

export const CaseStudyPage = ({ projects }: CaseStudyPageProps) => {
  const { slug } = useParams();
  const hasExplicitSlug = Boolean(slug);
  const activeSlug = slug || projects[0]?.slug || 'lazy-guy-portfolio';

  const { data: project, isPending, isError } = useQuery<Project>({
    queryKey: ['project', activeSlug],
    queryFn: () => portfolioApi.getProjectBySlug(activeSlug),
    retry: false,
  });

  const resolvedProject = hasExplicitSlug
    ? project ?? (isError ? undefined : projects.find((p) => p.slug === slug))
    : project ?? projects[0];
  const cs = resolvedProject?.case_study;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </Link>

        {projects.length > 0 && (
          <div className="chip-rail" aria-label="Switch case study">
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
        <div className="space-y-4" aria-busy="true" aria-label="Loading case study">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !resolvedProject ? (
        <Card>
          <CardContent className="pt-6 text-sm text-ink-muted">
            Case study not found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <div className="surface-card sticky top-24 space-y-2 p-4">
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-cobalt">
                Case Outline
              </p>
              <nav aria-label="Case study sections" className="flex flex-col gap-1 text-xs">
                <a href="#bottleneck" className="focus-ring rounded px-2 py-1.5 text-ink-secondary hover:bg-surface-subtle hover:text-ink">
                  01. The Bottleneck
                </a>
                <a href="#architecture" className="focus-ring rounded px-2 py-1.5 text-ink-secondary hover:bg-surface-subtle hover:text-ink">
                  02. System Flow
                </a>
                <a href="#adrs" className="focus-ring rounded px-2 py-1.5 text-ink-secondary hover:bg-surface-subtle hover:text-ink">
                  03. Technical ADRs
                </a>
                <a href="#benchmarks" className="focus-ring rounded px-2 py-1.5 text-ink-secondary hover:bg-surface-subtle hover:text-ink">
                  04. Production Audit
                </a>
                <a href="#next-steps" className="focus-ring rounded px-2 py-1.5 text-ink-secondary hover:bg-surface-subtle hover:text-ink">
                  05. Handover
                </a>
              </nav>
            </div>
          </aside>

          <div className="space-y-8">
            <header className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {resolvedProject.category && <Badge>{resolvedProject.category}</Badge>}
                {resolvedProject.role && <Badge variant="mono">{resolvedProject.role}</Badge>}
              </div>
              <h1 className="heading-h1 font-bold text-ink">{resolvedProject.title}</h1>
              <p className="text-base leading-relaxed text-ink-secondary">
                {cs?.subtitle || resolvedProject.summary}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resolvedProject.tech_tags.map((tag) => (
                  <Badge key={tag} variant="mono">
                    {tag}
                  </Badge>
                ))}
              </div>
            </header>

            <section id="bottleneck" className="space-y-3">
              <SectionHeader eyebrow="01 / Context" title="The Bottleneck & Production Context" />
              <Card>
                <CardContent className="pt-6 text-sm leading-relaxed text-ink-secondary">
                  {cs?.bottleneck || resolvedProject.summary}
                </CardContent>
              </Card>
            </section>

            {cs?.architectureFlow && cs.architectureFlow.length > 0 && (
              <section id="architecture" className="space-y-3">
                <SectionHeader
                  eyebrow="02 / Topology"
                  title="System Architecture & Latency Flow"
                  icon={<Layers className="h-5 w-5 text-cobalt" />}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {cs.architectureFlow.map((node, index) => (
                    <Card key={node}>
                      <CardContent className="flex items-center justify-between gap-2 pt-5">
                        <div>
                          <p className="font-mono text-[11px] text-cobalt">STAGE 0{index + 1}</p>
                          <p className="text-sm font-semibold text-ink">{node}</p>
                        </div>
                        {index < cs.architectureFlow.length - 1 && (
                          <ArrowRight className="hidden h-4 w-4 text-ink-muted sm:block" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {cs?.adrDecisions && cs.adrDecisions.length > 0 && (
              <section id="adrs" className="space-y-3">
                <SectionHeader
                  eyebrow="03 / Engineering ADRs"
                  title="Technical Decisions & Trade-Offs"
                  icon={<Cpu className="h-5 w-5 text-cobalt" />}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  {cs.adrDecisions.map((adr) => (
                    <Card key={adr.title}>
                      <CardHeader>
                        <CardTitle className="text-base">{adr.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p className="text-ink-secondary">{adr.decision}</p>
                        <p className="rounded-lg border border-subtle bg-surface-subtle/60 p-2.5 text-xs text-ink-muted">
                          <span className="font-mono font-semibold text-ink">Trade-off:</span>{' '}
                          {adr.tradeoff}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {cs?.benchmarks && cs.benchmarks.length > 0 && (
              <section id="benchmarks" className="space-y-3">
                <SectionHeader
                  eyebrow="04 / Quantitative Results"
                  title="Production Performance Audit"
                  icon={<Gauge className="h-5 w-5 text-cobalt" />}
                />
                <Card>
                  <CardContent className="overflow-x-auto pt-6">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-subtle font-mono text-xs uppercase text-ink-muted">
                          <th className="pb-2 pr-4">Metric</th>
                          <th className="pb-2 pr-4">Before</th>
                          <th className="pb-2">After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle">
                        {cs.benchmarks.map((row) => (
                          <tr key={row.metric}>
                            <td className="py-2.5 pr-4 font-medium text-ink">{row.metric}</td>
                            <td className="py-2.5 pr-4 font-mono text-xs text-ink-muted">
                              {row.before}
                            </td>
                            <td className="py-2.5 font-mono text-xs font-semibold text-status-ok">
                              {row.after}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </section>
            )}

            <section id="next-steps" className="space-y-3">
              <SectionHeader
                eyebrow="05 / Handover"
                title="Next Steps & Technical Inquiries"
                icon={<CheckCircle2 className="h-5 w-5 text-status-ok" />}
              />
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-ink-secondary">
                    {cs?.nextSteps || 'Available for technical deep-dive walkthroughs.'}
                  </p>
                  <Link to="/contact" className={buttonVariants({ size: 'sm' })}>
                    Discuss Architecture
                  </Link>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
