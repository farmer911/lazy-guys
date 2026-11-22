import { Code2, ExternalLink, FolderGit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Project } from '@/lib/api';

interface ProjectsSectionProps {
  projects: Project[];
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  return (
    <section id="projects" className="space-y-4">
      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <FolderGit2 className="h-5 w-5 text-sky-400" /> Projects
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{project.title}</CardTitle>
                  {project.role && <CardDescription>{project.role}</CardDescription>}
                </div>
                <div className="flex gap-2">
                  {project.repo_url && (
                    <a
                      href={project.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${project.title} repository`}
                      className="text-slate-400 hover:text-slate-100"
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
                      className="text-slate-400 hover:text-slate-100"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-300">{project.summary}</p>
              {project.highlights.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-400">
                  {project.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-1.5">
                {project.tech_tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
