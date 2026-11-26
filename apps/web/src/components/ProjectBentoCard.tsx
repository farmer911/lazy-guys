import { ArrowRight, Code2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Project } from '@/lib/api';

interface ProjectBentoCardProps {
  readonly project: Project;
}

export const ProjectBentoCard = ({ project }: ProjectBentoCardProps) => (
  <article className="surface-card-interactive flex h-full flex-col justify-between">
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          {project.category && (
            <Badge variant="default" className="mb-1">
              {project.category}
            </Badge>
          )}
          <CardTitle>{project.title}</CardTitle>
          {project.role && <CardDescription>{project.role}</CardDescription>}
        </div>
        <div className="flex items-center gap-1.5">
          {project.repo_url && (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.title} repository`}
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
              aria-label={`${project.title} live demo`}
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </CardHeader>

    <CardContent className="flex flex-1 flex-col justify-between space-y-4">
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-ink-secondary">{project.summary}</p>
        {project.impact_metrics && project.impact_metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {project.impact_metrics.slice(0, 2).map((m) => (
              <div
                key={m.label}
                className="rounded-lg border border-subtle bg-surface-subtle/60 px-3 py-2"
              >
                <p className="font-mono text-[11px] text-ink-muted">{m.label}</p>
                <p className="font-semibold text-cobalt">{m.value}</p>
              </div>
            ))}
          </div>
        )}
        {project.highlights.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-ink-muted">
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-subtle pt-3">
          <Link
            to={`/case-study/${project.slug}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Read Case Study <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </CardContent>
  </article>
);
