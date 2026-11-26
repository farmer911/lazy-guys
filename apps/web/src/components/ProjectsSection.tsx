import { ArrowRight, FolderGit2 } from 'lucide-react';
import { Link } from 'react-router';
import { ProjectBentoCard } from '@/components/ProjectBentoCard';
import { SectionHeader } from '@/components/SectionHeader';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Project } from '@/lib/api';

interface ProjectsSectionProps {
  readonly projects: readonly Project[];
  readonly isLoading?: boolean;
  readonly showViewAllLink?: boolean;
}

export const ProjectsSection = ({
  projects,
  isLoading = false,
  showViewAllLink = false,
}: ProjectsSectionProps) => (
  <section id="projects" className="space-y-5">
    <SectionHeader
      eyebrow="Flagship Systems"
      title="Projects"
      icon={<FolderGit2 className="h-5 w-5 text-cobalt" />}
      action={
        showViewAllLink ? (
          <Link to="/projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <span>View All Projects</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : undefined
      }
    />

    {isLoading ? (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading projects">
        <Skeleton className="h-60 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    ) : projects.length === 0 ? (
      <Card>
        <CardContent className="pt-6 text-sm text-ink-muted">
          No projects match the current filter.
        </CardContent>
      </Card>
    ) : (
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <ProjectBentoCard key={project.id} project={project} />
        ))}
      </div>
    )}
  </section>
);
