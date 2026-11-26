import { z } from 'zod';

export const ENGAGEMENT_TYPES = ['full_time', 'fractional', 'arch_audit'] as const;
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];

export const JD_ATTACHMENT_TYPES = ['none', 'link', 'pdf'] as const;
export type JdAttachmentType = (typeof JD_ATTACHMENT_TYPES)[number];

export const MAX_JD_PDF_BYTES = 5 * 1024 * 1024;

export const JdPdfAttachmentSchema = z.object({
  fileName: z.string().trim().min(1, 'PDF filename is required').max(255),
  mimeType: z.literal('application/pdf'),
  contentBase64: z.string().trim().min(8, 'PDF content is required').max(7_200_000),
});

export type JdPdfAttachmentInput = z.infer<typeof JdPdfAttachmentSchema>;

export const ContactSubmissionSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .max(160)
      .pipe(z.email('Valid email is required')),
    message: z.string().trim().min(1, 'Message is required').max(5000),
    company: z.string().trim().max(160).optional(),
    engagementType: z.enum(ENGAGEMENT_TYPES).optional(),
    compTier: z.string().trim().max(120).optional(),
    preferredSlot: z.string().trim().max(120).optional(),
    idempotencyKey: z.uuid().optional(),
    jdUrl: z
      .string()
      .trim()
      .refine(
        (val) => val === '' || /^https?:\/\//i.test(val),
        'JD URL must start with http:// or https://'
      )
      .refine(
        (val) => val === '' || z.url().safeParse(val).success,
        'Valid JD URL is required'
      )
      .optional(),
    jdPdf: JdPdfAttachmentSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.jdUrl && val.jdUrl.trim() !== '' && val.jdPdf) {
      ctx.addIssue({
        code: 'custom',
        path: ['jdUrl'],
        message: 'Provide either a JD link or a PDF file, not both',
      });
    }
  });

export type ContactSubmissionInput = z.infer<typeof ContactSubmissionSchema>;

export interface ContactSubmissionAck {
  readonly ok: boolean;
  readonly id?: string;
  readonly submittedDate?: string;
  readonly jdType?: JdAttachmentType;
  readonly receivedAt: string;
}

export interface KpiMetric {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

export interface CaseStudyDecision {
  readonly title: string;
  readonly decision: string;
  readonly tradeoff: string;
}

export interface CaseStudyBenchmark {
  readonly metric: string;
  readonly before: string;
  readonly after: string;
}

export interface ProjectCaseStudy {
  readonly subtitle: string;
  readonly bottleneck: string;
  readonly architectureFlow: readonly string[];
  readonly adrDecisions: readonly CaseStudyDecision[];
  readonly benchmarks: readonly CaseStudyBenchmark[];
  readonly nextSteps: string;
}

export interface Profile {
  id: string;
  full_name: string;
  headline: string;
  bio: string;
  location: string | null;
  email: string;
  github_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  avatar_url: string | null;
  achievements: string[];
  availability_text?: string;
  calendar_url?: string | null;
  kpi_metrics?: readonly KpiMetric[];
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  summary: string;
  highlights: string[];
  tech_tags?: string[];
}

export interface ProjectSummary {
  id: string;
  title: string;
  slug: string;
  summary: string;
  tech_tags: string[];
  featured: boolean;
}

export interface Project extends ProjectSummary {
  category?: string;
  role: string | null;
  highlights: string[];
  impact_metrics?: readonly KpiMetric[];
  case_study?: ProjectCaseStudy | null;
  repo_url: string | null;
  live_url: string | null;
}

export interface TechStack {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  years_exp: number;
}

export const AnalyticsVisitSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1, 'Path is required')
    .max(160)
    .refine((val) => val.startsWith('/'), 'Path must start with /'),
  referrer: z.string().trim().max(255).optional(),
});

export type AnalyticsVisitInput = z.infer<typeof AnalyticsVisitSchema>;

export const DailyAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
});

export interface DailyAnalyticsEntry {
  readonly metricDate: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly totalViews: number;
  readonly uniqueVisitors: number;
  readonly cvDownloads: number;
  readonly contactInquiries: number;
}

export interface TopPageMetric {
  readonly path: string;
  readonly views: number;
}

export interface DailyAnalyticsSummary {
  readonly allTimeViews: number;
  readonly allTimeUniqueVisitors: number;
  readonly allTimeCvDownloads: number;
  readonly allTimeContactInquiries: number;
  readonly todayViews: number;
  readonly todayUniqueVisitors: number;
}

export interface DailyAnalyticsReport {
  readonly days: number;
  readonly summary: DailyAnalyticsSummary;
  readonly daily: readonly DailyAnalyticsEntry[];
  readonly topPages: readonly TopPageMetric[];
}
