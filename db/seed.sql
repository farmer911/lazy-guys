INSERT INTO profiles (
  id,
  full_name,
  headline,
  bio,
  location,
  email,
  github_url,
  linkedin_url,
  achievements
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Lazy Guy',
  'Full-Stack Software Engineer — React, TypeScript, Node.js & PostgreSQL',
  'Product-minded engineer focused on clean architecture, fast UX, and reliable automated testing.',
  'Ho Chi Minh City, Vietnam',
  'hello@lazyguy.dev',
  'https://github.com/lazyguy',
  'https://linkedin.com/in/lazyguy',
  ARRAY[
    'Reduced API p95 latency by 45% via PostgreSQL indexing and query tuning',
    'Led migration to TypeScript monorepo with 90%+ E2E critical-path coverage',
    'Built internal design system adopted across 4 product squads'
  ]
) ON CONFLICT (id) DO NOTHING;

INSERT INTO experiences (profile_id, company, role, location, start_date, end_date, is_current, summary, highlights, sort_order)
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
    2
  );

INSERT INTO projects (profile_id, title, slug, summary, role, highlights, tech_tags, repo_url, live_url, featured, sort_order)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Lazy Guy Portfolio Platform',
    'lazy-guy-portfolio',
    'Recruiter-focused developer portfolio with live PostgreSQL data, REST API, and E2E test suite.',
    'Sole Author',
    ARRAY['Monorepo with React + Express + PostgreSQL', 'Automated RTL unit tests and Playwright smoke checks'],
    ARRAY['React', 'TypeScript', 'Tailwind CSS', 'Express', 'PostgreSQL', 'Playwright'],
    'https://github.com/lazyguy/lazy-guy',
    'https://lazyguy.dev',
    TRUE,
    1
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Pulse Metrics Dashboard',
    'pulse-metrics',
    'Real-time observability board tracking API latency, error budgets, and deployment health.',
    'Lead Frontend',
    ARRAY['Sub-second polling with TanStack Query', 'Zero-downtime Docker Compose local dev'],
    ARRAY['React', 'Zustand', 'TanStack Query', 'Node.js', 'Docker'],
    'https://github.com/lazyguy/pulse-metrics',
    NULL,
    TRUE,
    2
  );

INSERT INTO tech_stacks (profile_id, name, category, proficiency, years_exp, sort_order)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'React & TypeScript', 'Frontend', 95, 4.0, 1),
  ('11111111-1111-1111-1111-111111111111', 'Tailwind CSS & shadcn/ui', 'Frontend', 92, 3.0, 2),
  ('11111111-1111-1111-1111-111111111111', 'Node.js & Express', 'Backend', 90, 4.0, 3),
  ('11111111-1111-1111-1111-111111111111', 'PostgreSQL', 'Database', 85, 3.5, 4),
  ('11111111-1111-1111-1111-111111111111', 'Playwright & RTL', 'Testing', 88, 3.0, 5),
  ('11111111-1111-1111-1111-111111111111', 'Docker Compose', 'DevOps', 82, 3.0, 6);
