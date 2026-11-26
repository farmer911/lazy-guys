# Guide Anatomy & Thin Router Blueprint

## 1. Thin Router `SKILL.md` Contract (`<= 120` Lines)

A Knowledge Pack's `SKILL.md` is a **query router and compliance contract**, never an encyclopedia. `kb-cli.mjs init` generates this exact skeleton:

1. **Trigger-Only Frontmatter (`Use when... Not for...`):**
   - List concrete symptoms, UI primitives, APIs, and domain tasks that must trigger retrieval **before** coding.
   - Declare explicit `Not for...` exclusions so unrelated tasks pay `0` retrieval cost.
2. **Step 1 — Query Normalization (`search`):**
   - Instruct the agent to formulate a **2–5 word action-oriented English query**: `<verb> + <UI/platform/domain primitive>`.
   - **Strip noise:** Omit framework names (`React`, `Express`, `Tailwind`) unless the pack is specifically about that framework, and omit project-internal component/route names so BM25 term weights stay sharp.
   - **Split compound prompts:** Break *" confirmation dialog with Vietnamese Enter-to-submit form"* into two separate `search` calls (`"modal confirmation dialog"` and `"ime enter submit textarea"`).
3. **Step 2 — Full Guide Retrieval (`retrieve`):**
   - Retrieve matching IDs via `node <skill-dir>/scripts/kb-cli.mjs retrieve "<id1,id2>" --dir <skill-dir>`.
   - Handle `[SAVED_TO_FILE]` spillover (`> 9.5 KB`) by reading the temporary file in full with `read_file`.
   - Respect `[GATE_LOCKED]` notices for `experimental` or `volatile` guides unless `.kbrc.json` or the user explicitly opts in.
4. **Step 4 — Conditional Verbatim Citation (Observable Predicate):**
   - **Prose responses:** Require ending the turn with `### Knowledge Guidance Applied` containing one bullet per applied `<id>` and a **short verbatim quote** of the exact `DO`/`DON'T` or gotcha rule that shaped the code (never generic intro prose, and never guessed from memory after context compaction).
   - **Machine-parsed responses:** Express the exception on an observable predicate: *"If the caller prompt mandates strict JSON or fixed schema output, omit prose disclosure so serialization stays valid."*
5. **Transitive File Reachability:**
   - Always link `guides/index.md`, `scanner-rules.json`, `.kbrc.json`, and `<pack-dir>/scripts/kb-cli.mjs` inside the generated pack's `SKILL.md`. Every guide `.md` file must appear in `guides/index.md`.

---

## 2. High-Density Guide Template (`guides/<category>/<id>.md`)

Every guide must stay `<= 250` lines (aim for `50–120` lines after pruning) and follow this exact layout:

```markdown
---
id: "kebab-case-matching-filename"
title: "Concise Action-Oriented Title"
description: "1-sentence summary of the capability and the primary pitfall prevented (indexed 2x in BM25)."
tags: ["primitive", "apiName", "symptom"]
maturity: "stable"
---

# Concise Action-Oriented Title

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Default case (state observable condition)

Use `<exact primitive/API>` when `<condition>`.

```ts
// Minimal, runnable, strict-TypeScript snippet (< 35 lines) showing WHY
```

- **DO** <mandatory companion rule or CSS/runtime guard that unguided models forget>.
- **DON'T** <exact legacy reflex from stale training weights>.

### Rule 2: Distinct secondary case (state observable condition)

- **DO** <specific alternative>.
- **DON'T** <cross-apply Rule 1 where it breaks>.

## When NOT to replace legacy code

- **Keep existing pattern when:** <load-bearing side effect, e.g., `.toJSON()` wire normalization, reactive `Proxy`, or target runtime below baseline>.
```

---

## 3. Anti-Pattern vs. Agent-Ready Comparison

### Bad (Wikipedia Prose Written for Humans — DO NOT WRITE)
- Spends 40 lines explaining what `JSON.stringify` is and listing 8 textbook rows (`BigInt`, `Symbol`, `NaN`) that every LLM already knows.
- Recommends `{...({ commandfor: id } as any)}` in React, violating strict TypeScript hygiene gates.

### Good (Pruned Agent-Ready Guidance)
- Zero textbook preamble; opens directly with **Rule 1 (`structuredClone` for plain state)** vs **Rule 2 (`arr.toSorted(compareFn)` when cloning only to sort)**.
- Calls out the **exact crash/regression traps**: `Proxy` / functions throwing `DataCloneError`, downstream callers relying on `Date -> ISO string` or `undefined` stripping, and `Object.groupBy()` returning a `null`-prototype object where `groups.hasOwnProperty(k)` throws `TypeError` (use `Object.hasOwn(groups, k)`).
- For newly shipped HTML attributes in strict TypeScript/React, provides a 4-line `src/types/html.d.ts` module augmentation instead of `as any`.
