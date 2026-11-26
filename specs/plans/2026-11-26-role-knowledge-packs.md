# Role Knowledge Packs & End-to-End Zod Contracts Implementation Plan

> **Execution:** Execute this plan inline via `executing-plans` (followed by mandatory `evaluating-features` before any `feature_list.json` `"done"` transition). For Role-DAG full-stack `feature_list.json` delivery from `specs/prd.md` + `designs/`, run `.agents/workflows/feature_delivery.py` directly instead of authoring a `specs/plans/*.md` file.

**Goal:** Ship 4 self-contained, portable Role Knowledge Packs (`fe-kb`, `be-kb`, `arch-kb`, `qa-kb`) wired into the multi-agent role skills alongside zero-build shared `zod` contracts (`specs/contracts/` -> `apps/api` -> `apps/web`). | **Spec:** `specs/designs/2026-11-26-role-knowledge-packs-design.md` | **Tech Stack:** TypeScript, Zod, Express/pg, React/Vite/Tailwind/shadcn, React Hook Form (`@hookform/resolvers`), Vitest, Playwright, Node `node:test`

## Global Constraints & Review Focus
- Every `SKILL.md` and guide `.md` must remain `<= 250` lines (Thin Router `SKILL.md <= 120` lines), declare `Use when... Not for...` frontmatter, maintain 100% transitive reachability from `SKILL.md`, contain zero foreign-stack tokens (`pytest`, `Cargo.toml`, `go.mod`, `pyproject.toml`), and pass `kb-cli.mjs validate`.
- All TypeScript code and guide snippets for `apps/web/src/` must use arrow functions (`export const Name = () =>`), zero `any`, and zero `@ts-ignore`/`@ts-expect-error`.
- **Edge cases pinned to tests:**
  1. Whitespace-only strings (`"   "`) in `ContactSubmissionSchema` must fail after `.trim()` on both `POST /api/contact` (`400`) and `ContactForm` (`zodResolver`) without calling the network.
  2. Pressing `Enter` inside `ContactForm` inputs while IME composition is active (`isComposing: true`) must NOT trigger premature form submission.
  3. Network failure (`500` / rejected promise) on `ContactForm` must announce `role="alert"` **while preserving the recruiter's typed `name`, `email`, and `message` values** (never wiping form inputs on error).
  4. `apps/api` production build (`npm run build --workspace=apps/api`) with widened `rootDir: "../.."` must emit runnable ESM JavaScript matching `apps/api/package.json` `"start"`.
  5. Role Knowledge Pack `SKILL.md` citation rules must suppress prose disclosure when `[AGENT_ROLE: ...]` workers return strict JSON schemas.

---

### Task 1: End-to-End `zod` Dependencies & Shared Zero-Build Contracts (`specs/contracts/` -> `apps/api` -> `apps/web`)
**Files:** Modify `package.json`, `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/api/src/routes/portfolio.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/components/ContactForm.tsx` | Create `specs/contracts/common.ts`, `specs/contracts/portfolio.ts` | Test `apps/api/src/__tests__/portfolio.test.ts`, `apps/web/src/components/__tests__/ContactForm.test.tsx`
**Interfaces:**
- `specs/contracts/common.ts` exports `ApiSuccessResponse<T>`, `ApiListResponse<T>`, `CursorPageResponse<T>`, `ApiErrorResponse`.
- `specs/contracts/portfolio.ts` exports `ContactSubmissionSchema`, `type ContactSubmissionInput`, `interface ContactSubmissionAck`, `interface Profile`, `interface Experience`, `interface ProjectSummary`, `interface Project extends ProjectSummary` (1-hop composition), `interface TechStack`.

