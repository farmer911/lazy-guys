---
id: "response-envelopes-and-dto-inheritance"
title: "API Response Envelopes & Safe Single-Hop DTO Inheritance"
description: "Standardize API response envelopes and DRY single-hop DTO composition while preventing TypeScript structural width-subtyping leaks across public and admin trust boundaries."
tags: ["api", "response", "dto", "inheritance", "envelope", "pick", "omit", "zod", "contract"]
maturity: "stable"
---

# API Response Envelopes & Safe Single-Hop DTO Inheritance

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Canonical wire envelopes (`specs/contracts/common.ts`)

Wrap new HTTP endpoints in shared generic `readonly` envelopes instead of inventing per-route wrapper keys (`{ items }`, `{ result }`, `{ payload }`).

```ts
export interface ApiSuccessResponse<T> {
  readonly data: T;
}

export interface ApiListResponse<T> {
  readonly data: readonly T[];
}

export interface CursorPageResponse<T> {
  readonly data: readonly T[];
  readonly pagination: {
    readonly nextCursor: string | null;
    readonly hasMore: boolean;
  };
}

export interface ApiErrorResponse {
  readonly error: string;
}
```

- **DO** type every new resource, list, cursor page, and `4xx`/`5xx` error body with the shared envelopes from `specs/contracts/common.ts`.
- **DON'T** return raw top-level arrays or inconsistent error keys (`{ message }` on one route, `{ err }` on another) that force client branching.

### Rule 2: Same-trust-tier DTO reuse (`<= 1` `extends` hop or `Pick`/`Omit` + Zod `.pick()`/`.extend()`)

When list and detail DTOs share the **exact same visibility/trust boundary** (e.g., public `ProjectSummary` vs public `Project`), compose with at most `1` `extends` hop or `z.object()` `.pick()` / `.extend()`.

```ts
import { z } from 'zod';

export const ProjectSummarySchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string(),
  tech_tags: z.array(z.string()),
  featured: z.boolean(),
});

export const ProjectDetailSchema = ProjectSummarySchema.extend({
  role: z.string().nullable(),
  highlights: z.array(z.string()),
  repo_url: z.url().nullable(),
  live_url: z.url().nullable(),
});

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export interface Project extends ProjectSummary {
  readonly role: string | null;
  readonly highlights: readonly string[];
  readonly repo_url: string | null;
  readonly live_url: string | null;
}
```

- **DO** cap interface `extends` chains at `<= 1` hop (`Detail extends Summary`) or derive projections from a single canonical schema via `Pick` / `Omit` / `.pick()`.
- **DON'T** build multi-level chains (`AdminDetail extends PublicDetail extends Summary extends BaseEntity`) that obscure IDE hover types and couple unrelated endpoints.

### Rule 3: Cross-trust-boundary DTOs (`public` vs `admin` / internal rows)

Never model privileged DTOs as subtypes of public DTOs or pass wider DB/admin objects directly into `res.json()` typed as a public interface.

```ts
// Explicit SQL column projection + strip-by-default Zod parse blocks extra properties
export const toPublicProject = (row: unknown): ProjectSummary =>
  ProjectSummarySchema.parse(row);
```

- **DO** define separate schemas (or discriminated `readonly audience: 'public' | 'admin'` unions) across trust boundaries, select explicit SQL columns (never `SELECT *`), and strip unknown runtime keys via default `z.object().parse()` before serializing.
- **DON'T** rely on TypeScript return annotations (`res.json(adminRow satisfies PublicProject)` or `const body: ApiSuccessResponse<PublicProject> = { data: adminRow }`) to strip secrets—TypeScript interfaces are **structurally width-subtyped**, so an `AdminProject` carrying `internalNotes` or `orgId` is assignable to `PublicProject` with `0` compiler errors while `JSON.stringify` leaks every extra property over HTTP.

### Rule 4: Zero-build monorepo contract sharing

- **DO** include `<repo-root>/specs/contracts/**/*.ts` directly in both backend (`NodeNext` with widened `rootDir`) and frontend (`bundler`) `tsconfig.json` files so new contracts typecheck immediately with zero intermediate build step.
- **DON'T** introduce a separate compiled `@scope/contracts` workspace requiring `tsc -b` emit to `dist/` before downstream `apps/api` or `apps/web` checks can resolve newly added types.

## When NOT to replace legacy code

- **Keep existing pattern when:** Live endpoints and E2E suites already lock a flat acknowledgement shape (such as `ContactSubmissionAck` `{ ok: boolean; receivedAt: string }` or `/api/health`); preserve wire compatibility and apply canonical envelopes to new or versioned routes.
