import { Award, Code2, Download, Globe, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { portfolioApi, type Profile } from '@/lib/api';

interface AboutSectionProps {
  readonly profile: Profile;
}

export const AboutSection = ({ profile }: AboutSectionProps) => (
  <section id="about" className="space-y-6">
    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div className="space-y-3">
        <Badge variant="emerald">
          <span className="h-2 w-2 rounded-full bg-status-ok" aria-hidden="true" />
          <span>{profile.availability_text || 'Open to Opportunities'}</span>
        </Badge>
        <h1 className="heading-hero font-bold text-ink">{profile.full_name}</h1>
        <p className="text-lg font-medium text-cobalt">{profile.headline}</p>
        <p className="max-w-2xl text-base leading-relaxed text-ink-secondary">{profile.bio}</p>
        {profile.location && (
          <p className="flex items-center gap-1.5 text-sm text-ink-muted">
            <MapPin className="h-4 w-4 text-cobalt" />
            <span>{profile.location}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {profile.github_url && (
          <a
            href={profile.github_url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Code2 className="h-4 w-4" />
            <span>GitHub</span>
          </a>
        )}
        {profile.linkedin_url && (
          <a
            href={profile.linkedin_url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Globe className="h-4 w-4" />
            <span>LinkedIn</span>
          </a>
        )}
        <a
          href={portfolioApi.getCvPdfUrl()}
          download="lazy-guy-resume.pdf"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Download className="h-4 w-4" />
          <span>CV (PDF)</span>
        </a>
        <Link to="/contact" className={buttonVariants({ size: 'sm' })}>
          <Mail className="h-4 w-4" />
          <span>Contact</span>
        </Link>
      </div>
    </div>

    {profile.achievements.length > 0 && (
      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <Award className="h-4 w-4 text-cobalt" /> Key Achievements
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profile.achievements.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-subtle bg-surface-subtle/60 p-3.5 text-sm leading-relaxed text-ink-secondary"
              >
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )}
  </section>
);
