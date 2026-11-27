import { useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileText,
  Globe,
  HelpCircle,
  Mail,
  MapPin,
  Radio,
} from 'lucide-react';
import { ContactForm } from '@/components/ContactForm';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n/translations';
import { portfolioApi, type Profile } from '@/lib/api';

interface ContactPageProps {
  readonly profile: Profile;
}

export const ContactPage = ({ profile }: ContactPageProps) => {
  const t = useTranslations();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopy = async () => {
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
      <header className="space-y-6 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-low px-3 py-1 font-mono text-xs font-medium text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>{t.contactPage.heroBadge}</span>
          </span>
          {profile.availability_text && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 font-label text-xs font-semibold text-on-surface">
              <span className="h-1.5 w-1.5 rounded-full bg-status-ok-dot" />
              <span>{profile.availability_text}</span>
            </span>
          )}
        </div>

        <div className="max-w-4xl space-y-3">
          <h1 className="heading-hero font-bold text-on-surface">{t.contactPage.heroTitle}</h1>
          <p className="max-w-3xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
            {t.contactPage.heroDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl bg-surface-low p-2 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-surface-lowest px-4 py-3 shadow-xs">
            <Mail className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <span className="block font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                {t.contactPage.directInbox}
              </span>
              <span className="block truncate font-label text-xs font-semibold text-on-surface">
                {profile.email}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-surface-lowest px-4 py-3 shadow-xs">
            <MapPin className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <span className="block font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                {t.contactPage.location}
              </span>
              <span className="block truncate font-label text-xs font-semibold text-on-surface">
                {profile.location || t.about.remote}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-surface-lowest px-4 py-3 shadow-xs">
            <Radio className="h-5 w-5 shrink-0 text-status-ok" />
            <div className="min-w-0">
              <span className="block font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                {t.contactPage.availability}
              </span>
              <span className="block truncate font-label text-xs font-semibold text-on-surface">
                {profile.availability_text || t.contactPage.openToInquiries}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <aside className="space-y-6 lg:col-span-5">
          {profile.calendar_url && (
            <div className="surface-card space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h2 className="font-headline text-sm font-bold uppercase tracking-tight text-on-surface">
                    {t.contactPage.calendarTitle}
                  </h2>
                </div>
                <span className="rounded-full bg-surface-container px-2 py-0.5 font-mono text-[11px] font-medium text-on-surface">
                  {t.contactPage.externalBadge}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-on-surface-variant">
                {t.contactPage.calendarDesc}
              </p>
              <a
                href={profile.calendar_url}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex items-center gap-1.5 rounded font-label text-xs font-semibold text-primary hover:text-primary-dim"
              >
                <span>{t.contactPage.openCalendar}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          <div data-testid="direct-verified-channels" className="surface-card space-y-4 p-6">
            <h2 className="font-headline text-sm font-bold uppercase tracking-tight text-on-surface">
              {t.contactPage.verifiedChannelsTitle}
            </h2>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-low p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-high text-primary">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <span className="block font-mono text-[10px] uppercase text-on-surface-variant">
                      {t.contactPage.primaryInbox}
                    </span>
                    <span className="block truncate font-mono text-xs font-medium text-on-surface">
                      {profile.email}
                    </span>
                  </div>
                </div>
                <Button type="button" size="sm" variant="subtle" onClick={handleCopy}>
                  {copiedEmail ? (
                    <Check className="h-3.5 w-3.5 text-status-ok" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedEmail ? t.contactPage.copied : t.contactPage.copy}</span>
                </Button>
              </div>
              {copiedEmail && (
                <span role="status" className="block font-mono text-xs text-status-ok">
                  {t.contactPage.emailCopied}
                </span>
              )}

              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring group flex items-center justify-between rounded-xl bg-surface-low p-3 hover:bg-surface-container transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-high text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <Code2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <span className="block font-mono text-[10px] uppercase text-on-surface-variant">
                        GitHub
                      </span>
                      <span className="block truncate font-mono text-xs font-medium text-on-surface">
                        {profile.github_url}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-on-surface-variant group-hover:text-primary" />
                </a>
              )}

              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring group flex items-center justify-between rounded-xl bg-surface-low p-3 hover:bg-surface-container transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-high text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <Globe className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <span className="block font-mono text-[10px] uppercase text-on-surface-variant">
                        LinkedIn
                      </span>
                      <span className="block truncate font-mono text-xs font-medium text-on-surface">
                        {profile.linkedin_url}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-on-surface-variant group-hover:text-primary" />
                </a>
              )}

              <a
                href={portfolioApi.getCvPdfUrl()}
                download="lazy-guy-resume.pdf"
                className="focus-ring group flex items-center justify-between rounded-xl bg-surface-low p-3 hover:bg-surface-container transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-high text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <span className="block font-mono text-[10px] uppercase text-on-surface-variant">
                      {t.contactPage.officialResume}
                    </span>
                    <span className="block truncate font-mono text-xs font-medium text-on-surface">
                      lazy-guy-resume.pdf
                    </span>
                  </div>
                </div>
                <Download className="h-4 w-4 shrink-0 text-on-surface-variant group-hover:text-primary" />
              </a>
            </div>
          </div>

          <div data-testid="contact-faq-accordion" className="surface-card space-y-4 p-6">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <h2 className="font-headline text-sm font-bold uppercase tracking-tight text-on-surface">
                {t.contactPage.faqTitle}
              </h2>
            </div>

            <div className="space-y-2.5">
              {t.contactPage.faqs.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl bg-surface-low p-3.5 transition-all"
                >
                  <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-2 rounded font-label text-xs font-semibold text-on-surface">
                    <span>{item.q}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2.5 text-xs leading-relaxed text-on-surface-variant">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-7">
          <ContactForm />
        </div>
      </div>
    </div>
  );
};
