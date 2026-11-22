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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  slug VARCHAR(160) UNIQUE NOT NULL,
  summary TEXT NOT NULL,
  role VARCHAR(120),
  highlights TEXT[] NOT NULL DEFAULT '{}',
  tech_tags TEXT[] NOT NULL DEFAULT '{}',
  repo_url TEXT,
  live_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_experiences_profile ON experiences(profile_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_profile ON projects(profile_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tech_stacks_profile ON tech_stacks(profile_id, category, sort_order);
