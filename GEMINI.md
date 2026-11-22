# Gemini Agent Rules — lazy-guy

## 1. Skill File Length Limit
- Every skill file (`SKILL.md`) in this repository MUST NOT exceed **250 lines**.
- Before finishing any task that creates or edits a `SKILL.md` file, verify line count:
  ```bash
  wc -l path/to/SKILL.md
  ```
- If a skill exceeds 250 lines, split reference details into `references/` and keep `SKILL.md` concise.

## 2. Zero-Error, Zero-Warning Build & Startup
- The startup environment (`./init.sh`), typecheck, frontend unit tests (React Testing Library via `npm run test:unit`), and production builds MUST succeed with **0 errors and 0 warnings**.
- Always use ESM-native `import.meta.dirname` (never `__dirname`) in Vite/Vitest configs.
- After any code, config, or dependency change, run and verify:
  ```bash
  ./init.sh
  ```
- Fix every compiler, bundler, or runtime warning before claiming completion.

## 3. Architecture & Conventions
- Follow `AGENTS.md` for session startup (`./init.sh`), `feature_list.json` scope tracking, and `progress.md` / `session-handoff.md` handoff.
- Monorepo workspaces: `apps/api` (Express + TS + `pg`), `apps/web` (React + Vite + Tailwind + shadcn/ui + Zustand + TanStack Query + `react-hook-form`), `apps/e2e` (Playwright).
- Database schema and seed data live in `db/schema.sql` and `db/seed.sql`, mounted by `docker-compose.yml`.
- Keep changes minimal and idiomatic; do not add unused dependencies or boilerplate.
