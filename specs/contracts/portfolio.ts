import { z } from 'zod';

export const ContactSubmissionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .pipe(z.email('Valid email is required')),
  message: z.string().trim().min(1, 'Message is required'),
});

export type ContactSubmissionInput = z.infer<typeof ContactSubmissionSchema>;

export interface ContactSubmissionAck {
  ok: boolean;
  receivedAt: string;
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
  role: string | null;
  highlights: string[];
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