- [ ] **Step 1 (Install & RED):** Install `zod` in `apps/api` + `apps/web` and `@hookform/resolvers` in `apps/web` (`npm install zod --workspace=apps/api --workspace=apps/web && npm install @hookform/resolvers --workspace=apps/web`). Add failing tests in `apps/api/src/__tests__/portfolio.test.ts` (importing `ContactSubmissionSchema` from `../../../../specs/contracts/portfolio.js` + verifying trimmed `400` validation envelopes) and `apps/web/src/components/__tests__/ContactForm.test.tsx` (asserting IME `isComposing` `Enter` suppression, preserved user input after network failure, and `focus-visible:ring` class hygiene).
- [ ] **Step 2 (Verify RED):** Run `npm run test --workspace=apps/api && npm run test --workspace=apps/web` → Expected: FAIL (`Cannot find module '../../../../specs/contracts/portfolio.js'` and missing IME/focus-visible behavior).
- [ ] **Step 3 (GREEN):** Create `specs/contracts/common.ts` and `specs/contracts/portfolio.ts`; update `apps/api/tsconfig.json` (`"rootDir": "../.."`, `"include": ["src", "../../specs/contracts/**/*.ts"]`) and `apps/api/package.json` (`"start": "node dist/apps/api/src/index.js"`); update `apps/web/tsconfig.json` (`"include": ["src", "../../specs/contracts/**/*.ts"]`); wire `ContactSubmissionSchema.safeParse` in `apps/api/src/routes/portfolio.ts` (preserving exact `'name, email, and message are required'` and `'Valid email is required'` `400` messages); re-export shared DTOs in `apps/web/src/lib/api.ts`; refactor `apps/web/src/components/ContactForm.tsx` to `zodResolver(ContactSubmissionSchema)`, IME `onKeyDown` guard, and `focus-visible:ring-2`.
- [ ] **Step 4 (Verify GREEN):** Run `npm run test:unit && npm run typecheck && npm run build && npm audit --audit-level=high` → Expected: PASS, 0 errors, 0 warnings, 0 high/critical vulnerabilities, and `apps/api/dist/apps/api/src/index.js` exists.
- [ ] **Step 5 (Commit):** `git add package.json package-lock.json apps/api apps/web specs/contracts && git commit -m "feat(contracts): wire zero-build zod schemas and shared response DTOs"`

---

### Task 2: Portable `fe-kb` & `be-kb` Role Knowledge Packs (Unguided RED -> Pruned Guides -> Scanner)
**Files:** Create `.agents/skills/fe-kb/**` (`SKILL.md`, `.kbrc.json`, `scanner-rules.json`, `scripts/kb-cli.mjs`, `guides/index.md`, `5` guides), `.agents/skills/be-kb/**` (`SKILL.md`, `.kbrc.json`, `scanner-rules.json`, `scripts/kb-cli.mjs`, `guides/index.md`, `4` guides) | Modify `.agents/skills/using-superpowers/SKILL.md` | Test `scripts/kb-cli.test.mjs`
**Interfaces:**
- `fe-kb` guide IDs: `effect-boundaries-and-derived-state`, `component-granularity-and-state-placement`, `type-vs-interface-and-response-composition`, `zod-rhf-schema-validation`, `async-ux-and-accessibility-behaviors`.
- `be-kb` guide IDs: `query-optimization-and-eliminating-n-plus-1`, `transactions-concurrency-and-idempotency`, `zod-request-validation-and-error-envelopes`, `api-latency-pooling-and-bounded-payloads`.

- [ ] **Step 1 (RED — Subagent Probes & Failing Unit Tests):** Dispatch unguided `research` subagent probes for FE (`useEffect` derived state + RHF/Zod + props drilling) and BE (`pool.query('BEGIN')` + N+1 loop + Express Zod boundary) to capture verbatim stale-weight mistakes. Add failing `validatePack`, BM25 `searchGuides`, and `scanTarget` assertions for `fe-kb` and `be-kb` in `scripts/kb-cli.test.mjs`.
- [ ] **Step 2 (Verify RED):** Run `node --test scripts/kb-cli.test.mjs` → Expected: FAIL (`fe-kb` and `be-kb` directories/guides missing).
- [ ] **Step 3 (GREEN):** Initialize `.agents/skills/fe-kb` and `.agents/skills/be-kb` via `kb-cli.mjs init`, author the `5` FE guides + `4` BE guides (First-Match Decision Trees + symmetric `**DO**`/`**DON'T**` + `When NOT to replace legacy code`), configure `scanner-rules.json` (`keepWhen`/`dropWhen`), and add `fe-kb` + `be-kb` routing entries in `.agents/skills/using-superpowers/SKILL.md`.
- [ ] **Step 4 (Verify GREEN):** Run `node --test scripts/kb-cli.test.mjs && npm run check:harness` → Expected: PASS, `0` errors.
- [ ] **Step 5 (Commit):** `git add .agents/skills/fe-kb .agents/skills/be-kb .agents/skills/using-superpowers/SKILL.md scripts/kb-cli.test.mjs && git commit -m "feat(skills): add portable fe-kb and be-kb knowledge packs"`

---

### Task 3: Portable `arch-kb` & `qa-kb` Role Knowledge Packs (Unguided RED -> Pruned Guides -> Scanner)
**Files:** Create `.agents/skills/arch-kb/**` (`SKILL.md`, `.kbrc.json`, `scanner-rules.json`, `scripts/kb-cli.mjs`, `guides/index.md`, `4` guides), `.agents/skills/qa-kb/**` (`SKILL.md`, `.kbrc.json`, `scanner-rules.json`, `scripts/kb-cli.mjs`, `guides/index.md`, `4` guides) | Modify `.agents/skills/using-superpowers/SKILL.md` | Test `scripts/kb-cli.test.mjs`
**Interfaces:**
- `arch-kb` guide IDs: `response-envelopes-and-dto-inheritance`, `scale-ready-stateless-design`, `postgres-schema-indexing-and-migrations`, `domain-triage-and-failure-isolation`.
- `qa-kb` guide IDs: `testing-trophy-and-high-signal-assertions`, `adversarial-ux-and-edge-case-matrix`, `accessibility-focus-and-responsive-probes`, `playwright-anti-flake-and-live-probing`.

