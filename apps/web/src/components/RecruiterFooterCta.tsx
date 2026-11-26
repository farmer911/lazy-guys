import { useState } from 'react';
import { Calendar, Check, Code2, Copy, Download, Globe } from 'lucide-react';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { portfolioApi, type Profile } from '@/lib/api';

interface RecruiterFooterCtaProps {
  readonly profile: Profile;
}

export const RecruiterFooterCta = ({ profile }: RecruiterFooterCtaProps) => {
  const [copied, setCopied] = useState(false);

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
    <footer className="no-print border-t border-subtle bg-surface/60">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="surface-card flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-cobalt">
              Recruiter Fast-Track
            </p>
            <h2 className="heading-h2 font-semibold text-ink">
              Need a Senior Full-Stack Engineer who ships with zero-error rigor?
            </h2>
            <p className="text-sm text-ink-muted">
              Download the generated PDF resume, copy direct email, or book a 20-minute intro screen.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <a
              href={portfolioApi.getCvPdfUrl()}
              download="lazy-guy-resume.pdf"
              className={buttonVariants({ size: 'default' })}
            >
              <Download className="h-4 w-4" />
              <span>Download CV (PDF)</span>
            </a>
            <Link to="/contact" className={buttonVariants({ variant: 'outline', size: 'default' })}>
              <Calendar className="h-4 w-4" />
              <span>Schedule Call</span>
            </Link>
            <Button type="button" variant="secondary" onClick={handleCopyEmail}>
              {copied ? <Check className="h-4 w-4 text-status-ok" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied!' : profile.email}</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-ink-muted">
          <p className="font-mono">
            {profile.full_name} · Electric Cobalt Studio · PostgreSQL + Express + React 19
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {copied && (
              <span role="status" className="text-status-ok">
                Email copied to clipboard
              </span>
            )}
            {profile.github_url && (
              <a
                href={profile.github_url}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex items-center gap-1 rounded hover:text-ink"
              >
                <Code2 className="h-3.5 w-3.5" /> GitHub
              </a>
            )}
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex items-center gap-1 rounded hover:text-ink"
              >
                <Globe className="h-3.5 w-3.5" /> LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
