---
name: authoring-agent-knowledge
description: Use when designing, authoring, auditing, or packaging domain knowledge bases, API or platform reference guides, or searchable knowledge packs for AI coding agents to overcome stale training weights. Not for single-rule mechanical lint guards (use self-evolve), discipline or workflow skills without a reference corpus (use writing-skills), or routine feature implementation.
---

# Authoring Agent Knowledge Packs

Design on-demand, empirically pruned domain guidance for AI coding agents instead of textbook documentation written for humans.

```text
NEVER STUFF TEXTBOOK PROSE INTO CONTEXT — PRUNE WHAT UNGUIDED AGENTS ALREADY KNOW AND ROUTE ON DEMAND.
```

## Step 0: Sizing & Boundary Gate

Pick the lightest mechanism that fits before creating files:

1. **Deterministic static/hook invariant** (100% checkable via AST/regex with zero judgment) → stop and use `self-evolve` (`exit 1` script guard, not prose).
2. **Process or behavioral workflow** (TDD, debugging, code review without a multi-topic reference corpus) → use `writing-skills`.
3. **Tier 1 (`1–5` fixed folder rules, `< 80` lines)** → add directly to the scoped `AGENTS.md` (`0ms` tool latency).
4. **Tier 2 (`5–25` topic guides)** → Thin Router `SKILL.md` (`<= 120` lines) + `guides/index.md` manifest read via `read_file`.
5. **Tier 3 (`25+` guides, experimental maturity gates, legacy scanning, or multi-agent plugin distribution)** → scaffold with bundled zero-dependency [scripts/kb-cli.mjs](scripts/kb-cli.mjs) (`init`, `search`, `retrieve`, `scan`, `validate`).

## 5-Step Knowledge Pack Authoring Loop

### 1. RED: Unguided Probe & Eval-Driven Token Pruning
- Prompt a fresh subagent with a realistic developer task **without naming target APIs** and without guidance.
- **Delete every concept the unguided model already gets right.** Keep **only** stale-weight traps, non-obvious browser/runtime pitfalls, and edge cases where naive modernization breaks callers.
- Follow the uplift workflow and `.kbrc.json` gating rules in [references/pruning-and-scanner-spec.md](references/pruning-and-scanner-spec.md).

### 2. Scaffold Self-Contained Pack (`kb-cli.mjs`)
Initialize a workspace skill pack or a standalone multi-agent plugin repo (generating `plugin.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `gemini-extension.json`, and `package.json`):

```sh
# Workspace or global skill directory
node <this-skill-dir>/scripts/kb-cli.mjs init <target-skill-dir> --name <pack-name>

# Standalone multi-agent plugin repository
node <this-skill-dir>/scripts/kb-cli.mjs init <target-repo-dir> --name <pack-name> --standalone-plugin
```

- **Thin Router Budget (`SKILL.md <= 120` lines):** Teach **Query Normalization** (`2–5` word `<verb> + <platform/domain primitive>`, omitting framework/app nouns; split compound tasks into separate `search` calls) + `retrieve` + **Conditional Verbatim Citation**. Never leak guide answers into a bloated routing table inside `SKILL.md`.
- **Zero Orphan Files:** Keep every guide filename listed in `guides/index.md` and link `guides/index.md`, `scanner-rules.json`, `.kbrc.json`, and `<pack-dir>/scripts/kb-cli.mjs` from `SKILL.md` so strict repository harnesses verify 100% transitive reachability.

### 3. Author High-Density Guides (Decision Tree + Symmetric `DO` / `DON'T`)
Structure every `guides/<category>/<id>.md` (`<= 250` lines) using the exact template in [references/guide-anatomy-and-router.md](references/guide-anatomy-and-router.md):
- **YAML Frontmatter:** `id` (matching filename slug), `title`, `description`, `tags`, and `maturity` (`stable` | `experimental` | `volatile`).
- **First-Match Decision Tree:** Open with *"Pick the first rule that matches. If unsure, use Rule 1."*
- **Symmetric `**DO**` / `**DON'T**` + `When NOT to Replace`:** State exact semantic differences that break existing code (e.g., `Proxy` throwing `DataCloneError`, `.toJSON()` or `Date` string serialization expectations).
- **Strict Type Hygiene:** Never teach `as any` or `@ts-ignore` workarounds in TypeScript snippets; show `.d.ts` interface augmentation instead.

### 4. Configure `keepWhen` / `dropWhen` Static Scanner (Optional)
- Encode **only** deterministic legacy signatures (~20% of guides) in `scanner-rules.json` per [references/pruning-and-scanner-spec.md](references/pruning-and-scanner-spec.md).
- Every rule **must** include non-empty `keepWhen` (load-bearing legacy behavior that must stay untouched) and `dropWhen` (false-positive contexts).
- **Anti-Gaming Contract:** Never instruct agents to force `0` findings by breaking valid fallbacks or polluting code with ignore comments.

### 5. GREEN: Mechanical `validate` & Guided Uplift Proof
Run mechanical validation and re-test the baseline task with the pack enabled:

```sh
node <target-skill-dir>/scripts/kb-cli.mjs validate --dir <target-skill-dir>
```

## Rationalization Prevention

| Excuse | Reality |
| :--- | :--- |
| *"I'll include background definitions and comparison tables for completeness."* | LLMs already know textbook basics. Unpruned prose wastes tokens and buries the non-obvious gotchas that actually fail. |
| *"I'll summarize all 35 conventions in a big table inside `SKILL.md`."* | Agents skim routing-table summaries instead of retrieving full guides, missing critical edge-case exceptions. Keep `SKILL.md <= 120` lines. |
| *"I'll wire an external CLI like `@ast-grep/cli` or a Python vector server."* | Uninstalled external binaries fail in clean sandboxes and CI. Use bundled zero-dependency `node <skill-dir>/scripts/kb-cli.mjs`. |
| *"Every guide needs a static scanner rule and `0` remaining scan hits."* | Only ~20% of patterns are statically unambiguous; forcing `0` hits destroys valid `keepWhen` fallbacks or spawns suppression-comment spam. |
| *"Always append `### Knowledge Guidance Applied` at the end of every response."* | Unconditional prose breaks strict JSON subagents (such as `[AGENT_ROLE: ...]` DAG workers). Scope citation disclosure to prose mode only. |

## Red Flags — STOP Immediately

- Writing guides before running an unguided baseline probe to see what the model actually gets wrong
- `SKILL.md` exceeding `120` lines, or guide files missing from `guides/index.md`
- Guides lacking a First-Match Decision Tree or explicit `**DO**` and `**DON'T**` pairs
- Teaching `as any` casts or requiring uninstalled external binaries for search/scan
- Scanner rules missing `keepWhen` / `dropWhen` arrays or demanding `0` findings on safe fallbacks
