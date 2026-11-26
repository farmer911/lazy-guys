import { useState } from 'react';
import { Calendar, Check, Copy, HelpCircle } from 'lucide-react';
import { ContactForm } from '@/components/ContactForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Profile } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ContactPageProps {
  readonly profile: Profile;
}

const ICT_SLOTS = [
  'Tomorrow · 09:30 AM ICT (UTC+7)',
  'Thursday · 02:00 PM ICT (UTC+7)',
  'Friday · 10:00 AM ICT (UTC+7)',
] as const;

const FAQ_ITEMS = [
  {
    q: 'What timezone and notice period?',
    a: 'Based in Ho Chi Minh City (UTC+7), overlapping smoothly with APAC, EU mornings, and US evenings; 2–4 weeks notice.',
  },
  {
    q: 'Can we attach a JD link or PDF?',
    a: 'Yes — attach either a public JD URL or a PDF up to 5 MB directly inside the inquiry form; submissions are timestamped by UTC calendar date.',
  },
] as const;

export const ContactPage = ({ profile }: ContactPageProps) => {
  const [selectedSlot, setSelectedSlot] = useState('');
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
    <div className="space-y-10">
      <header className="space-y-2">
        <Badge variant="emerald">
          <span className="h-2 w-2 rounded-full bg-status-ok" aria-hidden="true" />
          <span>{profile.availability_text || 'Open to Senior / Staff Roles'}</span>
        </Badge>
        <h1 className="heading-h1 font-bold text-ink">
          Let&apos;s Build Something Resilient Together.
        </h1>
        <p className="max-w-2xl text-sm text-ink-secondary">
          Pick a fast 20-minute intro slot or submit your role brief with a JD link or PDF attachment.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-cobalt" />
                <span>Live Availability Slots</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ICT_SLOTS.map((slot) => {
                const active = selectedSlot === slot;
                return (
                  <Button
                    key={slot}
                    type="button"
                    aria-pressed={active}
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSlot(active ? '' : slot)}
                    className={cn('w-full justify-between text-left')}
                  >
                    <span>{slot}</span>
                    <span className="font-mono text-[11px]">{active ? 'Selected' : 'Select'}</span>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Direct Verified Channel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-subtle bg-surface-subtle/60 px-3 py-2 text-xs">
                <span className="font-mono text-ink">{profile.email}</span>
                <Button type="button" size="sm" variant="ghost" onClick={handleCopy}>
                  {copiedEmail ? (
                    <Check className="h-3.5 w-3.5 text-status-ok" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-4 w-4 text-cobalt" />
                <span>Fast Recruiter FAQ</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} className="space-y-1">
                  <p className="font-semibold text-ink">{item.q}</p>
                  <p className="leading-relaxed text-ink-muted">{item.a}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        <ContactForm preferredSlot={selectedSlot} onSlotChange={setSelectedSlot} />
      </div>
    </div>
  );
};
