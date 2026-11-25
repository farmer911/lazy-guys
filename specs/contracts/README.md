# System Specs & Contracts (`specs/`)

Role ownership in multi-agent DAG mode: `pm` owns `specs/prd.md`; `tech-lead` owns `specs/contracts/*.ts` (enforced by `PreToolUse`). Single-agent brainstorming/planning sessions store optional design docs and TDD plans under `specs/designs/` and `specs/plans/`.

- `specs/prd.md` — Product Requirements Document: user stories, screen inventory, edge states, and measurable acceptance criteria (zero SQL/framework implementation prescriptions).
- `specs/contracts/<feat-id>.ts` — Canonical TypeScript interfaces, endpoint paths, status codes, and validation rules binding `be` (`apps/api`) and `fe` (`apps/web`).
- `specs/designs/` & `specs/plans/` — Optional single-agent design docs (`brainstorming`) and executable TDD plans (`writing-plans`).
