---
name: fe-kb
description: >-
  Use when implementing, reviewing, or refactoring React components, useEffect boundaries, derived state, 2-tier shadcn/ui granularity, prop-drilling elimination, zustand selectors, TypeScript interface vs type DTOs, Zod v4 + React Hook Form validation, or async/accessibility UX in apps/web.
  Not for backend Express/PostgreSQL query logic, SQL schema DDL, or independent QA evaluation sign-off.
---

# Frontend Engineering Knowledge Pack (`fe-kb`)

Search and retrieve empirically pruned React, TypeScript, form-validation, and accessibility guides **before** writing ad-hoc state sync, inline Context providers, shadow DTO types, or custom form handlers.

## Primary Workflow

### Step 1. Normalize Query & Search
Run [scripts/kb-cli.mjs](scripts/kb-cli.mjs) (`<skill-dir>` is `.agents/skills/fe-kb` in this repository) with a **2–5 word action-oriented English query** (`<verb/symptom> + <UI/state primitive>`, omitting app-specific component or route names; split multi-part tasks into separate searches):

```sh
node <skill-dir>/scripts/kb-cli.mjs search "<query>" --dir <skill-dir>
```

Example queries: `"derived state effect reset"`, `"avoid prop drilling zustand"`, `"interface vs type dto"`, `"zod resolver hook form"`, `"double submit focus ring"`.

### Step 2. Retrieve Full Guide(s)
Fetch matching `id`(s) from Step 1 (comma-separated when multiple apply):

```sh
node <skill-dir>/scripts/kb-cli.mjs retrieve "<id1,id2>" --dir <skill-dir>
```

- If output begins with `[SAVED_TO_FILE] <path>`, read `<path>` in full using `read_file`.
- If output reports `[GATE_LOCKED]`, respect maturity policy in [.kbrc.json](.kbrc.json) (`allowExperimental` / `allowVolatile`) unless the user explicitly opts in.

### Step 3. Apply Decision Rules & Gotchas
Cross-check every edited file against the retrieved guide's **First-Match Decision Tree**, symmetric **DO / DON'T** rules, and **When NOT to replace legacy code** exceptions (100% arrow functions in `apps/web/src/`, zero `any`, zero `@ts-ignore`).

### Step 4. Conditional Citation Disclosure
- **Prose response mode (default):** End your response with `### Knowledge Guidance Applied` listing one bullet per applied `<id>`:
  `- **\`<id>\`**: <choice & pitfall prevented> ("<short verbatim quote of specific DO/DON'T rule>").`
  Never quote generic intro prose or guess guide IDs from memory.
- **Machine-parsed schema mode:** If the caller prompt mandates strict JSON or fixed schema output (such as `FE_SCHEMA` in `[AGENT_ROLE: fe]` DAG workers), **omit prose disclosure** so strict JSON serialization stays valid.

## Legacy Modernization Flow (Optional)
Only when asked for a legacy-pattern scan across frontend source files, run [scripts/kb-cli.mjs](scripts/kb-cli.mjs) against [scanner-rules.json](scanner-rules.json):

```sh
node <skill-dir>/scripts/kb-cli.mjs scan <target-path> --dir <skill-dir> --json
```

Evaluate every finding against its `keepWhen` and `dropWhen` rubrics. Never break valid fallbacks or add ignore comments solely to force `0` findings.

## Rationalization Prevention

| Excuse | Reality |
| :--- | :--- |
| *"I already know React `useEffect`, Context, and `react-hook-form`."* | Unguided runs pass unmemoized `<Context value={{...}}>`, mirror RHF state in `useState`, hand-roll email regexes, and miss IME/focus-visible guards. Search and retrieve first. |
| *"I'll append `### Knowledge Guidance Applied` after my JSON block."* | Trailing prose corrupts `FE_SCHEMA` strict JSON parsing in Role-DAG workflows. Omit prose citations in strict JSON mode. |

## Red Flags — STOP Immediately

- Writing `useEffect` state sync, `<Context value={{...}}>`, or `useForm` handlers before retrieving matching `fe-kb` guides
- Emitting prose citations when the caller requires strict JSON (`FE_SCHEMA`)
- Deleting valid `keepWhen` code solely to silence `scan` findings

## Catalog Reference
- Guide manifest: [guides/index.md](guides/index.md)
