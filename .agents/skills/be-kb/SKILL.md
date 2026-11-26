---
name: be-kb
description: >-
  Use when implementing, reviewing, or optimizing Express routes, node-postgres (pg) SQL queries, N+1 elimination, pool.connect() transactions, ON CONFLICT concurrency/idempotency, Zod request validation, error envelopes, or connection pooling in backend TypeScript code.
  Not for frontend React UI (use fe-kb), database schema DDL ownership (use tech-lead-contract), or live QA evaluation (use qa-kb).
---

# Backend Express & PostgreSQL Knowledge Pack (`be-kb`)

Search and retrieve verified Express, Zod, and `node-postgres` (`pg`) guidance **before** writing SQL queries, transactions, or route validation from stale training weights.

## Primary Workflow

### Step 1. Normalize Query & Search
Run [scripts/kb-cli.mjs](scripts/kb-cli.mjs) (where `<skill-dir>` is `.agents/skills/be-kb` from workspace root) with a **2–5 word action-oriented English query** (`<verb> + <backend/SQL primitive>`):
- **Keep queries sharp:** Omit project-specific table or route names; split multi-concern tasks into separate `search` calls (e.g., `"eliminate n plus 1 query"`, `"postgres transaction pool connect"`, `"zod validate express request"`, `"connection pool timeout payload"`).

```sh
node <skill-dir>/scripts/kb-cli.mjs search "<query>" --dir <skill-dir>
```

### Step 2. Retrieve Full Guide(s)
Fetch matching guide `id`(s) from Step 1 (comma-separated when multiple apply):

```sh
node <skill-dir>/scripts/kb-cli.mjs retrieve "<id1,id2>" --dir <skill-dir>
```

- If output starts with `[SAVED_TO_FILE] <path>`, read `<path>` in full using `read_file`.
- If output reports `[GATE_LOCKED]`, respect [.kbrc.json](.kbrc.json) (`allowExperimental` / `allowVolatile`) unless the user explicitly opts in.

### Step 3. Apply Decision Rules & Type Hygiene
Verify your implementation against every retrieved guide before running tests:
- Follow the **First-Match Decision Tree**, **DO / DON'T** rules, and **When NOT to replace legacy code** exceptions.
- Maintain strict TypeScript hygiene (`0` `any`, `0` `@ts-ignore` / `@ts-expect-error`) and match `specs/contracts/*` shapes verbatim.

### Step 4. Conditional Citation Disclosure
- **Prose response mode (default):** End your response with `### Knowledge Guidance Applied` listing one bullet per applied `<id>`:
  `- **\`<id>\`**: <choice & pitfall prevented> ("<short verbatim quote of the specific DO/DON'T rule>").`
  Never quote generic intro text or guess IDs from memory.
- **Machine-parsed schema mode:** If the caller prompt mandates strict JSON or fixed schema output (such as `[AGENT_ROLE: be]` `BE_SCHEMA` responses), omit all prose citation disclosure so JSON serialization stays valid.

## Legacy Modernization Flow (Optional)
Only when asked for a backend legacy-pattern scan or audit, run [scripts/kb-cli.mjs](scripts/kb-cli.mjs) against [scanner-rules.json](scanner-rules.json):

```sh
node <skill-dir>/scripts/kb-cli.mjs scan <target-path> --dir <skill-dir> --json
```

Evaluate every finding against its `keepWhen` and `dropWhen` rubrics. Never break safe fallbacks or add ignore comments solely to force `0` findings.

## Catalog Reference
- Guide manifest: [guides/index.md](guides/index.md)
