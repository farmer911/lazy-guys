import { ArrowRight, Code2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/i18n/translations';
import type { Project } from '@/lib/api';

interface ProjectBentoCardProps {
  readonly project: Project;
}

export const ProjectBentoCard = ({ project }: ProjectBentoCardProps) => {
  const t = useTranslations();

  return (
    <article className="surface-card-interactive flex h-full flex-col justify-between">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5">
            {project.category && (
              <Badge
                variant="default"
                className="rounded-md font-mono text-[10px] font-bold uppercase tracking-wider"
              >
                {project.category}
              </Badge>
            )}
            <CardTitle>{project.title}</CardTitle>
            {project.role && (
              <CardDescription className="font-mono text-xs">{project.role}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noreferrer"
                aria-label={t.projectsPage.repoAria(project.title)}
                className={buttonVariants({ variant: 'ghost', size: 'icon' })}
              >
                <Code2 className="h-4 w-4" />
              </a>
            )}
            {project.live_url && (
              <a
                href={project.live_url}
                target="_blank"
                rel="noreferrer"
                aria-label={t.projectsPage.liveDemoAria(project.title)}
                className={buttonVariants({ variant: 'ghost', size: 'icon' })}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between space-y-5">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-on-surface-variant">{project.summary}</p>
          {project.impact_metrics && project.impact_metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-low p-3.5">
              {project.impact_metrics.slice(0, 2).map((m) => (
                <div key={m.label}>
                  <p className="font-headline text-lg font-bold text-primary">{m.value}</p>
                  <p className="font-mono text-[11px] text-on-surface-variant">{m.label}</p>
                </div>
              ))}
            </div>
          )}
          {project.highlights.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-on-surface-variant">
              {project.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap gap-1.5">
            {project.tech_tags.map((tag) => (
              <Badge key={tag} variant="mono">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-container pt-3 dark:border-outline-variant/30">
            <Link
              to={`/case-study/${project.slug}`}
              className="focus-ring inline-flex items-center gap-1.5 rounded font-mono text-xs font-semibold text-primary hover:text-primary-dim transition-colors"
            >
              <span>{t.projectsPage.viewArchBreakdown}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </CardContent>
    </article>
  );
};
