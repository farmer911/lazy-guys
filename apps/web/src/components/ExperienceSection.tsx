import { Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Experience } from '@/lib/api';

interface ExperienceSectionProps {
  experiences: Experience[];
}

function formatDate(value: string | null): string {
  if (!value) return 'Present';
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function ExperienceSection({ experiences }: ExperienceSectionProps) {
  return (
    <section id="experience" className="space-y-4">
      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Briefcase className="h-5 w-5 text-sky-400" /> Experience
      </h2>
      <div className="space-y-4">
        {experiences.map((exp) => (
          <Card key={exp.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>{exp.role}</CardTitle>
                  <CardDescription>
                    {exp.company} {exp.location ? `• ${exp.location}` : ''}
                  </CardDescription>
                </div>
                <Badge variant={exp.is_current ? 'default' : 'secondary'}>
                  {formatDate(exp.start_date)} — {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-300">{exp.summary}</p>
              {exp.highlights.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
                  {exp.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
