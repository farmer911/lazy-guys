import { ArrowRight, CheckCircle2, Code2, Globe, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { useTranslations } from '@/i18n/translations';
import type { Profile, TechStack } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AboutSectionProps {
  readonly profile: Profile;
  readonly projectsCount: number;
  readonly experiencesCount: number;
  readonly techStacks: readonly TechStack[];
}

const getMonogram = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const AboutSection = ({
  profile,
  projectsCount,
  experiencesCount,
  techStacks,
}: AboutSectionProps) => {
  const t = useTranslations();
  const coreStackNames = techStacks.slice(0, 6).map((item) => item.name);

  return (
    <section id="about" className="relative pt-2">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/3 -z-10 h-72 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex min-w-0 flex-col space-y-6 lg:col-span-7">
          <div className="inline-flex w-fit items-center gap-2.5 rounded-full border border-outline-variant/30 bg-surface-lowest px-3.5 py-1.5 shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-ok-dot opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-ok-dot" />
            </span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-on-surface">
              {profile.availability_text || t.about.openToOpportunities}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="heading-hero font-bold text-on-surface">{profile.full_name}</h1>
            <p className="font-headline text-lg font-semibold text-primary sm:text-xl">
              {profile.headline}
            </p>
            <p className="max-w-2xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
              {profile.bio}
            </p>
            {profile.location && (
              <p className="flex items-center gap-1.5 font-mono text-xs text-on-surface-variant">
                <MapPin className="h-3.5 w-3.5 text-tertiary" />
                <span>{profile.location}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/projects"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'w-full shadow-md shadow-primary/20 sm:w-auto'
              )}
            >
              <span>{t.about.exploreProjects}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'w-full sm:w-auto'
              )}
            >
              <Mail className="h-4 w-4 text-primary" />
              <span>{t.about.quickContact}</span>
            </Link>

            <div className="flex items-center gap-2">
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t.about.githubAria}
                  className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-11 w-11')}
                >
                  <Code2 className="h-4 w-4" />
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t.about.linkedinAria}
                  className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-11 w-11')}
                >
                  <Globe className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {coreStackNames.length > 0 && (
            <div className="flex flex-wrap items-start gap-2.5 pt-2">
              <span className="mt-0.5 shrink-0 rounded bg-secondary-container px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-on-secondary-container">
                {t.about.coreStack}
              </span>
              <p className="font-mono text-xs leading-relaxed text-on-surface-variant">
                {coreStackNames.join(' • ')}
              </p>
            </div>
          )}
        </div>

        <div data-testid="hero-telemetry-card" className="min-w-0 lg:col-span-5">
          <div className="relative rounded-2xl border border-outline-variant/25 bg-surface-lowest p-6 shadow-xl dark:bg-surface-container">
            <div className="mb-5 flex items-center justify-between border-b border-surface-container pb-4 dark:border-outline-variant/40">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-error-container/80" />
                <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                <span className="h-3 w-3 rounded-full bg-status-ok-dot/80" />
                <span className="ml-2 font-mono text-xs font-medium text-on-surface-variant">
                  engineer_profile.ts
                </span>
              </div>
              <span className="rounded bg-surface-low px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                live-db
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary font-headline text-xl font-bold text-on-primary shadow-sm">
                  {getMonogram(profile.full_name)}
                </div>
                <span
                  className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-status-ok-dot text-white ring-2 ring-surface-lowest"
                  title={t.about.dbBackedTitle}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-headline text-lg font-bold text-on-surface">
                  {profile.full_name}
                </h2>
                <p className="line-clamp-1 font-label text-xs font-semibold text-primary">
                  {profile.headline}
                </p>
                {profile.location && (
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-on-surface-variant">
                    <MapPin className="h-3 w-3 text-tertiary" />
                    <span className="truncate">{profile.location}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-surface-low p-3.5">
              <div className="flex flex-col">
                <span className="font-headline text-lg font-bold text-on-surface">
                  {projectsCount}
                </span>
                <span className="font-label text-[10px] leading-tight text-on-surface-variant">
                  {t.about.projectsStat}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-lg font-bold text-primary">
                  {experiencesCount}
                </span>
                <span className="font-label text-[10px] leading-tight text-on-surface-variant">
                  {t.about.rolesStat}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-lg font-bold text-tertiary">
                  {techStacks.length}
                </span>
                <span className="font-label text-[10px] leading-tight text-on-surface-variant">
                  {t.about.skillsStat}
                </span>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl bg-surface-high/55 p-3.5 font-mono text-[11px] leading-relaxed dark:bg-surface-lowest">
              <div className="mb-2 flex items-center justify-between border-b border-outline-variant/25 pb-2 text-[10px] text-on-surface-variant">
                <span>{t.about.tsCleanContract}</span>
                <span className="font-semibold text-primary">{t.about.zodVerified}</span>
              </div>
              <p>
                <span className="font-semibold text-secondary">const</span>{' '}
                <span className="font-bold text-primary">engineer</span> = {'{'}
              </p>
              <p className="pl-3">
                <span className="text-on-surface-variant">name:</span>{' '}
                <span className="text-tertiary">&apos;{profile.full_name}&apos;</span>,
              </p>
              <p className="pl-3">
                <span className="text-on-surface-variant">location:</span>{' '}
                <span className="text-tertiary">
                  &apos;{profile.location || t.about.remote}&apos;
                </span>
                ,
              </p>
              <p className="pl-3">
                <span className="text-on-surface-variant">contact:</span>{' '}
                <span className="text-primary">&apos;{profile.email}&apos;</span>,
              </p>
              <p>{'}'}</p>
            </div>

            <div className="mt-4 flex items-center justify-between pt-1 text-[11px] text-on-surface-variant">
              <span className="truncate font-mono">{profile.email}</span>
              <Link
                to="/experience"
                className="focus-ring shrink-0 font-mono text-xs font-semibold text-primary hover:underline"
              >
                {t.about.experienceAndCvCta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
