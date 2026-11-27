import { useState } from 'react';
import { ArrowRight, Calendar, Check, Code2, Copy, Download, FileText, Globe } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { useTranslations } from '@/i18n/translations';
import { portfolioApi, type Profile } from '@/lib/api';
import { cn } from '@/lib/utils';

interface RecruiterFooterCtaProps {
  readonly profile: Profile;
}

export const RecruiterFooterCta = ({ profile }: RecruiterFooterCtaProps) => {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const { pathname } = useLocation();
  const showBanner = pathname !== '/contact';

  const handleCopyEmail = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(profile.email);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <footer className="no-print mt-16 border-t border-outline-variant/25 bg-surface-lowest/90 dark:bg-surface-lowest">
      {showBanner && (
        <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-12">
          <section
            data-testid="recruiter-footer-cta-banner"
            className="relative overflow-hidden rounded-3xl border border-primary/20 bg-surface-lowest p-6 shadow-xl sm:p-8 lg:p-12 dark:bg-surface-container"
          >
            <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute top-0 left-0 h-full w-1.5 bg-primary" aria-hidden="true" />

            <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="space-y-3 lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-md bg-primary-container/25 px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-on-primary-container dark:bg-primary/20 dark:text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{t.footer.fastTrackBadge}</span>
                </div>
                <h2 className="heading-h2 font-bold text-on-surface">{t.footer.heading}</h2>
                <p className="max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                  {profile.bio}
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:col-span-5">
                <a
                  href={portfolioApi.getCvPdfUrl()}
                  download="lazy-guy-resume.pdf"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'w-full justify-between px-4 text-xs uppercase tracking-wider'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4" />
                    <span>{t.footer.downloadResumeCta}</span>
                  </span>
                  <Download className="h-4 w-4" />
                </a>

                <Link
                  to="/contact"
                  className={cn(
                    buttonVariants({ variant: 'secondary', size: 'lg' }),
                    'w-full justify-between px-4 text-xs'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{t.footer.openContactCta}</span>
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handleCopyEmail}
                  className="w-full justify-between px-4 text-xs"
                >
                  <span className="flex items-center gap-2.5 font-mono">
                    {copied ? (
                      <Check className="h-4 w-4 text-status-ok" />
                    ) : (
                      <Copy className="h-4 w-4 text-tertiary" />
                    )}
                    <span>{profile.email}</span>
                  </span>
                  <span
                    className={cn('font-mono text-[11px]', copied ? 'text-status-ok' : 'text-primary')}
                  >
                    {copied ? t.footer.copiedToClipboard : t.footer.clickToCopy}
                  </span>
                </Button>
                {copied && (
                  <span role="status" className="sr-only">
                    {t.footer.emailCopiedSr}
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-xs text-on-surface-variant sm:px-6 md:flex-row lg:px-12">
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-4 sm:text-left">
          <div className="flex items-center gap-2 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-ok-dot opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-status-ok-dot" />
            </span>
            <span>{profile.location || t.about.remote}</span>
          </div>
          <span className="hidden text-outline sm:inline" aria-hidden="true">
            •
          </span>
          <p className="font-label">{profile.full_name} · Electric Cobalt Studio</p>
        </div>

        <div className="flex flex-wrap items-center gap-5 font-label font-medium">
          {profile.github_url && (
            <a
              href={profile.github_url}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-1.5 rounded hover:text-primary transition-colors"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
          )}
          {profile.linkedin_url && (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-1.5 rounded hover:text-primary transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>LinkedIn</span>
            </a>
          )}
          <Link
            to="/contact"
            className="focus-ring inline-flex items-center gap-1.5 rounded hover:text-primary transition-colors"
          >
            <span>{t.footer.contactLink}</span>
          </Link>
        </div>
      </div>
    </footer>
  );
};
