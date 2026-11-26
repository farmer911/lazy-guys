import { Cpu } from 'lucide-react';
import { FilterChipRail, type FilterChipOption } from '@/components/FilterChipRail';
import { SectionHeader } from '@/components/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TechStack } from '@/lib/api';
import { usePortfolioStore } from '@/store/usePortfolioStore';

interface TechStackSectionProps {
  readonly techStacks: readonly TechStack[];
  readonly isLoading?: boolean;
}

const SKELETON_SLOTS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;
const FILTER_PILL_SLOTS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;

export const TechStackSection = ({ techStacks, isLoading = false }: TechStackSectionProps) => {
  const selectedCategory = usePortfolioStore((state) => state.selectedCategory);
  const setSelectedCategory = usePortfolioStore((state) => state.setSelectedCategory);

  const uniqueCategories = Array.from(new Set(techStacks.map((item) => item.category)));
  const chipOptions: FilterChipOption[] = [
    { value: 'All', label: 'All' },
    ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
  ];

  const filtered =
    selectedCategory === 'All'
      ? techStacks
      : techStacks.filter((item) => item.category === selectedCategory);

  return (
    <section id="tech-stack" className="space-y-5">
      <SectionHeader
        eyebrow="Engineering Depth"
        title="Tech Stack"
        icon={<Cpu className="h-5 w-5 text-cobalt" />}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            {!isLoading && (
              <FilterChipRail
                ariaLabel="Filter technologies by category"
                options={chipOptions}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />
            )}
            {isLoading &&
              FILTER_PILL_SLOTS.map((slot) => <Skeleton key={slot} className="h-8 w-[76px]" />)}
          </div>
        }
      />

      {isLoading ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading tech stack"
        >
          {SKELETON_SLOTS.map((slot) => (
            <Skeleton key={slot} className="h-[108px] w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tech) => (
            <Card key={tech.id}>
              <CardContent className="space-y-2.5 pt-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-ink">{tech.name}</span>
                  <span className="font-mono text-xs text-ink-muted">{tech.years_exp} yrs</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
                  <div
                    className="h-full rounded-full bg-cobalt transition-all"
                    style={{ width: `${tech.proficiency}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-xs text-ink-muted">
                  <span>{tech.category}</span>
                  <span>{tech.proficiency}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};
