# System Specs & Contracts (`specs/`)

Owned exclusively by `pm` (`specs/prd.md`) and `tech-lead` (`specs/contracts/*.ts`).

- `specs/prd.md` — Product Requirements Document: user stories, screen inventory, edge states, and measurable acceptance criteria (zero SQL/framework implementation prescriptions).
- `specs/contracts/<feat-id>.ts` — Canonical TypeScript interfaces, endpoint paths, status codes, and validation rules binding `be` (`apps/api`) and `fe` (`apps/web`).
