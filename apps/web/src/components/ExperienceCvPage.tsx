import { Download, Printer } from 'lucide-react';
import { ExperienceSection } from '@/components/ExperienceSection';
import { SectionHeader } from '@/components/SectionHeader';
import { TechStackSection } from '@/components/TechStackSection';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { portfolioApi, type Experience, type Profile, type TechStack } from '@/lib/api';

interface ExperienceCvPageProps {
  readonly profile: Profile;
  readonly experiences: readonly Experience[];
  readonly techStacks: readonly TechStack[];
  readonly isExperiencesLoading: boolean;
  readonly isTechStacksLoading: boolean;
}

const PHILOSOPHY = [
  {
    title: 'Zero Synthetic Tests',
    detail: 'Integration suites run against real PostgreSQL 16 and Chromium Playwright, never mocked DB stubs.',
  },
  {
    title: 'Measured Outcomes Over LOC',
    detail: 'Every schema index and bundle split is verified against EXPLAIN plans, CLS = 0, and p95 latency.',
  },
  {
    title: 'Contract-First Delivery',
    detail: 'Shared Zod v4 schemas prevent frontend/backend drift across compile-time and runtime boundaries.',
  },
] as const;

export const ExperienceCvPage = ({
  profile,
  experiences,
  techStacks,
  isExperiencesLoading,
  isTechStacksLoading,
}: ExperienceCvPageProps) => (
  <div className="space-y-10">
    <header className="surface-card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-cobalt">
          Curriculum Vitae (PDF + Interactive)
        </p>
        <h1 className="heading-h1 font-bold text-ink">Experience &amp; Engineering Leadership</h1>
        <p className="text-sm text-ink-secondary">
          {profile.full_name} · {profile.headline}
        </p>
      </div>

      <div className="no-print flex flex-wrap gap-2.5">
        <a
          href={portfolioApi.getCvPdfUrl()}
          download="lazy-guy-resume.pdf"
          className={buttonVariants({ size: 'default' })}
        >
          <Download className="h-4 w-4" />
          <span>Download PDF Resume</span>
        </a>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          <span>Print CV</span>
        </Button>
      </div>
    </header>

    <ExperienceSection experiences={experiences} isLoading={isExperiencesLoading} />
    <TechStackSection techStacks={techStacks} isLoading={isTechStacksLoading} />

    <section className="space-y-4">
      <SectionHeader eyebrow="Engineering Culture" title="Work Style &amp; Architecture Rigor" />
      <div className="grid gap-4 md:grid-cols-3">
        {PHILOSOPHY.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-ink-secondary">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  </div>
);
