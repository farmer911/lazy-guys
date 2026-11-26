---
name: qa-kb
description: >-
  Use when writing or reviewing Playwright E2E specs, planning Testing Trophy coverage, designing adversarial UX and destructive input probes, or auditing live keyboard focus, ARIA states, and mobile viewport overflow.
  Not for authoring production features in apps/web or apps/api without test/audit scope, or mechanical single-rule lint checks already enforced by repository hooks.
---

# QA & Live Verification Knowledge Pack

Retrieve empirically pruned E2E, accessibility, and adversarial QA verification patterns **before** writing Playwright specs or running live feature audits.

## Primary Workflow

### Step 1. Normalize Query & Search
Run [scripts/kb-cli.mjs](scripts/kb-cli.mjs) with a **2–5 word action-oriented English query** (`<verb/symptom> + <QA/browser primitive>`):
- **Keep queries generic:** Omit project/route names (`Portfolio`, `ContactForm`, `React`, `Tailwind`). Split multi-aspect audits into focused searches (e.g., `"testing trophy real database"`, `"adversarial double submit input"`, `"keyboard focus mobile overflow"`, `"playwright flaky wait locator"`).

```sh
node <skill-dir>/scripts/kb-cli.mjs search "<query>" --dir <skill-dir>
```

*(From the repository root, `<skill-dir>` is `.agents/skills/qa-kb`.)*

### Step 2. Retrieve Full Guide(s)
Fetch matching `id`(s) from Step 1 (comma-separated when multiple apply):

```sh
node <skill-dir>/scripts/kb-cli.mjs retrieve "<id1,id2>" --dir <skill-dir>
```

- If output starts with `[SAVED_TO_FILE] <path>`, read `<path>` in full with `read_file`.
- If output reports `[GATE_LOCKED]`, respect [.kbrc.json](.kbrc.json) (`allowExperimental` / `allowVolatile`) unless the user explicitly opts in.

### Step 3. Apply Verification Rules & Programmatic Probes
Cross-check every spec and live audit probe against retrieved guides:
- Encode runtime checks (`page.on('console')`, `page.on('pageerror')`, `scrollWidth <= innerWidth`) as executable assertions rather than prose claims.
- Keep all test helpers strict TypeScript with zero `any` casts or compiler suppressions, and respect **When NOT to replace legacy code**.

### Step 4. Conditional Citation Disclosure
- **Prose response mode (default):** End your turn with `### Knowledge Guidance Applied` listing one bullet per applied `<id>`:
  `- **\`<id>\`**: <verification choice & blind spot prevented> ("<short verbatim quote of specific DO/DON'T rule>").`
  Never quote generic intro prose or guess IDs from memory.
- **Machine-parsed schema mode (`QA_EVAL_SCHEMA` / Role-DAG):** If the caller prompt mandates strict JSON or fixed schema output (such as `[AGENT_ROLE: qa]` `QA_EVAL_SCHEMA` returns or `evaluations/<feat-id>.json`), omit `### Knowledge Guidance Applied` prose so JSON serialization stays valid.

## Anti-Flake Legacy Scan (Optional)
When auditing existing test suites for flaky patterns, run [scripts/kb-cli.mjs](scripts/kb-cli.mjs) against [scanner-rules.json](scanner-rules.json):

```sh
node <skill-dir>/scripts/kb-cli.mjs scan <target-path> --dir <skill-dir> --json
```

Evaluate each finding against its `keepWhen` and `dropWhen` rubrics. Never delete valid timing tests or add ignore comments solely to force `0` findings.

## Catalog Reference
- Guide manifest: [guides/index.md](guides/index.md)
