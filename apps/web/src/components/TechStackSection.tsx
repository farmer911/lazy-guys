import { Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { TechStack } from '@/lib/api';
import { usePortfolioStore } from '@/store/usePortfolioStore';

interface TechStackSectionProps {
  techStacks: TechStack[];
  isLoading?: boolean;
}

const SKELETON_SLOTS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;
const FILTER_PILL_SLOTS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;

export const TechStackSection = ({ techStacks, isLoading = false }: TechStackSectionProps) => {
  const { selectedCategory, setSelectedCategory } = usePortfolioStore();

  const categories = ['All', ...Array.from(new Set(techStacks.map((item) => item.category)))];
  const filtered =
    selectedCategory === 'All'
      ? techStacks
      : techStacks.filter((item) => item.category === selectedCategory);

  return (
    <section id="tech-stack" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Cpu className="h-5 w-5 text-sky-400" /> Tech Stack
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
          {isLoading &&
            FILTER_PILL_SLOTS.map((slot) => (
              <div
                key={slot}
                aria-hidden="true"
                className="h-8 w-[76px] animate-pulse rounded-md border border-slate-800 bg-slate-900/60"
              />
            ))}
        </div>
      </div>

      {isLoading ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading tech stack"
        >
          {SKELETON_SLOTS.map((slot) => (
            <div
              key={slot}
              className="h-[108px] animate-pulse rounded-xl border border-slate-800 bg-slate-900/60"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tech) => (
            <Card key={tech.id}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100">{tech.name}</span>
                  <span className="text-xs text-slate-400">{tech.years_exp} yrs</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-sky-400"
                    style={{ width: `${tech.proficiency}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
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
