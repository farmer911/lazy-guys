---
name: modern-fullstack-guidance
description: >-
  Use when implementing, reviewing, or modernizing HTML/CSS/React UI overlays, link-button semantics, accessible or IME-safe forms, modern JavaScript cloning/sorting/grouping/abort APIs, WebMCP browser tools, or PostgreSQL calendar-date handling.
  Not for Docker/CI infrastructure scripts, pure SQL schema DDL unrelated to date types, or [AGENT_ROLE] DAG workers unless explicitly requested.
---

# Modern Fullstack Guidance

Search and retrieve verified modern web, TypeScript, and PostgreSQL pitfalls **before** writing ad-hoc code from stale training weights or adding extra npm packages.

## Primary Workflow

### Step 1. Normalize Query & Search
Run [scripts/kb-cli.mjs](scripts/kb-cli.mjs) with a **2–5 word action-oriented English query** (`<verb> + <UI/platform/data primitive>`):
- **Keep queries generic:** Omit framework/project names (`React`, `Tailwind`, `Portfolio`, route/file names). Split multi-feature tasks into separate `search` calls (e.g., `"modal confirmation dialog"`, `"button styled anchor link"`, `"ime enter submit textarea"`).

```sh
node <skill-dir>/scripts/kb-cli.mjs search "<query>" --dir <skill-dir>
```

### Step 2. Retrieve Full Guide(s)
Pass matching `id`(s) from Step 1 (comma-separated when multiple apply):

```sh
node <skill-dir>/scripts/kb-cli.mjs retrieve "<id1,id2>" --dir <skill-dir>
```

- If output begins with `[SAVED_TO_FILE] <path>`, read `<path>` in full using `read_file`.
- If output reports `[GATE_LOCKED]`, respect [.kbrc.json](.kbrc.json) (`allowExperimental` / `allowVolatile`) unless the user explicitly opts in.

### Step 3. Verify Guidance Compliance
Cross-check your code against every retrieved guide before finishing:
- Apply the **First-Match Decision Tree**, mandatory companion CSS/ARIA attributes, and strict TypeScript `.d.ts` augmentations (never `as any` or `@ts-ignore`).
- Respect **When NOT to replace legacy code** whenever existing callers rely on load-bearing side effects.

### Step 4. Conditional Citation Disclosure
- **Prose response mode (default):** End your response with `### Knowledge Guidance Applied` listing one bullet per applied `<id>`:
  `- **\`<id>\`**: <non-obvious choice & pitfall prevented> ("<short verbatim quote of the specific DO/DON'T rule>").`
  Never quote generic intro text or guess IDs from memory.
- **Machine-parsed schema mode:** If the caller prompt mandates strict JSON or fixed schema output (such as `[AGENT_ROLE: ...]` DAG workers), omit prose disclosure so JSON serialization stays valid.

## Legacy Modernization Flow (Optional)
Only when asked for a broad legacy-pattern scan or modernization audit, run [scripts/kb-cli.mjs](scripts/kb-cli.mjs) against [scanner-rules.json](scanner-rules.json):

```sh
node <skill-dir>/scripts/kb-cli.mjs scan <target-path> --dir <skill-dir> --json
```

Evaluate every finding against its `keepWhen` and `dropWhen` rubrics. Never edit safe fallbacks or add suppression comments solely to force `0` findings.

## Catalog Reference
- Guide manifest: [guides/index.md](guides/index.md)
