import { FolderGit2, ShieldCheck } from 'lucide-react';
import { FilterChipRail, type FilterChipOption } from '@/components/FilterChipRail';
import { ProjectsSection } from '@/components/ProjectsSection';
import { SectionHeader } from '@/components/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import type { Project } from '@/lib/api';
import { usePortfolioStore } from '@/store/usePortfolioStore';

interface ProjectsPageProps {
  readonly projects: readonly Project[];
  readonly isLoading: boolean;
}

const STANDARDS = [
  'Zero-Build Zod v4 Contracts across API & UI boundaries',
  'UTC-Safe Calendar Dates & Composite B-Tree PostgreSQL Indexing',
  'Playwright Chromium + Vitest + RTL Automated Verification Gates',
] as const;

export const ProjectsPage = ({ projects, isLoading }: ProjectsPageProps) => {
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
    { value: 'All', label: 'All Projects', count: projects.length },
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

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <SectionHeader
          eyebrow="Shipped Work Catalog"
          title="Selected Engineering Work"
          description="Production systems built with measurable latency targets, strict TypeScript hygiene, and full end-to-end test gates."
          icon={<FolderGit2 className="h-6 w-6 text-cobalt" />}
        />
        <FilterChipRail
          ariaLabel="Filter projects by category"
          options={options}
          selected={selectedProjectCategory}
          onSelect={setSelectedProjectCategory}
        />
      </div>

      <ProjectsSection projects={filteredProjects} isLoading={isLoading} />

      <Card>
        <CardContent className="space-y-3 pt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cobalt">
            <ShieldCheck className="h-4 w-4" /> Strict Engineering Standards Applied to Every Release
          </h3>
          <ul className="grid gap-3 sm:grid-cols-3">
            {STANDARDS.map((rule) => (
              <li
                key={rule}
                className="rounded-xl border border-subtle bg-surface-subtle/60 p-3 text-xs leading-relaxed text-ink-secondary"
              >
                {rule}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
