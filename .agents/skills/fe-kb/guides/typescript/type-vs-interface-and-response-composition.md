---
id: "type-vs-interface-and-response-composition"
title: "Interface vs Type Boundaries & Shared Contract DTO Composition"
description: "Use interface for component Props and entity contracts, type for unions and z.infer derivations, and import canonical DTOs from specs/contracts without shadow interfaces."
tags: ["interface", "type", "dto", "zod", "discriminated-union", "contracts", "response"]
maturity: "stable"
---

# Interface vs Type Boundaries & Shared Contract DTO Composition

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: `interface` for component `Props` and extensible domain entities

Declare React component prop contracts and object-shaped domain entities with `interface` (limiting inheritance to `<= 1` shallow `extends` hop, such as `Project extends ProjectSummary`), giving TypeScript fast cached structural checks and readable diagnostics.

```tsx
import type { Project, ProjectSummary } from '@/lib/api';

export interface ProjectRowProps {
  readonly summary: ProjectSummary;
  readonly isSelected: boolean;
  readonly onSelect: (slug: string) => void;
}

export interface ProjectDetailDrawerProps {
  readonly project: Project;
  readonly onClose: () => void;
}
```

- **DO** mark prop fields and array props `readonly` (`readonly items: readonly Project[]`) so components cannot accidentally mutate cached `@tanstack/react-query` arrays in place.
- **DON'T** build deep `interface A extends B extends C` hierarchies (`> 1` hop) that obscure required fields across files.

### Rule 2: `type` for unions, discriminated state machines, `z.infer`, and mapped utilities

Use `type` aliases for literal unions, discriminated UI/async state unions, `z.infer<typeof Schema>` form payload derivations, and `Pick` / `Omit` projections from canonical contracts.

```ts
import type { z } from 'zod';
import type { ContactSubmissionSchema, Project } from '@contracts/portfolio';

export type ContactFormValues = z.infer<typeof ContactSubmissionSchema>;
export type ProjectCardPreview = Pick<Project, 'id' | 'title' | 'summary' | 'tech_tags'>;

export type SubmissionViewState =
  | { readonly status: 'idle' }
  | { readonly status: 'submitting' }
  | { readonly status: 'succeeded'; readonly receivedAt: string }
  | { readonly status: 'failed'; readonly errorMessage: string };
```

- **DO** model mutually exclusive UI states as a discriminated `type` union keyed on `status` rather than independent booleans (`isLoading`, `isError`, `isSuccess`) that permit impossible combinations.
- **DON'T** duplicate Zod schema fields into a hand-written `interface ContactFormValues` that silently drifts when validation rules change.

### Rule 3: Import canonical DTOs & envelopes from `specs/contracts/*` (Zero Shadow Types)

Import entity DTOs (`Profile`, `Project`, `Experience`, `TechStack`) and shared response envelopes (`ApiSuccessResponse<T>`, `ApiListResponse<T>`, `CursorPageResponse<T>`, `ApiErrorResponse`) directly from `specs/contracts/*` in `@/lib/api`.

```ts
// apps/web/src/lib/api.ts — import canonical types from specs/contracts/*
import type { ApiListResponse } from '@contracts/common';
import type { Project } from '@contracts/portfolio';
import { apiClient } from '@/lib/api';

export const fetchFeaturedProjects = async (): Promise<readonly Project[]> => {
  const { data } = await apiClient.get<ApiListResponse<Project>>('/projects?featured=true');
  return data.data;
};
```

- **DO** halt frontend integration and escalate `CONTRACT_MISMATCH` to Tech Lead whenever a frozen Stitch UI screen expects a field or envelope missing from `specs/contracts/*` or live `apps/api`.
- **DON'T** declare shadow `interface ApiProject { ... }` copies inside `apps/web/src/lib/api.ts`, mark required UI fields optional (`team_size?: number`), or invent fake fallback strings (`project.role ?? 'Lead Engineer'`) to mask contract gaps.

## When NOT to replace legacy code

- **Keep existing pattern when:** Third-party library ambient module augmentation (`declare module 'react'`) requires `interface` declaration merging to register custom HTML attributes cleanly without type assertions.
