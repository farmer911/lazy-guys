import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Link2, Send, Upload, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  ContactSubmissionSchema,
  MAX_JD_PDF_BYTES,
  type ContactSubmissionInput,
  type EngagementType,
  type JdPdfAttachmentInput,
} from '@contracts/portfolio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { portfolioApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type JdMode = 'none' | 'link' | 'pdf';

interface ContactFormProps {
  readonly preferredSlot?: string;
  readonly onSlotChange?: (slot: string) => void;
}

const ENGAGEMENT_OPTIONS: ReadonlyArray<{
  readonly value: EngagementType;
  readonly label: string;
  readonly sub: string;
}> = [
  { value: 'full_time', label: 'Full-Time IC', sub: 'Senior / Staff Role' },
  { value: 'fractional', label: 'Fractional / Lead', sub: 'Part-Time Architecture' },
  { value: 'arch_audit', label: 'Arch Audit', sub: 'Sprint Performance Review' },
];

const COMP_TIERS = [
  '$140,000 - $185,000+ USD (Senior / Staff)',
  '$185,000 - $220,000+ USD (Principal / Staff IC)',
  'Advisory Retainer / Fractional ($120 - $160/hr)',
  'Open — Let us discuss scope & equity',
] as const;

const uint8ToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

export const ContactForm = ({ preferredSlot, onSlotChange }: ContactFormProps) => {
  const [submittedInfo, setSubmittedInfo] = useState<{
    submittedDate?: string;
    jdType?: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [jdMode, setJdMode] = useState<JdMode>('none');
  const [jdPdf, setJdPdf] = useState<JdPdfAttachmentInput | undefined>(undefined);
  const [jdFileError, setJdFileError] = useState<string | null>(null);
  const [localSlot, setLocalSlot] = useState(preferredSlot ?? '');
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : undefined
  );

  const effectiveSlot = onSlotChange ? (preferredSlot ?? '') : localSlot;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactSubmissionInput>({
    resolver: zodResolver(ContactSubmissionSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
      company: '',
      engagementType: 'full_time',
      compTier: '',
      preferredSlot: preferredSlot ?? '',
      jdUrl: '',
    },
  });

  const selectedEngagement = watch('engagementType') ?? 'full_time';

  const handleCompositionEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) {
      event.preventDefault();
    }
  };

  const switchJdMode = (nextMode: JdMode) => {
    setJdMode(nextMode);
    setJdFileError(null);
    if (nextMode !== 'link') {
      setValue('jdUrl', '');
    }
    if (nextMode !== 'pdf') {
      setJdPdf(undefined);
    }
  };

  const handlePdfUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    setJdFileError(null);
    const file = event.target.files?.[0];
    if (!file) {
      setJdPdf(undefined);
      return;
    }
    if (file.size === 0 || file.size > MAX_JD_PDF_BYTES) {
      setJdPdf(undefined);
      setJdFileError('Please select a valid PDF file up to 5 MB.');
      return;
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    const header = String.fromCharCode(...buffer.subarray(0, 5));
    if (file.type !== 'application/pdf' || header !== '%PDF-') {
      setJdPdf(undefined);
      setJdFileError('Only valid PDF files (%PDF-) are accepted.');
      return;
    }
    setJdPdf({
      fileName: file.name,
      mimeType: 'application/pdf',
      contentBase64: uint8ToBase64(buffer),
    });
  };

  const onSubmit = async (values: ContactSubmissionInput) => {
    if (jdMode === 'pdf' && jdFileError) return;
    if (jdMode === 'pdf' && !jdPdf) {
      setJdFileError('Please select a valid PDF file or switch JD mode.');
      return;
    }
    setSubmittedInfo(null);
    setSubmitError(null);

    const payload: ContactSubmissionInput = {
      ...values,
      idempotencyKey,
      preferredSlot: effectiveSlot.trim() || undefined,
      jdUrl: jdMode === 'link' ? values.jdUrl?.trim() || undefined : undefined,
      jdPdf: jdMode === 'pdf' ? jdPdf : undefined,
    };

    try {
      const ack = await portfolioApi.sendContact(payload);
      setSubmittedInfo({
        submittedDate: ack.submittedDate,
        jdType: ack.jdType,
      });
      reset({
        name: '',
        email: '',
        message: '',
        company: '',
        engagementType: 'full_time',
        compTier: '',
        preferredSlot: '',
        jdUrl: '',
      });
      setJdPdf(undefined);
      setJdMode('none');
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        setIdempotencyKey(crypto.randomUUID());
      }
      if (onSlotChange) onSlotChange('');
      else setLocalSlot('');
    } catch {
      setSubmitError('Failed to send message. Please try again.');
    }
  };

  const onInvalid = () => {
    setSubmittedInfo(null);
    setSubmitError(null);
  };

  return (
    <section id="contact">
      <Card>
        <CardHeader>
          <CardTitle>Recruiter Quick Contact</CardTitle>
          <CardDescription>
            Send a direct role brief, interview slot, or attach a JD via link or PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            onKeyDown={handleCompositionEnter}
            className="space-y-5"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-xs font-semibold text-ink">
                  <label htmlFor="contact-name">Name</label>
                  <span aria-hidden="true" className="text-status-err">
                    *
                  </span>
                </div>
                <input
                  id="contact-name"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                  {...register('name')}
                  placeholder="Your name"
                  className="input-control focus-visible:ring-2 focus-visible:ring-cobalt/35"
                />
                {errors.name && (
                  <p id="contact-name-error" role="alert" className="text-xs text-status-err">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-xs font-semibold text-ink">
                  <label htmlFor="contact-email">Email</label>
                  <span aria-hidden="true" className="text-status-err">
                    *
                  </span>
                </div>
                <input
                  id="contact-email"
                  type="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                  {...register('email')}
                  placeholder="recruiter@company.com"
                  className="input-control focus-visible:ring-2 focus-visible:ring-cobalt/35"
                />
                {errors.email && (
                  <p id="contact-email-error" role="alert" className="text-xs text-status-err">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="contact-company" className="block text-xs font-semibold text-ink">
                  Company / Organization
                </label>
                <input
                  id="contact-company"
                  {...register('company')}
                  placeholder="e.g. Acme FinTech"
                  className="input-control"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-slot" className="block text-xs font-semibold text-ink">
                  Preferred Slot
                </label>
                <input
                  id="contact-slot"
                  value={effectiveSlot}
                  onChange={(e) => {
                    if (onSlotChange) onSlotChange(e.target.value);
                    else setLocalSlot(e.target.value);
                  }}
                  placeholder="Select an ICT slot or type availability"
                  className="input-control"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-ink">Engagement Type</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {ENGAGEMENT_OPTIONS.map((opt) => {
                  const active = selectedEngagement === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={cn(
                        'focus-within:ring-2 focus-within:ring-cobalt flex cursor-pointer flex-col rounded-xl border p-3 transition-colors',
                        active
                          ? 'border-cobalt bg-cobalt-tint text-ink'
                          : 'border-subtle bg-surface-subtle/60 text-ink-secondary hover:bg-surface-subtle'
                      )}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register('engagementType')}
                        className="sr-only"
                      />
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span className="text-[11px] text-ink-muted">{opt.sub}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-comp" className="block text-xs font-semibold text-ink">
                Compensation / Level Tier
              </label>
              <select id="contact-comp" {...register('compTier')} className="input-control">
                <option value="">Select compensation tier (optional)</option>
                {COMP_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 rounded-xl border border-subtle bg-surface-subtle/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink">
                  Attach Job Description (Link or PDF, Optional)
                </span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="JD attachment mode">
                  <Button
                    type="button"
                    size="sm"
                    aria-pressed={jdMode === 'none'}
                    variant={jdMode === 'none' ? 'default' : 'outline'}
                    onClick={() => switchJdMode('none')}
                  >
                    None
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    aria-pressed={jdMode === 'link'}
                    variant={jdMode === 'link' ? 'default' : 'outline'}
                    onClick={() => switchJdMode('link')}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    <span>JD Link</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    aria-pressed={jdMode === 'pdf'}
                    variant={jdMode === 'pdf' ? 'default' : 'outline'}
                    onClick={() => switchJdMode('pdf')}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload PDF</span>
                  </Button>
                </div>
              </div>

              {jdMode === 'link' && (
                <div className="space-y-1 pt-1">
                  <label htmlFor="contact-jd-url" className="block text-xs font-medium text-ink-secondary">
                    JD URL
                  </label>
                  <input
                    id="contact-jd-url"
                    type="url"
                    aria-invalid={Boolean(errors.jdUrl)}
                    aria-describedby={errors.jdUrl ? 'contact-jd-url-error' : undefined}
                    {...register('jdUrl')}
                    placeholder="https://boards.greenhouse.io/company/jobs/123"
                    className="input-control"
                  />
                  {errors.jdUrl && (
                    <p id="contact-jd-url-error" role="alert" className="text-xs text-status-err">
                      {errors.jdUrl.message}
                    </p>
                  )}
                </div>
              )}

              {jdMode === 'pdf' && (
                <div className="space-y-2 pt-1">
                  <label htmlFor="contact-jd-pdf" className="block text-xs font-medium text-ink-secondary">
                    Upload JD PDF (max 5 MB)
                  </label>
                  <input
                    id="contact-jd-pdf"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handlePdfUpload}
                    className="input-control file:mr-3 file:rounded-lg file:border-0 file:bg-cobalt-tint file:px-3 file:py-1 file:text-xs file:font-medium file:text-cobalt"
                  />
                  {jdPdf && (
                    <div className="flex items-center justify-between rounded-lg border border-subtle bg-surface px-3 py-2 text-xs text-ink">
                      <span className="flex items-center gap-2 font-mono">
                        <FileText className="h-3.5 w-3.5 text-cobalt" />
                        {jdPdf.fileName}
                      </span>
                      <button
                        type="button"
                        aria-label="Remove PDF"
                        onClick={() => setJdPdf(undefined)}
                        className="focus-ring rounded p-1 text-ink-muted hover:text-ink"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {jdFileError && (
                    <p role="alert" className="text-xs text-status-err">
                      {jdFileError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-xs font-semibold text-ink">
                <label htmlFor="contact-message">Message</label>
                <span aria-hidden="true" className="text-status-err">
                  *
                </span>
              </div>
              <textarea
                id="contact-message"
                rows={3}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                {...register('message')}
                placeholder="Role details or interview availability..."
                className="input-control focus-visible:ring-2 focus-visible:ring-cobalt/35"
              />
              {errors.message && (
                <p id="contact-message-error" role="alert" className="text-xs text-status-err">
                  {errors.message.message}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
              </Button>
              {submittedInfo && (
                <span role="status" className="text-sm font-medium text-status-ok">
                  Message sent. Thank you!
                  {submittedInfo.submittedDate ? ` (${submittedInfo.submittedDate})` : ''}
                </span>
              )}
              {submitError && (
                <p role="alert" className="text-sm text-status-err">
                  {submitError}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};
