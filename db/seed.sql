INSERT INTO profiles (
  id,
  full_name,
  headline,
  bio,
  location,
  email,
  github_url,
  linkedin_url,
  resume_url,
  achievements,
  availability_text,
  calendar_url,
  kpi_metrics
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Lazy Guy',
  'Full-Stack Software Engineer — React, TypeScript, Node.js & PostgreSQL',
  'Product-minded engineer focused on clean architecture, fast UX, and reliable automated testing.',
  'Ho Chi Minh City, Vietnam',
  'hello@lazyguy.dev',
  'https://github.com/lazyguy',
  'https://linkedin.com/in/lazyguy',
  '/api/cv/pdf',
  ARRAY[
    'Reduced API p95 latency by 45% via PostgreSQL indexing and query tuning',
    'Led migration to TypeScript monorepo with 90%+ E2E critical-path coverage',
    'Built internal design system adopted across 4 product squads'
  ],
  'Open to Senior / Staff Roles',
  'https://cal.com/lazyguy/20min',
  '[
    {"label": "API p95 Latency", "value": "-45%", "detail": "PostgreSQL composite B-tree indexing & CTE batching"},
    {"label": "E2E Critical Coverage", "value": "94%", "detail": "Playwright Chromium + real PostgreSQL CI gates"},
    {"label": "Lighthouse Production", "value": "100/100", "detail": "Zero-CLS skeletons & lazy-split route chunks"}
  ]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  resume_url = EXCLUDED.resume_url,
  availability_text = EXCLUDED.availability_text,
  calendar_url = EXCLUDED.calendar_url,
  kpi_metrics = EXCLUDED.kpi_metrics;

INSERT INTO experiences (profile_id, company, role, location, start_date, end_date, is_current, summary, highlights, tech_tags, sort_order)
SELECT
  v.profile_id::uuid,
  v.company,
  v.role,
  v.location,
  v.start_date::date,
  v.end_date::date,
  v.is_current,
  v.summary,
  v.highlights,
  v.tech_tags,
  v.sort_order
FROM (
  VALUES
    (
      '11111111-1111-1111-1111-111111111111',
      'Acme Tech',
      'Senior Full-Stack Engineer',
      'Ho Chi Minh City',
      '2024-01-01',
      NULL,
      TRUE,
      'Architecting customer-facing web apps and scalable Node.js/PostgreSQL services.',
      ARRAY['Designed multi-tenant REST APIs serving 50k+ DAU', 'Established Playwright E2E gate in CI/CD'],
      ARRAY['TypeScript', 'React 19', 'Node.js', 'PostgreSQL', 'Playwright'],
      1
    ),
    (
      '11111111-1111-1111-1111-111111111111',
      'Beta Studio',
      'Frontend Engineer',
      'Remote',
      '2022-03-01',
      '2023-12-31',
      FALSE,
      'Built interactive dashboards with React, TypeScript, Tailwind CSS, and TanStack Query.',
      ARRAY['Cut bundle size by 32% with route-level code splitting', 'Implemented accessible UI primitives with shadcn/ui'],
      ARRAY['React', 'Tailwind CSS', 'TanStack Query', 'Zustand', 'Vitest'],
      2
    )
) AS v(profile_id, company, role, location, start_date, end_date, is_current, summary, highlights, tech_tags, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM experiences e
  WHERE e.profile_id = v.profile_id::uuid
    AND e.company = v.company
    AND e.role = v.role
);

UPDATE experiences
SET tech_tags = CASE
  WHEN company = 'Acme Tech' THEN ARRAY['TypeScript', 'React 19', 'Node.js', 'PostgreSQL', 'Playwright']
  WHEN company = 'Beta Studio' THEN ARRAY['React', 'Tailwind CSS', 'TanStack Query', 'Zustand', 'Vitest']
  ELSE tech_tags
END
WHERE profile_id = '11111111-1111-1111-1111-111111111111'
  AND cardinality(tech_tags) = 0;

