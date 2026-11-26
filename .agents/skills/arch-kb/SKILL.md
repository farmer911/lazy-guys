---
name: arch-kb
description: >-
  Use when designing shared API response envelopes, composing TypeScript DTOs and Zod schemas across trust boundaries, planning stateless horizontal scaling, ordering PostgreSQL composite or partial indexes and zero-downtime migrations, or triaging CONTRACT_GAP vs BE_DEVIATION blast radius.
  Not for React visual styling, single-component state hooks, or Playwright selector syntax.
---

# Architecture & Contract Knowledge Pack (`arch-kb`)

Consult verified architecture, contract, scaling, and PostgreSQL indexing rules **before** locking `specs/contracts/*.ts`, editing `db/schema.sql`, or proposing new infrastructure.

## Primary Workflow

### Step 1. Normalize Query & Search
Run [scripts/kb-cli.mjs](scripts/kb-cli.mjs) with a **2–5 word action-oriented English query** (`<verb/noun> + <architectural primitive>`, omitting app-specific route or feature names; split multi-topic decisions into separate searches):

```sh
node <skill-dir>/scripts/kb-cli.mjs search "<query>" --dir <skill-dir>
```

### Step 2. Retrieve Full Guide(s)
Fetch matching guide `id`(s) from Step 1 (comma-separated when multiple apply):

```sh
node <skill-dir>/scripts/kb-cli.mjs retrieve "<id1,id2>" --dir <skill-dir>
```

- If output begins with `[SAVED_TO_FILE] <path>`, read `<path>` in full with `read_file`.
- If output reports `[GATE_LOCKED]`, respect maturity gates in [.kbrc.json](.kbrc.json) unless the user explicitly opts in.

### Step 3. Apply Decision Trees & Guardrails
Follow each guide's **First-Match Decision Tree**, **DO / DON'T** pairs, and **When NOT to replace legacy code** exceptions without introducing `any` casts, `@ts-ignore` suppressions, or premature infrastructure.

### Step 4. Conditional Citation Disclosure
- **Prose response mode (default):** End your response with `### Knowledge Guidance Applied` containing one bullet per applied `<id>`:
  `- **\`<id>\`**: <decision & pitfall prevented> ("<short verbatim quote of specific DO/DON'T rule>").`
  Never quote generic intro text or guess IDs from memory.
- **Machine-parsed JSON schema mode:** When the caller prompt mandates strict JSON or fixed schema output (such as `[AGENT_ROLE: tech-lead]` returning `TECH_LEAD_CONTRACT_SCHEMA`, `TECH_LEAD_TRIAGE_SCHEMA`, or `BUGFIX_TRIAGE_SCHEMA`), omit prose disclosure completely so JSON serialization stays valid.

## Legacy Architecture Audit Flow (Optional)
When asked to scan an existing codebase for stateful scaling blockers or transactional index hazards, run [scripts/kb-cli.mjs](scripts/kb-cli.mjs) with [scanner-rules.json](scanner-rules.json):

```sh
node <skill-dir>/scripts/kb-cli.mjs scan <target-path> --dir <skill-dir> --json
```

Evaluate every finding against its `keepWhen` and `dropWhen` criteria. Never break valid fallbacks or add ignore comments solely to force `0` findings.

## Catalog Reference
- Guide manifest: [guides/index.md](guides/index.md)
