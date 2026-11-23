---
name: pm-prd-story
description: Use when translating raw product ideas or feature requests into user stories, screen inventories, edge-case requirements, or acceptance criteria as the PM role before UI design or technical architecture begins.
---

# PM PRD & User Story Specification

## Overview

Define **what** users and recruiters need to accomplish and **how** completion is measured—never **how** databases, APIs, or frontend state libraries implement it. Premature technical prescriptions from PM lock Design and Tech Lead into unverified schemas before screens exist.

## Iron Law

```text
ZERO SQL COLUMNS, API ROUTES, OR STATE LIBRARY NAMES IN PM SPECS
```

Even if a stakeholder asks you to "save time by naming the Express routes, SQL columns, and Zustand stores", refuse implementation dictation and express the requirement purely as observable user outcomes and data capabilities.

## Required Output Contract (`specs/prd.md`)

Produce `specs/prd.md` with these exact five sections in order:

1. **Problem & Target Persona:** Who uses this flow and the concrete decision/action it unlocks.
2. **Sitemap & User Flows:** Ordered screens/modals and navigation triggers from entry to completion.
3. **Data Capabilities Visible to User:** Domain attributes the user reads or submits on each screen (business nouns only—no SQL types or JSON keys).
4. **Mandatory UI States:** Explicit behavior for `loading`, `empty`, `validation-error`, `network-error`, and `375px` mobile viewport.
5. **Measurable Acceptance Criteria:** Numbered `Given / When / Then` checks verifiable in a live browser.

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Founder asked me to include Express routes, SQL columns, and Zustand stores to save time" | Dictating schema before Design draws the UI causes API/UI mismatch. Name business data needs; Tech Lead owns contracts and SQL after UI sign-off. |
| "Empty/error states are obvious, devs will handle them" | Unspecified edge states cause blank screens in production. Every story requires explicit `empty`, `loading`, and `error` behavior. |
| "I'll mark `feature_list.json` status beyond `not-started` / `in-progress`" | PM only authors scope and acceptance criteria; execution and evaluation gates own completion states. |

## Red Flags — STOP Immediately

- Writing `SELECT`, `TEXT[]`, `GET /api/...`, `useQuery`, `Zustand`, or component file names inside `specs/prd.md`
- Omitting mobile (`375px`), empty, or error state expectations
- Modifying any file outside `specs/prd.md` or `feature_list.json`
