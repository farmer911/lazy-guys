# Frozen UI Designs (`designs/`)

This directory holds the **Git-frozen visual source of truth** exported after Human sign-off on **Google Stitch** (`project_init_graph`).

## Structure
- `designs/design-tokens.json` — Canonical palette, typography scale, radius, spacing, and surface tokens.
- `designs/stitch-manifest.json` — Google Stitch project/screen IDs and approval timestamp.
- `designs/screens/<screen-slug>.html` — Approved static HTML/Tailwind screen snapshots covering `default`, `loading`, `empty`, `error`, and `375px` mobile states.

Downstream `tech-lead`, `be`, `fe`, and `qa` sub-agents read directly from `designs/` so visual requirements remain deterministic, offline-safe, and rate-limit free.
