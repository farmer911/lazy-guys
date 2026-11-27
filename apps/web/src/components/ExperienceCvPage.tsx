import { useState } from 'react';
import {
  Briefcase,
  Check,
  Copy,
  Download,
  FileText,
  FlaskConical,
  Gauge,
  MapPin,
  Printer,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { ExperienceSection } from '@/components/ExperienceSection';
import { TechStackSection } from '@/components/TechStackSection';
import { Button, buttonVariants } from '@/components/ui/button';
import { useTranslations } from '@/i18n/translations';
import { portfolioApi, type Experience, type Profile, type TechStack } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ExperienceCvPageProps {
  readonly profile: Profile;
  readonly experiences: readonly Experience[];
  readonly techStacks: readonly TechStack[];
  readonly isExperiencesLoading: boolean;
  readonly isTechStacksLoading: boolean;
}

const PHILOSOPHY_ICONS = [FlaskConical, Gauge, Rocket] as const;

export const ExperienceCvPage = ({
  profile,
  experiences,
  techStacks,
  isExperiencesLoading,
  isTechStacksLoading,
}: ExperienceCvPageProps) => {
  const t = useTranslations();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(profile.email);
      }
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      setCopiedEmail(false);
    }
  };

  return (
    <div className="space-y-12">
      <section className="space-y-6 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-md bg-surface-container px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              {t.experience.heroBadge}
            </span>
          </div>
          {profile.availability_text && (
            <div className="inline-flex items-center gap-2 rounded-md bg-surface-lowest px-3 py-1 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-status-ok-dot animate-pulse" />
              <span className="font-label text-xs font-semibold text-on-surface">
                {profile.availability_text}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <h1 className="heading-hero font-bold text-on-surface">{t.experience.heroTitle}</h1>
            <p className="max-w-2xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
              {profile.full_name} — {profile.headline}
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <div className="flex items-center gap-2 rounded-lg bg-surface-lowest px-3 py-2 shadow-xs">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="font-label text-xs font-semibold text-on-surface">
                  {t.experience.careerRolesCount(experiences.length)}
                </span>
              </div>
              {profile.location && (
                <div className="flex items-center gap-2 rounded-lg bg-surface-lowest px-3 py-2 shadow-xs">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-label text-xs font-semibold text-on-surface">
                    {profile.location}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-lg bg-surface-lowest px-3 py-2 shadow-xs">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="font-label text-xs font-semibold text-on-surface">
                  {t.experience.verifiedSkillsCount(techStacks.length)}
                </span>
              </div>
            </div>
          </div>

          <div
            data-testid="cv-fast-action-card"
            className="surface-card flex flex-col gap-4 p-6 shadow-md lg:col-span-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {t.experience.fastEvalEyebrow}
                </span>
                <h2 className="mt-0.5 font-headline text-xl font-bold text-on-surface">
                  {t.experience.cvCardTitle}
                </h2>
                <p className="mt-1 text-xs text-on-surface-variant">{t.experience.cvCardDesc}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-low text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </div>

            <div className="no-print flex flex-col gap-2.5 pt-1">
              <a
                href={portfolioApi.getCvPdfUrl()}
                download="lazy-guy-resume.pdf"
                className={cn(buttonVariants({ size: 'lg' }), 'w-full justify-center text-xs')}
              >
                <Download className="h-4 w-4" />
                <span>{t.experience.downloadPdfResume}</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 text-primary" />
                  <span>{t.experience.printCv}</span>
                </Button>
                <Button type="button" variant="secondary" onClick={handleCopyEmail}>
                  {copiedEmail ? (
                    <Check className="h-4 w-4 text-status-ok" />
                  ) : (
                    <Copy className="h-4 w-4 text-primary" />
                  )}
                  <span>{copiedEmail ? t.experience.copied : t.experience.copyEmail}</span>
                </Button>
              </div>
              {copiedEmail && (
                <span role="status" className="text-center font-mono text-xs text-status-ok">
                  {t.experience.emailCopiedStatus(profile.email)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="rounded bg-surface-container px-2.5 py-1 font-mono text-xs font-bold text-primary">
                01
              </span>
              <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-on-surface sm:text-xl">
                {t.experience.sec1Title}
              </h2>
            </div>
            <span className="font-mono text-xs font-medium text-on-surface-variant">
              {t.experience.rolesCountBadge(experiences.length)}
            </span>
          </div>

          <ExperienceSection experiences={experiences} isLoading={isExperiencesLoading} />
        </section>

        <section className="space-y-6 lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="rounded bg-surface-container px-2.5 py-1 font-mono text-xs font-bold text-primary">
                02
              </span>
              <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-on-surface sm:text-xl">
                {t.experience.sec2Title}
              </h2>
            </div>
            <span className="font-mono text-xs font-medium text-on-surface-variant">
              {t.experience.filterableBadge}
            </span>
          </div>

          <TechStackSection techStacks={techStacks} isLoading={isTechStacksLoading} />
        </section>
      </div>

      <section className="space-y-6 pt-2">
        <div className="flex items-center gap-3">
          <span className="rounded bg-surface-container px-2.5 py-1 font-mono text-xs font-bold text-primary">
            03
          </span>
          <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-on-surface sm:text-xl">
            {t.experience.sec3Title}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {t.experience.philosophy.map((item, idx) => {
            const Icon = PHILOSOPHY_ICONS[idx % PHILOSOPHY_ICONS.length];
            return (
              <div
                key={item.title}
                className="surface-card flex flex-col gap-3 p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-low text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-headline text-base font-bold text-on-surface">{item.title}</h3>
                <p className="text-xs leading-relaxed text-on-surface-variant">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