INSERT INTO projects (profile_id, title, slug, category, summary, role, highlights, tech_tags, impact_metrics, case_study, repo_url, live_url, featured, sort_order)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Lazy Guy Portfolio Platform',
    'lazy-guy-portfolio',
    'Full-Stack Web',
    'Recruiter-focused developer portfolio with live PostgreSQL data, REST API, and E2E test suite.',
    'Sole Author',
    ARRAY['Monorepo with React + Express + PostgreSQL', 'Automated RTL unit tests and Playwright smoke checks'],
    ARRAY['React', 'TypeScript', 'Tailwind CSS', 'Express', 'PostgreSQL', 'Playwright'],
    '[
      {"label": "API p95", "value": "14 ms", "detail": "Single-statement Writable CTEs"},
      {"label": "CLS", "value": "0.000", "detail": "Geometry-matched loading skeletons"}
    ]'::jsonb,
    '{
      "subtitle": "Zero-build Zod v4 contracts, stateless PostgreSQL analytics, and Electric Cobalt dual-theme UI.",
      "bottleneck": "Recruiter portfolios often suffer from stale hardcoded JSON, CLS layout jumps during hydration, and timezone-shifted employment dates.",
      "architectureFlow": ["Browser SPA (React 19 + Router)", "Shared Zod v4 Contracts", "Stateless Express 5 API", "PostgreSQL 16 Writable CTEs"],
      "adrDecisions": [
        {"title": "Zero-Build Monorepo Contracts", "decision": "Share specs/contracts/*.ts directly via NodeNext ESM and Vite aliases.", "tradeoff": "Avoids dual build pipelines while guaranteeing runtime/compile-time parity."},
        {"title": "Stateless PostgreSQL Rollups", "decision": "Use SHA-256 daily visitor hashing + single-statement Writable CTEs instead of Redis.", "tradeoff": "Horizontally scalable with zero extra stateful infrastructure."}
      ],
      "benchmarks": [
        {"metric": "Desktop Lighthouse", "before": "94 / 0.146 CLS", "after": "100 / 0.000 CLS"},
        {"metric": "CV PDF Export", "before": "Static external file", "after": "< 15 ms live pdf-lib stream"}
      ],
      "nextSteps": "Add recruiter email webhook notifications when SMTP relay is configured."
    }'::jsonb,
    'https://github.com/lazyguy/lazy-guy',
    'https://lazyguy.dev',
    TRUE,
    1
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Pulse Metrics Dashboard',
    'pulse-metrics',
    'Backend & PostgreSQL',
    'Real-time observability board tracking API latency, error budgets, and deployment health.',
    'Lead Frontend',
    ARRAY['Sub-second polling with TanStack Query', 'Zero-downtime Docker Compose local dev'],
    ARRAY['React', 'Zustand', 'TanStack Query', 'Node.js', 'Docker'],
    '[
      {"label": "Query Speedup", "value": "4.2x", "detail": "Composite index (service, created_at, id)"},
      {"label": "Bundle Cut", "value": "-32%", "detail": "Route-level React.lazy splitting"}
    ]'::jsonb,
    '{
      "subtitle": "High-frequency telemetry visualization with deterministic keyset pagination and zero-drop error budgets.",
      "bottleneck": "OFFSET pagination across millions of telemetry events degraded p95 latency beyond 650 ms under concurrent inserts.",
      "architectureFlow": ["Telemetry Ingestor", "PostgreSQL Keyset Index", "Express Aggregation API", "TanStack Query UI"],
      "adrDecisions": [
        {"title": "Keyset Cursor Pagination", "decision": "Replaced OFFSET with (metric_ts, id) keyset cursors.", "tradeoff": "O(limit) index scan independent of page depth."},
        {"title": "Selector-Scoped Zustand", "decision": "Split filter state into atomic selectors.", "tradeoff": "Eliminated sibling chart re-renders on range toggles."}
      ],
      "benchmarks": [
        {"metric": "Feed p95 Query", "before": "650 ms (OFFSET)", "after": "18 ms (Keyset)"},
        {"metric": "Initial JS Gzip", "before": "168 kB", "after": "114 kB"}
      ],
      "nextSteps": "Add automated SLO burn-rate alert rules."
    }'::jsonb,
    'https://github.com/lazyguy/pulse-metrics',
    NULL,
    TRUE,
    2
  )
ON CONFLICT (slug) DO UPDATE SET
  category = EXCLUDED.category,
  impact_metrics = EXCLUDED.impact_metrics,
  case_study = EXCLUDED.case_study;

INSERT INTO tech_stacks (profile_id, name, category, proficiency, years_exp, sort_order)
SELECT
  v.profile_id::uuid,
  v.name,
  v.category,
  v.proficiency::smallint,
  v.years_exp::numeric(3,1),
  v.sort_order
FROM (
  VALUES
    ('11111111-1111-1111-1111-111111111111', 'React & TypeScript', 'Frontend', 95, 4.0, 1),
    ('11111111-1111-1111-1111-111111111111', 'Tailwind CSS & shadcn/ui', 'Frontend', 92, 3.0, 2),
    ('11111111-1111-1111-1111-111111111111', 'Node.js & Express', 'Backend', 90, 4.0, 3),
    ('11111111-1111-1111-1111-111111111111', 'PostgreSQL', 'Database', 85, 3.5, 4),
    ('11111111-1111-1111-1111-111111111111', 'Playwright & RTL', 'Testing', 88, 3.0, 5),
    ('11111111-1111-1111-1111-111111111111', 'Docker Compose', 'DevOps', 82, 3.0, 6)
) AS v(profile_id, name, category, proficiency, years_exp, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM tech_stacks t
  WHERE t.profile_id = v.profile_id::uuid
    AND t.name = v.name
);
