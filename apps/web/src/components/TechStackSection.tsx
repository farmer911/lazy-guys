import { FilterChipRail, type FilterChipOption } from '@/components/FilterChipRail';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n/translations';
import type { TechStack } from '@/lib/api';
import { usePortfolioStore } from '@/store/usePortfolioStore';

interface TechStackSectionProps {
  readonly techStacks: readonly TechStack[];
  readonly isLoading?: boolean;
}

const SKELETON_SLOTS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;

export const TechStackSection = ({ techStacks, isLoading = false }: TechStackSectionProps) => {
  const t = useTranslations();
  const selectedCategory = usePortfolioStore((state) => state.selectedCategory);
  const setSelectedCategory = usePortfolioStore((state) => state.setSelectedCategory);

  const uniqueCategories = Array.from(new Set(techStacks.map((item) => item.category)));
  const chipOptions: FilterChipOption[] = [
    { value: 'All', label: t.experience.allCategories, count: techStacks.length },
    ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
  ];

  const filtered =
    selectedCategory === 'All'
      ? techStacks
      : techStacks.filter((item) => item.category === selectedCategory);

  return (
    <Card data-testid="skillset-matrix-card">
      <CardContent className="space-y-5 pt-6">
        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label={t.experience.loadingTechAria}>
            <Skeleton className="h-9 w-full" />
            {SKELETON_SLOTS.map((slot) => (
              <Skeleton key={slot} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <>
            <FilterChipRail
              ariaLabel={t.experience.filterTechAria}
              options={chipOptions}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />

            {filtered.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{t.experience.noTechInCategory}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((tech) => (
                  <div
                    key={tech.id}
                    className="flex flex-col gap-2 rounded-xl bg-surface-low p-3.5 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-headline text-xs font-bold text-on-surface sm:text-sm">
                        {tech.name}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-primary">
                        {t.experience.yearsUnit(tech.years_exp)} • {tech.proficiency}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${tech.proficiency}%` }}
                      />
                    </div>
                    <div className="flex justify-between font-mono text-[11px] text-on-surface-variant">
                      <span>{tech.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
