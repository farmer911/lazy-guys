import { Briefcase } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Experience } from '@/lib/api';

interface ExperienceSectionProps {
  readonly experiences: readonly Experience[];
  readonly isLoading?: boolean;
}

const formatDate = (value: string | null): string => {
  if (!value) return 'Present';
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const ExperienceSection = ({
  experiences,
  isLoading = false,
}: ExperienceSectionProps) => (
  <section id="experience" className="space-y-5">
    <SectionHeader
      eyebrow="Career Timeline"
      title="Experience"
      icon={<Briefcase className="h-5 w-5 text-cobalt" />}
    />

    {isLoading ? (
      <div className="space-y-4" aria-busy="true" aria-label="Loading experience">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    ) : experiences.length === 0 ? (
      <Card>
        <CardContent className="pt-6 text-sm text-ink-muted">
          No experience records found.
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-4">
        {experiences.map((exp) => (
          <Card key={exp.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>{exp.role}</CardTitle>
                  <CardDescription>
                    {exp.company} {exp.location ? `• ${exp.location}` : ''}
                  </CardDescription>
                </div>
                <Badge variant={exp.is_current ? 'emerald' : 'secondary'}>
                  {formatDate(exp.start_date)} — {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed text-ink-secondary">{exp.summary}</p>
              {exp.highlights.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
                  {exp.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              )}
              {exp.tech_tags && exp.tech_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {exp.tech_tags.map((tag) => (
                    <Badge key={tag} variant="mono">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </section>
);
