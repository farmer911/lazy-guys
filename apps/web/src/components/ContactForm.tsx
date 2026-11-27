import { useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, CloudUpload, FileText, Link2, Lock, Send, Upload, X } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import {
  ContactSubmissionSchema,
  MAX_JD_PDF_BYTES,
  type ContactSubmissionInput,
  type EngagementType,
  type JdPdfAttachmentInput,
} from '@contracts/portfolio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations, type Translations } from '@/i18n/translations';
import { portfolioApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type JdMode = 'none' | 'link' | 'pdf';
type JdFileErrorKey = 'pdfSize' | 'pdfMagic' | 'pdfMissing' | null;

const ENGAGEMENT_VALUES: readonly EngagementType[] = [
  'full_time',
  'fractional',
  'arch_audit',
] as const;

const uint8ToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const translateValidationMessage = (
  rawMessage: string | undefined,
  t: Translations
): string | undefined => {
  if (!rawMessage) return undefined;
  const map: Record<string, string> = {
    'Name is required': t.contactForm.validation.nameRequired,
    'Email is required': t.contactForm.validation.emailRequired,
    'Valid email is required': t.contactForm.validation.emailInvalid,
    'Message is required': t.contactForm.validation.messageRequired,
    'JD URL must start with http:// or https://': t.contactForm.validation.jdUrlProtocol,
    'Valid JD URL is required': t.contactForm.validation.jdUrlInvalid,
    'Provide either a JD link or a PDF file, not both': t.contactForm.validation.jdExclusive,
  };
  return map[rawMessage] ?? rawMessage;
};

export const ContactForm = () => {
  const t = useTranslations();
  const [submittedInfo, setSubmittedInfo] = useState<{
    submittedDate?: string;
    jdType?: string;
  } | null>(null);
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [jdMode, setJdMode] = useState<JdMode>('none');
  const [jdPdf, setJdPdf] = useState<JdPdfAttachmentInput | undefined>(undefined);
  const [jdFileErrorKey, setJdFileErrorKey] = useState<JdFileErrorKey>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : undefined
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
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
      preferredSlot: '',
      jdUrl: '',
    },
  });

  const selectedEngagement = useWatch({ control, name: 'engagementType' }) ?? 'full_time';

  const handleCompositionEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) {
      event.preventDefault();
    }
  };

  const switchJdMode = (nextMode: JdMode) => {
    setJdMode(nextMode);
    setJdFileErrorKey(null);
    if (nextMode !== 'link') {
      setValue('jdUrl', '');
    }
    if (nextMode !== 'pdf') {
      setJdPdf(undefined);
    }
  };

  const processPdfFile = async (file: File | undefined) => {
    setJdFileErrorKey(null);
    if (!file) {
      setJdPdf(undefined);
      return;
    }
    if (file.size === 0 || file.size > MAX_JD_PDF_BYTES) {
      setJdPdf(undefined);
      setJdFileErrorKey('pdfSize');
      return;
    }
    if (file.type && file.type !== 'application/pdf') {
      setJdPdf(undefined);
      setJdFileErrorKey('pdfMagic');
      return;
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    const header = String.fromCharCode(...buffer.subarray(0, 5));
    if (header !== '%PDF-') {
      setJdPdf(undefined);
      setJdFileErrorKey('pdfMagic');
      return;
    }
    setJdPdf({
      fileName: file.name,
      mimeType: 'application/pdf',
      contentBase64: uint8ToBase64(buffer),
    });
  };

  const handlePdfUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    await processPdfFile(event.target.files?.[0]);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await processPdfFile(event.dataTransfer.files?.[0]);
  };

  const onSubmit = async (values: ContactSubmissionInput) => {
    if (jdMode === 'pdf' && jdFileErrorKey) return;
    if (jdMode === 'pdf' && !jdPdf) {
      setJdFileErrorKey('pdfMissing');
      return;
    }
    setSubmittedInfo(null);
    setHasSubmitError(false);

    const payload: ContactSubmissionInput = {
      ...values,
      idempotencyKey,
      preferredSlot: values.preferredSlot?.trim() || undefined,
      compTier: values.compTier?.trim() || undefined,
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
    } catch {
      setHasSubmitError(true);
    }
  };

  const onInvalid = () => {
    setSubmittedInfo(null);
    setHasSubmitError(false);
  };

  const nameErrorText = translateValidationMessage(errors.name?.message, t);
  const emailErrorText = translateValidationMessage(errors.email?.message, t);
  const jdUrlErrorText = translateValidationMessage(errors.jdUrl?.message, t);
  const messageErrorText = translateValidationMessage(errors.message?.message, t);

  return (
    <section id="contact">
      <Card className="shadow-md">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-container px-2.5 py-1 font-mono text-[11px] font-semibold text-on-surface">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{t.contactForm.headerBadge}</span>
            </span>
            <span className="font-mono text-[11px] text-on-surface-variant">
              {t.contactForm.pgPersisted}
            </span>
          </div>
          <CardTitle className="text-xl sm:text-2xl">{t.contactForm.title}</CardTitle>
          <CardDescription>{t.contactForm.description}</CardDescription>
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
                <div className="flex items-center gap-1 font-label text-xs font-semibold text-on-surface">
                  <label htmlFor="contact-name">{t.contactForm.nameLabel}</label>
                  <span aria-hidden="true" className="font-mono text-error">
                    *
                  </span>
                </div>
                <input
                  id="contact-name"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                  {...register('name')}
                  placeholder={t.contactForm.namePlaceholder}
                  className={cn(
                    'input-control focus-visible:ring-2 focus-visible:ring-primary/35',
                    errors.name && 'border-error bg-error-bg focus-visible:ring-error/35'
                  )}
                />
                {nameErrorText && (
                  <p id="contact-name-error" role="alert" className="font-mono text-xs text-error">
                    {nameErrorText}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1 font-label text-xs font-semibold text-on-surface">
                  <label htmlFor="contact-email">{t.contactForm.emailLabel}</label>
                  <span aria-hidden="true" className="font-mono text-error">
                    *
                  </span>
                </div>
                <input
                  id="contact-email"
                  type="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                  {...register('email')}
                  placeholder={t.contactForm.emailPlaceholder}
                  className={cn(
                    'input-control focus-visible:ring-2 focus-visible:ring-primary/35',
                    errors.email && 'border-error bg-error-bg focus-visible:ring-error/35'
                  )}
                />
                {emailErrorText && (
                  <p id="contact-email-error" role="alert" className="font-mono text-xs text-error">
                    {emailErrorText}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="contact-company"
                  className="block font-label text-xs font-semibold text-on-surface"
                >
                  {t.contactForm.companyLabel}
                </label>
                <input
                  id="contact-company"
                  {...register('company')}
                  placeholder={t.contactForm.companyPlaceholder}
                  className="input-control"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="contact-slot"
                  className="block font-label text-xs font-semibold text-on-surface"
                >
                  {t.contactForm.slotLabel}
                </label>
                <input
                  id="contact-slot"
                  {...register('preferredSlot')}
                  placeholder={t.contactForm.slotPlaceholder}
                  className="input-control"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="block font-label text-xs font-semibold text-on-surface">
                {t.contactForm.engagementLabel}
              </span>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {ENGAGEMENT_VALUES.map((val) => {
                  const active = selectedEngagement === val;
                  const opt = t.contactForm.engagementOptions[val];
                  return (
                    <label
                      key={val}
                      className={cn(
                        'focus-within:ring-2 focus-within:ring-primary flex cursor-pointer flex-col rounded-xl border p-3 transition-all select-none',
                        active
                          ? 'border-primary bg-surface-container text-on-surface shadow-xs'
                          : 'border-outline-variant/25 bg-surface-low text-on-surface-variant hover:bg-surface-container/60'
                      )}
                    >
                      <input
                        type="radio"
                        value={val}
                        {...register('engagementType')}
                        className="sr-only"
                      />
                      <span className="flex items-center justify-between font-label text-xs font-semibold">
                        <span>{opt.label}</span>
                        <CheckCircle2
                          className={cn(
                            'h-4 w-4 text-primary transition-opacity',
                            active ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </span>
                      <span className="mt-0.5 text-[11px] text-on-surface-variant">{opt.sub}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="contact-comp"
                className="block font-label text-xs font-semibold text-on-surface"
              >
                {t.contactForm.compLabel}
              </label>
              <input
                id="contact-comp"
                {...register('compTier')}
                placeholder={t.contactForm.compPlaceholder}
                className="input-control"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-outline-variant/25 bg-surface-low/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-label text-xs font-semibold text-on-surface">
                  {t.contactForm.attachJdLabel}
                </span>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label={t.contactForm.jdModeAria}
                >
                  <Button
                    type="button"
                    size="sm"
                    aria-pressed={jdMode === 'none'}
                    variant={jdMode === 'none' ? 'default' : 'outline'}
                    onClick={() => switchJdMode('none')}
                  >
                    {t.contactForm.jdNone}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    aria-pressed={jdMode === 'link'}
                    variant={jdMode === 'link' ? 'default' : 'outline'}
                    onClick={() => switchJdMode('link')}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    <span>{t.contactForm.jdLink}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    aria-pressed={jdMode === 'pdf'}
                    variant={jdMode === 'pdf' ? 'default' : 'outline'}
                    onClick={() => switchJdMode('pdf')}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{t.contactForm.jdUploadPdf}</span>
                  </Button>
                </div>
              </div>

              {jdMode === 'link' && (
                <div className="space-y-1.5 pt-1">
                  <label
                    htmlFor="contact-jd-url"
                    className="block font-label text-xs font-medium text-on-surface-variant"
                  >
                    {t.contactForm.jdUrlLabel}
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
                  {jdUrlErrorText && (
                    <p
                      id="contact-jd-url-error"
                      role="alert"
                      className="font-mono text-xs text-error"
                    >
                      {jdUrlErrorText}
                    </p>
                  )}
                </div>
              )}

              {jdMode === 'pdf' && (
                <div className="space-y-2.5 pt-1">
                  <label
                    htmlFor="contact-jd-pdf"
                    className="block font-label text-xs font-medium text-on-surface-variant"
                  >
                    {t.contactForm.jdPdfLabel}
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                      'rounded-xl border-2 border-dashed p-4 text-center transition-colors',
                      isDragging
                        ? 'border-primary bg-surface-container'
                        : 'border-outline-variant/40 bg-surface-lowest'
                    )}
                  >
                    <CloudUpload className="mx-auto mb-1.5 h-6 w-6 text-primary" />
                    <p className="font-label text-xs font-medium text-on-surface">
                      {t.contactForm.dropzonePrompt}
                    </p>
                    <input
                      id="contact-jd-pdf"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handlePdfUpload}
                      className="input-control mt-3 cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-surface-container file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
                    />
                  </div>
                  {jdPdf && (
                    <div className="flex items-center justify-between rounded-lg border border-outline-variant/30 bg-surface-lowest px-3 py-2 text-xs text-on-surface">
                      <span className="flex items-center gap-2 font-mono">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span>{jdPdf.fileName}</span>
                      </span>
                      <button
                        type="button"
                        aria-label={t.contactForm.removePdfAria}
                        onClick={() => setJdPdf(undefined)}
                        className="focus-ring rounded p-1.5 text-on-surface-variant hover:text-on-surface"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {jdFileErrorKey && (
                    <p role="alert" className="font-mono text-xs text-error">
                      {t.contactForm.errors[jdFileErrorKey]}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1 font-label text-xs font-semibold text-on-surface">
                <label htmlFor="contact-message">{t.contactForm.messageLabel}</label>
                <span aria-hidden="true" className="font-mono text-error">
                  *
                </span>
              </div>
              <textarea
                id="contact-message"
                rows={4}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                {...register('message')}
                placeholder={t.contactForm.messagePlaceholder}
                className={cn(
                  'input-control resize-y focus-visible:ring-2 focus-visible:ring-primary/35',
                  errors.message && 'border-error bg-error-bg focus-visible:ring-error/35'
                )}
              />
              {messageErrorText && (
                <p id="contact-message-error" role="alert" className="font-mono text-xs text-error">
                  {messageErrorText}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="w-full shadow-md"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? t.contactForm.sending : t.contactForm.sendMessage}</span>
            </Button>

            {submittedInfo && (
              <div role="status" className="rounded-xl bg-status-ok-bg p-4 text-xs text-status-ok">
                <p className="font-headline font-bold uppercase tracking-tight">
                  {t.contactForm.sentHeading}
                  {submittedInfo.submittedDate ? ` (${submittedInfo.submittedDate})` : ''}
                </p>
                <p className="mt-1 text-on-surface-variant">
                  {t.contactForm.sentBody(submittedInfo.jdType)}
                </p>
              </div>
            )}

            {hasSubmitError && (
              <div role="alert" className="rounded-xl bg-error-bg p-4 text-xs text-error">
                {t.contactForm.errors.submitFailed}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[11px] text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                <span>{t.contactForm.privacyNote}</span>
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};
