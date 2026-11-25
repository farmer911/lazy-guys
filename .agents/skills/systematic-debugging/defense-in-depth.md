# Defense-in-Depth Validation

Adding validation at a single entry point leaves bugs reachable through alternate call paths, refactors, or direct API/DB writes.

**Core principle:** Validate invariants at every boundary data crosses so invalid state becomes structurally impossible.

## The Four Layers (`lazy-guy` Stack)

1. **Boundary Input Validation (UI / HTTP Route):**
   - Reject empty/whitespace strings, invalid email formats, and malformed JSON (`400`) in `apps/api/src/routes/*.ts` and `apps/web/src/components/*.tsx`.
2. **Domain & Serialization Validation (Service / Query):**
   - Enforce typed contracts (`specs/contracts/*.ts`), parameterized `$1, $2` queries, UTC-safe `DATE::text` (`YYYY-MM-DD`), and `NUMERIC::float8` casts.
3. **Storage & Environment Guards (PostgreSQL / Hooks):**
   - Enforce `NOT NULL`, `UNIQUE`, `CHECK` constraints in `db/schema.sql`, and enforce path/role/gate invariants in `scripts/agent-hooks.mjs` + `scripts/check-harness.mjs`.
4. **Forensic Diagnostics:**
   - Log structured context (status code, offending field, hook decision/reason in `.agents/logs/hook-events.jsonl`) so failures point straight to root cause.

## Applying the Pattern

1. **Trace full data flow** from user input or external hook payload to final sink.
2. **List every boundary** (form → API client → Express route → PostgreSQL → UI formatter).
3. **Add minimal validation at each layer** without duplicating speculative abstractions.
4. **Test each layer independently:** Verify bypassing Layer 1 (e.g., direct `POST /api/contact` skipping browser validation) is still rejected by Layer 2/3.
