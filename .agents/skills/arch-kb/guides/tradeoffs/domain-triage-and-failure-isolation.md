---
id: "domain-triage-and-failure-isolation"
title: "Contract Mismatch Triage, Additive Evolution & Blast-Radius Isolation"
description: "Classify SCHEMA_MISMATCH and CONTRACT_MISMATCH escalations into BE_DEVIATION vs CONTRACT_GAP without hiding approved UI fields, evolve contracts additively, and isolate partial widget failures."
tags: ["contract", "mismatch", "triage", "isolation", "deviation", "blast-radius", "schema", "backward-compatible"]
maturity: "stable"
---

# Contract Mismatch Triage, Additive Evolution & Blast-Radius Isolation

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Escalation classification (`BE_DEVIATION` vs `CONTRACT_GAP`)

Inspect `designs/screens/*.html`, `db/schema.sql`, and `specs/contracts/<feat-id>.ts` together before issuing any role directive:

```ts
// Triage decision matrix for TECH_LEAD_TRIAGE_SCHEMA:
// 1. Contract + db/schema.sql already specify field/type, API omitted or mis-typed -> BE_DEVIATION
// 2. Approved designs/ screen requires missing column, endpoint, or DTO field     -> CONTRACT_GAP
export interface TriageResolution {
  readonly classification: 'BE_DEVIATION' | 'CONTRACT_GAP';
  readonly beDirective: string;
  readonly updatedContractPath?: string;
}
```

- **DO** classify as **`BE_DEVIATION`** when `specs/contracts/<feat-id>.ts` and `db/schema.sql` already define the field/type (e.g., `years_exp: number` or `start_date: 'YYYY-MM-DD'`), keep the contract unchanged, and direct `be` to fix the SQL cast/projection (`years_exp::float8`, `start_date::text`) + integration test.
- **DO** classify as **`CONTRACT_GAP`** when an approved `designs/` screen requires data absent from `db/schema.sql` or `specs/contracts/<feat-id>.ts`; update `db/schema.sql` (`ADD COLUMN IF NOT EXISTS`) and `specs/contracts/<feat-id>.ts` first, then dispatch `be` before returning to `fe`.
- **DON'T** instruct `fe` to make an approved UI field optional, hide a designed section, or hardcode mock React fallback data to bypass a backend/schema gap.

### Rule 2: Expand-and-contract backward-compatible schema evolution

When evolving an active endpoint or table already consumed by existing tests or clients:

```ts
import { z } from 'zod';

// Additive request evolution: existing callers omitting subject continue passing validation
export const ContactSubmissionV2Schema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().pipe(z.email()),
  message: z.string().trim().min(1),
  subject: z.string().trim().max(120).optional(),
});
```

- **DO** ship **additive changes first**: add nullable or `DEFAULT`-backed columns in `db/schema.sql` (`ADD COLUMN IF NOT EXISTS featured_rank INT NOT NULL DEFAULT 0`), keep existing response keys intact, and add optional request fields with Zod `.optional()` defaults.
- **DON'T** rename, narrow, or delete existing wire properties or SQL columns in-place while callers or E2E assertions still read the previous field name.

### Rule 3: Blast-radius & section-level failure isolation

Separate non-critical secondary interactions from primary page availability:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface SectionBoundaryProps {
  readonly fallback: ReactNode;
  readonly children: ReactNode;
}

export class SectionErrorBoundary extends Component<SectionBoundaryProps, { readonly hasError: boolean }> {
  override state = { hasError: false };
  static getDerivedStateFromError = () => ({ hasError: true });
  override componentDidCatch(_error: Error, _info: ErrorInfo): void {}
  override render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// Isolate secondary widget failures while preserving primary portfolio sections & user input
export const ContactErrorBanner = ({ message }: { readonly message: string | null }) =>
  message ? (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
```

- **DO** isolate auxiliary widget or mutation errors (such as `POST /api/contact` failure or secondary metrics) to their local section—render an accessible `role="alert"` message, preserve all user-typed form values, and keep primary `Profile` / `Projects` / `Experience` views interactive.
- **DO** return sanitized `ApiErrorResponse` (`{ error: 'Internal server error' }`) on unhandled `500` failures so SQL table names, stack traces, and connection strings never cross the wire.
- **DON'T** unmount the entire application tree on a secondary mutation error or clear form state inside a failed submit `catch` block.

## When NOT to replace legacy code

- **Keep existing pattern when:** A failure occurs in an authentication boundary, permission gate, or non-idempotent financial/destructive confirmation where partial UI rendering could trick the user into acting on stale authorization state—fail closed with a full-screen error boundary instead.
