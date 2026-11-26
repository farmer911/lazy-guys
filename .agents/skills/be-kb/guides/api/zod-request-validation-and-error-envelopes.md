---
id: "zod-request-validation-and-error-envelopes"
title: "Validate Express Requests with Shared Zod Schemas & Error Envelopes"
description: "Validate Express req.body, req.query, and req.params with shared Zod safeParse schemas and return contract error envelopes without leaking SQL details."
tags: ["zod", "validate", "express", "request", "safeParse", "envelope", "error", "status"]
maturity: "stable"
---

# Validate Express Requests with Shared Zod Schemas & Error Envelopes

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Validating `req.body`, `req.query`, and `req.params` at the route boundary

Import shared Zod schemas from `specs/contracts/*` (extending only with route-level query coercion when needed) and call `.safeParse(...)` before touching the database.

```ts
import { z } from 'zod';
// Import shared request schema defined in specs/contracts/<feat-id>.ts:
import { ContactSubmissionSchema } from './portfolio.contract.js';

const ProjectsQuerySchema = z.object({
  featured: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.uuid().optional(),
});

// Inside Express route handler:
const bodyResult = ContactSubmissionSchema.safeParse(req.body ?? {});
if (!bodyResult.success) {
  res.status(400).json({ error: bodyResult.error.issues[0]?.message ?? 'Invalid request payload' });
  return;
}
```

- **DO** import request schemas from `specs/contracts/*` so Backend and Frontend share one source of truth for `.trim()`, `.min(1)`, email rules, and clamped pagination bounds.
- **DO** validate `:id` / `:slug` route parameters (`z.uuid().safeParse(req.params.id)`) before passing them to `::uuid` SQL casts — invalid UUID strings otherwise throw PostgreSQL `22P02` (`invalid_text_representation`) and surface as `500` errors.
- **DON'T** cast `req.body as Record<string, unknown>` or hand-roll manual `typeof` / regex parsing chains that silently drift from `specs/contracts/*`.

### Rule 2: Matching contract response envelopes & deterministic `400` / `404` / `409` statuses

Return the exact success and `ApiErrorResponse` (`{ error: string }`) shapes defined in `specs/contracts/*`.

```ts
const { rows } = await pool.query<ProjectDto>(
  `SELECT id, title, slug, summary, tech_tags, featured
   FROM projects
   WHERE slug = $1`,
  [slugResult.data]
);
if (!rows[0]) {
  res.status(404).json({ error: 'Project not found' });
  return;
}
res.status(200).json({ data: rows[0] }); // Or res.json(rows[0]) — match specs/contracts/* verbatim!
```

- **DO** inspect `specs/contracts/<feat-id>.ts` to verify whether the endpoint returns `ApiSuccessResponse<T>` (`{ data: T }`), `CursorPageResponse<T>`, or a flat DTO/array, and match HTTP status codes (`200`, `201`, `400`, `404`, `409`) verbatim.
- **DON'T** invent ad-hoc `{ ok: true, items: rows }` or `{ data: rows }` wrappers when the contract specifies a bare array (or vice versa), and never return `200` with `null` for missing single-resource lookups.

### Rule 3: Central `500` error masking & async rejection forwarding

Forward rejected promises to Express's 4-argument error middleware in `src/app.ts` and mask internal diagnostics from HTTP clients.

```ts
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError && err.status === 400) {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
```

- **DO** wrap async Express 4 handlers in `asyncHandler` (`fn(req, res, next).catch(next)`), log `err` server-side in `src/app.ts`, and send a generic `{ error: 'Internal server error' }` `500` body.
- **DON'T** return `res.status(500).json({ error: err.message })` — raw `pg` errors expose SQL table names, constraint identifiers, and parameter details to callers.

## When NOT to replace legacy code

- **Keep existing pattern when:** An existing route in `apps/api/src/routes/*.ts` implements specific field-level `400` error strings asserted by integration tests or `specs/contracts/*` (keep the exact error message mapping on top of `Schema.safeParse` issues).
