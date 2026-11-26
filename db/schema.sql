CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  headline VARCHAR(200) NOT NULL,
  bio TEXT NOT NULL,
  location VARCHAR(120),
  email VARCHAR(160) NOT NULL,
  github_url TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  avatar_url TEXT,
  achievements TEXT[] NOT NULL DEFAULT '{}',
  availability_text VARCHAR(120) NOT NULL DEFAULT 'Available for Senior / Staff Roles',
  calendar_url TEXT,
  kpi_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS availability_text VARCHAR(120) NOT NULL DEFAULT 'Available for Senior / Staff Roles',
  ADD COLUMN IF NOT EXISTS calendar_url TEXT,
  ADD COLUMN IF NOT EXISTS kpi_metrics JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company VARCHAR(160) NOT NULL,
  role VARCHAR(160) NOT NULL,
  location VARCHAR(120),
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  summary TEXT NOT NULL,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  tech_tags TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE experiences
  ADD COLUMN IF NOT EXISTS tech_tags TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  slug VARCHAR(160) UNIQUE NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Full-Stack Web',
  summary TEXT NOT NULL,
  role VARCHAR(120),
  highlights TEXT[] NOT NULL DEFAULT '{}',
  tech_tags TEXT[] NOT NULL DEFAULT '{}',
  impact_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  case_study JSONB,
  repo_url TEXT,
  live_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS category VARCHAR(60) NOT NULL DEFAULT 'Full-Stack Web',
  ADD COLUMN IF NOT EXISTS impact_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS case_study JSONB;

CREATE TABLE IF NOT EXISTS tech_stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  category VARCHAR(40) NOT NULL,
  proficiency SMALLINT NOT NULL CHECK (proficiency BETWEEN 1 AND 100),
  years_exp NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  idempotency_key UUID UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  company VARCHAR(160),
  engagement_type VARCHAR(40) NOT NULL DEFAULT 'full_time'
    CHECK (engagement_type IN ('full_time', 'fractional', 'arch_audit')),
  comp_tier VARCHAR(120),
  preferred_slot VARCHAR(120),
  jd_type VARCHAR(16) NOT NULL DEFAULT 'none'
    CHECK (jd_type IN ('none', 'link', 'pdf')),
  jd_url TEXT,
  message TEXT NOT NULL,
  ip_hash VARCHAR(64),
  submitted_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES contact_submissions(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL CHECK (mime_type = 'application/pdf'),
  byte_size INT NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  pdf_data BYTEA NOT NULL,
  uploaded_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_daily_metrics (
  metric_date DATE PRIMARY KEY,
  total_views INT NOT NULL DEFAULT 0 CHECK (total_views >= 0),
  unique_visitors INT NOT NULL DEFAULT 0 CHECK (unique_visitors >= 0),
  cv_downloads INT NOT NULL DEFAULT 0 CHECK (cv_downloads >= 0),
  contact_inquiries INT NOT NULL DEFAULT 0 CHECK (contact_inquiries >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_daily_visitors (
  metric_date DATE NOT NULL,
  visitor_hash VARCHAR(64) NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (metric_date, visitor_hash)
);

CREATE TABLE IF NOT EXISTS analytics_daily_pages (
  metric_date DATE NOT NULL,
  path VARCHAR(160) NOT NULL,
  views INT NOT NULL DEFAULT 0 CHECK (views >= 0),
  PRIMARY KEY (metric_date, path)
);

CREATE INDEX IF NOT EXISTS idx_experiences_profile ON experiences(profile_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_profile ON projects(profile_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tech_stacks_profile ON tech_stacks(profile_id, category, sort_order);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_ip_created ON contact_submissions(ip_hash, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_date ON contact_submissions(submitted_date DESC, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_pages_date_views ON analytics_daily_pages(metric_date DESC, views DESC, path);
