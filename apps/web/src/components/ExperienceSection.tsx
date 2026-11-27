import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatExperienceDate, useTranslations } from '@/i18n/translations';
import type { Experience } from '@/lib/api';
import { cn } from '@/lib/utils';
import { usePortfolioStore } from '@/store/usePortfolioStore';

interface ExperienceSectionProps {
  readonly experiences: readonly Experience[];
  readonly isLoading?: boolean;
}

export const ExperienceSection = ({
  experiences,
  isLoading = false,
}: ExperienceSectionProps) => {
  const locale = usePortfolioStore((state) => state.locale);
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={t.experience.loadingExpAria}>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (experiences.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-on-surface-variant">
          {t.experience.noExpFound}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {experiences.map((exp, index) => (
        <article
          key={exp.id}
          className="surface-card relative overflow-hidden p-6 transition-shadow hover:shadow-md sm:p-7"
        >
          <div
            aria-hidden="true"
            className={cn(
              'absolute top-0 left-0 h-full w-1.5',
              exp.is_current ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-outline-variant'
            )}
          />

          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-headline text-lg font-bold text-on-surface sm:text-xl">
                  {exp.role}
                </h3>
                {exp.is_current && (
                  <Badge
                    variant="emerald"
                    className="rounded font-label text-[10px] font-semibold uppercase"
                  >
                    {t.experience.present}
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 font-label text-xs font-medium text-on-surface-variant">
                <span className="font-semibold text-on-surface">{exp.company}</span>
                {exp.location && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span>{exp.location}</span>
                  </>
                )}
                <span aria-hidden="true">•</span>
                <span className="font-mono">
                  {formatExperienceDate(exp.start_date, locale, t.experience.present)} —{' '}
                  {exp.is_current
                    ? t.experience.present
                    : formatExperienceDate(exp.end_date, locale, t.experience.present)}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-on-surface-variant sm:text-sm">
            {exp.summary}
          </p>

          {exp.highlights.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2.5 text-xs leading-relaxed text-on-surface-variant sm:text-sm">
              {exp.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          )}

          {exp.tech_tags && exp.tech_tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5 pt-2">
              {exp.tech_tags.map((tag) => (
                <Badge key={tag} variant="mono">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
};