- [ ] **Step 1 (RED — Subagent Probes & Failing Unit Tests):** Dispatch unguided `research` subagent probes for Arch (DTO inheritance depth, premature Redis/Queue infra, composite index ordering) and QA (one-shot `isVisible()`, adversarial double-submit & input preservation). Add failing `validatePack`, BM25 `searchGuides`, and `scanTarget` assertions for `arch-kb` and `qa-kb` in `scripts/kb-cli.test.mjs`.
- [ ] **Step 2 (Verify RED):** Run `node --test scripts/kb-cli.test.mjs` → Expected: FAIL (`arch-kb` and `qa-kb` directories/guides missing).
- [ ] **Step 3 (GREEN):** Initialize `.agents/skills/arch-kb` and `.agents/skills/qa-kb` via `kb-cli.mjs init`, author the `4` Arch guides + `4` QA guides + `scanner-rules.json`, and register `arch-kb` + `qa-kb` in `.agents/skills/using-superpowers/SKILL.md`.
- [ ] **Step 4 (Verify GREEN):** Run `node --test scripts/kb-cli.test.mjs && npm run check:harness` → Expected: PASS, `0` errors.
- [ ] **Step 5 (Commit):** `git add .agents/skills/arch-kb .agents/skills/qa-kb .agents/skills/using-superpowers/SKILL.md scripts/kb-cli.test.mjs && git commit -m "feat(skills): add portable arch-kb and qa-kb knowledge packs"`

---

### Task 4: Role Skill & `AGENTS.md` Wiring, Guided Uplift Verification, Global Sync & Full Repo Gate
**Files:** Modify `apps/web/AGENTS.md`, `apps/api/AGENTS.md`, `apps/e2e/AGENTS.md`, `.agents/skills/fe-shadcn-clean/SKILL.md`, `.agents/skills/be-express-pg/SKILL.md`, `.agents/skills/tech-lead-contract/SKILL.md`, `.agents/skills/qa-vercel-audit/SKILL.md`, `progress.md`, `session-handoff.md`, `.agents/STATE.md` | Test `scripts/kb-cli.test.mjs`
**Interfaces:**
- Role `SKILL.md` files (`fe-shadcn-clean`, `be-express-pg`, `tech-lead-contract`, `qa-vercel-audit`) link their matching `.agents/skills/<role>-kb/scripts/kb-cli.mjs` on-demand `search` + `retrieve` workflow while explicitly preserving strict JSON return schemas.

- [ ] **Step 1 (RED):** Add failing assertions in `scripts/kb-cli.test.mjs` verifying that `fe-shadcn-clean`, `be-express-pg`, `tech-lead-contract`, and `qa-vercel-audit` wire `.agents/skills/{fe,be,arch,qa}-kb/scripts/kb-cli.mjs` and preserve JSON schema mode.
- [ ] **Step 2 (Verify RED):** Run `node --test scripts/kb-cli.test.mjs` → Expected: FAIL (role `SKILL.md` files do not reference `<role>-kb` yet).
- [ ] **Step 3 (GREEN):** Update `apps/{web,api,e2e}/AGENTS.md` with concise Tier-1 invariants (`useEffect` ban list, `interface` vs `type`, `<= 2`-hop props, `zodResolver`; N+1 & `pool.connect()` transaction invariants; adversarial QA checks) and wire `<role>-kb` retrieval into the 4 role `SKILL.md` files (`<= 80` lines each). Run guided `GREEN` subagent verification across all 4 role packs, sync `fe-kb`, `be-kb`, `arch-kb`, and `qa-kb` byte-for-byte to `~/.gemini/config/skills/`, and update `progress.md`, `session-handoff.md`, and `.agents/STATE.md`.
- [ ] **Step 4 (Verify GREEN):** Run `./init.sh && npm run test:e2e && npm audit --audit-level=high` → Expected: PASS, `0` errors, `0` warnings, `0` vulnerabilities.
- [ ] **Step 5 (Commit):** `git add apps .agents progress.md session-handoff.md scripts/kb-cli.test.mjs && git commit -m "feat(agents): wire role skills to portable kb packs and tier-1 invariants"`
