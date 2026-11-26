# Role-Isolated Portable Knowledge Packs & End-to-End Zod Contract Design

## 1. Intent & Why

Equip the multi-agent engineering roles (`fe`, `be`, `tech-lead`, `qa`) with **portable, self-contained, empirically pruned Knowledge Packs** (`fe-kb`, `be-kb`, `arch-kb`, `qa-kb`) plus **end-to-end `zod` contract-to-form validation** (`specs/contracts/` -> `apps/api` -> `apps/web`).

Instead of stuffing vague slogans (`SOLID`, `DRY`, `Atomic Design`, `"think about scale"`) into system prompts—which causes LLM over-engineering, directory bloat, and instruction dilution—each role receives:
1. **Tier 1 (`0ms` Folder/Role Invariants):** Crisp, measurable rules in `apps/{web,api,e2e}/AGENTS.md` and role `SKILL.md` files.
2. **Tier 3 (On-Demand Searchable Knowledge Pack via `kb-cli.mjs`):** Independent per-role packs under `.agents/skills/{fe-kb,be-kb,arch-kb,qa-kb}/` containing First-Match Decision Trees, symmetric `DO` / `DON'T` pairs, `When NOT to replace legacy code`, and deterministic `scanner-rules.json` checks—portable as standalone folders or `--standalone-plugin` exports across future SaaS/production repositories.

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **4 Portable Role Knowledge Packs** in `.agents/skills/` (synced to `~/.gemini/config/skills/`):
  - `fe-kb` (`5` guides): `useEffect` boundaries & derived state, pragmatic 2-tier component granularity & `<= 2`-hop anti-props-drilling (`children` composition / `zustand`), `interface` vs `type` & contract DTO consumption, `zod` + `@hookform/resolvers` + `react-hook-form` (with Vietnamese/CJK IME safety), and async UX/accessibility behaviors.
  - `be-kb` (`4` guides): PostgreSQL query optimization & eliminating N+1 queries, dedicated-client transactions + concurrency/idempotency (`ON CONFLICT`), Express boundary `zod` `safeParse` validation & safe `400`/`500` error envelopes, and API latency/pooling/bounded-payload hygiene.
  - `arch-kb` (`4` guides): Shared API response envelopes & single-level DTO composition (`Pick` / `Omit` / `extends` `<= 1` hop + shared `zod` schema composition), stateless horizontal scale readiness without premature infrastructure, PostgreSQL composite indexing & zero-downtime idempotent migrations, and `CONTRACT_GAP` vs `BE_DEVIATION` blast-radius triage.
  - `qa-kb` (`4` guides): Testing Trophy & high-signal behavior assertions, adversarial user-perspective & edge-case matrix (rapid double-submit, long unbroken strings, Unicode/IME, error recovery preserving user input), live DOM accessibility/focus/responsive (`375x812` & `1280x800`) probes, and Playwright anti-flake patterns.
- **End-to-End `zod` Reference Wiring in `lazy-guy`:**
  - Install `zod` (`apps/api`, `apps/web`) and `@hookform/resolvers` (`apps/web`).
  - Create `specs/contracts/common.ts` (reusable `ApiSuccessResponse<T>`, `ApiListResponse<T>`, `CursorPageResponse<T>`, `ApiErrorResponse`) and `specs/contracts/portfolio.ts` (`ContactSubmissionSchema` + canonical `Profile`, `Experience`, `ProjectSummary` / `Project` single-hop composition, `TechStack` DTOs).
  - Configure `apps/api/tsconfig.json` and `apps/web/tsconfig.json` so both workspaces typecheck and import `specs/contracts/*.ts` directly with **zero intermediate build step** (preserving `[AGENT_ROLE: tech-lead]` -> `be` -> `fe` workflow compatibility).
  - Refactor `apps/api/src/routes/portfolio.ts` (`POST /api/contact`), `apps/web/src/lib/api.ts`, and `apps/web/src/components/ContactForm.tsx` (using `zodResolver`, IME-safe `Enter` handling, and accessible `:focus-visible` rings) to consume `specs/contracts/portfolio.ts` while preserving 100% existing HTTP status codes and user-facing validation copy.
- **Role Skill Wiring:** Link `fe-shadcn-clean` -> `fe-kb`, `be-express-pg` -> `be-kb`, `tech-lead-contract` -> `arch-kb`, and `qa-vercel-audit` -> `qa-kb` (with strict JSON-mode citation suppression so `[AGENT_ROLE]` DAG schemas never break), and register all 4 packs in `.agents/skills/using-superpowers/SKILL.md`.

