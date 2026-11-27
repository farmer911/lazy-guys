import { ProjectBentoCard } from '@/components/ProjectBentoCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n/translations';
import type { Project } from '@/lib/api';

interface ProjectsSectionProps {
  readonly projects: readonly Project[];
  readonly isLoading?: boolean;
  readonly onResetFilter?: () => void;
}

export const ProjectsSection = ({
  projects,
  isLoading = false,
  onResetFilter,
}: ProjectsSectionProps) => {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div
        className="grid gap-6 md:grid-cols-2"
        aria-busy="true"
        aria-label={t.projectsPage.loadingProjectsAria}
      >
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-on-surface-variant">
          <span>{t.projectsPage.noFilterMatch}</span>
          {onResetFilter && (
            <Button type="button" variant="outline" size="sm" onClick={onResetFilter}>
              {t.projectsPage.showAllProjects}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {projects.map((project) => (
        <ProjectBentoCard key={project.id} project={project} />
      ))}
    </div>
  );
};