### Non-Goals & Anti-Goals
- **No KB packs for `pm` or `design`:** `pm-prd-story` and `design-stitch-flow` remain lightweight discipline skills (avoiding unnecessary CLI search latency).
- **Keep `.agents/skills/modern-fullstack-guidance/` intact:** Required by `scripts/check-harness.mjs` (`REQUIRED_FILES`) for general single-agent sessions; do not delete or break existing harness locks.
- **Anti-Goals:** Zero 5-folder `atoms/molecules/organisms/templates` churn in `apps/web/src/components/`; zero multi-level DTO inheritance chains (`> 1` `extends` hop); zero speculative Redis/Queue/Repository boilerplate in `apps/api/`.

## 3. Constraints

- **Harness & Compiler Gates:** Every `SKILL.md` and guide `.md` must stay `<= 250` lines (Thin Router `SKILL.md <= 120` lines), declare `Use when... Not for...` frontmatter, contain zero foreign-stack tokens (`pytest`, `Cargo.toml`, `go.mod`, `pyproject.toml`), maintain 100% transitive file reachability from `SKILL.md`, and pass `kb-cli.mjs validate`.
- **Frontend AST & Strict TS Gates:** All TypeScript snippets and `apps/web/src/` edits must use arrow functions (`export const Name = () =>`), zero `any`, zero `@ts-ignore`/`@ts-expect-error`, and pass all 6 strict `tsconfig` flags.
- **Zero Vulnerability Gate:** Newly installed `zod` and `@hookform/resolvers` versions must pass `npm audit --audit-level=high` (`0` high/critical vulnerabilities).
- **Hook Compatibility:** Role prompts invoke `node .agents/skills/<pack>/scripts/kb-cli.mjs search|retrieve ... --dir .agents/skills/<pack>` from workspace root without `cd` or shell redirections so `PreToolUse` role locks pass cleanly.

## 4. Approaches Considered & Chosen

1. **Chosen — 4 Independent Role Packs (`fe-kb`, `be-kb`, `arch-kb`, `qa-kb`) + Zero-Build Shared `specs/contracts/*.ts`:**
   - Each role pack bundles its own zero-dependency `scripts/kb-cli.mjs` and domain guides so any single pack can be copied or exported (`--standalone-plugin`) into external repos independently.
   - `apps/api/tsconfig.json` widens `"rootDir": "../.."` + `"include": ["src", "../../specs/contracts/**/*.ts"]` (updating `apps/api/package.json` `"start"` to `"node dist/apps/api/src/index.js"`) and `apps/web/tsconfig.json` adds `"../../specs/contracts/**/*.ts"` to `"include"`. Both `be` and `fe` consume `specs/contracts/*.ts` (`zod` schemas + TS envelopes/DTOs) directly with zero pre-build step.
2. **Rejected — Separate Compiled `@lazy-guy/contracts` Workspace with `dist/` Build Step:**
   - Breaks `[AGENT_ROLE: tech-lead]` in `feature_delivery.py` when `tech-lead` writes a new `specs/contracts/<feat-id>.ts` without running a workspace build before `be` runs `tsc --noEmit`.
3. **Rejected — Monolithic Single `engineering-kb` Pack:**
   - Violates requirement A3 (independent role portability across repos) and dilutes BM25 ranking across unrelated SQL, React DOM, architecture, and Playwright terms.

## 5. Settled vs Builder Decisions

- **Settled:**
  - Pack names & paths: `.agents/skills/{fe-kb,be-kb,arch-kb,qa-kb}/` (plus byte-identical sync to `~/.gemini/config/skills/`).
  - End-to-end `zod` + `@hookform/resolvers` installation and live dogfooding across `specs/contracts/{common,portfolio}.ts`, `apps/api/src/routes/portfolio.ts`, `apps/web/src/lib/api.ts`, and `apps/web/src/components/ContactForm.tsx`.
  - Existing API error strings (`'name, email, and message are required'`, `'Valid email is required'`) and RTL form behavior preserved 100% for backward test compatibility, plus new unit/integration assertions covering shared schema/DTO invariants, IME `Enter` composition guard, and `:focus-visible` styling.
  - Unguided `RED` subagent probes executed per `authoring-agent-knowledge` / `writing-skills` before finalizing pack guides, followed by guided `GREEN` verification.
- **Left to Builder:**
  - Exact `zod` v3 vs v4 API method spelling matching the npm version resolved in `package-lock.json` (verified immediately upon install).
  - Exact `scanner-rules.json` regex tuning per pack so `scan` produces high-precision hits with `0` false positives on valid `keepWhen` / `dropWhen` cases.
