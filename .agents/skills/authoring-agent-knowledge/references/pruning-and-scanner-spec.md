# Eval-Driven Pruning, `.kbrc.json` Gates & Static Scanner Spec

## 1. Closed-Loop Uplift & Token Pruning Protocol

Never guess what an LLM needs to be taught. Measure **Opportunity** (`100% - unguided pass rate`) and **Uplift** (`guided - unguided pass rate`) before finalizing a guide:

1. **Design a Natural Prompt:** Describe the user-visible goal (*"add a Delete confirmation modal and Vietnamese quick-chat input"*), **never** naming target APIs (`<dialog>`, `overscroll-behavior`, `isComposing`, `field-sizing`).
2. **Run Unguided Control:** Dispatch a fresh subagent without the pack.
   - **Prune:** Any requirement the unguided subagent already satisfies cleanly is dead token weight — delete it from your draft.
   - **Target:** Every mistake the unguided subagent makes (e.g., mutating `document.body.style.overflow = 'hidden'`, hallucinating `<Button asChild>` on a non-Slot button, missing `backdrop:overflow-hidden backdrop:overscroll-contain`, forgetting `autofocus` on `Cancel`) becomes an explicit `**DO**` / `**DON'T**` bullet.
3. **Run Guided Verification:** Dispatch a fresh subagent with the Knowledge Pack enabled and verify:
   - It formulates clean 2–5 word `search` queries and `retrieve`s the target guide IDs.
   - All baseline defects disappear (`0` regressions, strict TypeScript clean).
   - In prose mode, it cites the exact `<id>` and a verbatim rule quote from the retrieved guide.

---

## 2. Maturity Gating (`.kbrc.json`)

Keep bleeding-edge or single-engine APIs discoverable via `search` without polluting stable production codebases during `retrieve`:

```json
{
  "allowExperimental": false,
  "allowVolatile": false
}
```

- `"stable"`: Baseline widely supported or standard team convention — always retrievable.
- `"experimental"`: Origin trials, flag-gated APIs (e.g., WebMCP `navigator.modelContext`), or stage-3 proposals — `search` returns `"maturity": "experimental"`, while `retrieve` returns `[GATE_LOCKED]` unless `"allowExperimental": true`.
- `"volatile"`: Newly shipped (`< 3` months) single-engine features with shifting specs — locked unless `"allowVolatile": true`.

---

## 3. Deterministic Static Scanner (`scanner-rules.json`)

Only ~20% of domain guides have a deterministic static signature suitable for automated legacy scanning. Put those rules in `<pack-dir>/scanner-rules.json`:

```json
{
  "rules": [
    {
      "id": "no-json-roundtrip-clone",
      "guideId": "modern-clone-sort-groupby-abort",
      "pattern": "\\bJSON\\.parse\\(\\s*JSON\\.stringify\\(",
      "excludeLinePattern": "\\btoWireJson\\b",
      "flags": "g",
      "multiline": false,
      "fileExtensions": [".ts", ".tsx", ".js", ".jsx", ".mjs"],
      "message": "Avoid JSON.parse(JSON.stringify(...)) for in-memory cloning or immutable sorting; retrieve modern-clone-sort-groupby-abort.",
      "keepWhen": [
        "Caller intentionally normalizes a wire payload by invoking .toJSON(), converting Date instances to ISO strings, or stripping undefined keys.",
        "Input may hold functions, DOM nodes, or unwrapped reactive Proxy objects that would throw DataCloneError under structuredClone."
      ],
      "dropWhen": [
        "Occurrence is in a test fixture asserting JSON serialization behavior, vendor bundle, or generated code."
      ]
    }
  ]
}
```

### Mandatory Scanner Invariants (Enforced by `kb-cli.mjs validate`)
1. `guideId` **must** match an existing guide `id` in `guides/`.
2. `keepWhen` **must** be a non-empty array naming concrete semantic reasons to leave the legacy code intact.
3. `dropWhen` **must** be a non-empty array naming false-positive contexts to ignore.
4. **Anti-Gaming Clause:** Never instruct an agent to drive scan findings to `0` at all costs. Kept fallbacks and dropped lookalikes remain in the codebase legitimately — **never** delete safe fallbacks or litter production files with `// ignore` comments just to silence a regex.

---

## 4. Standalone Multi-Agent Plugin Packaging (`--standalone-plugin`)

Running `node <skill-dir>/scripts/kb-cli.mjs init <repo-dir> --name <pack-name> --standalone-plugin` creates a distribution-ready repository covering major coding agents out of the box:

- `plugin.json` & `.agents/plugins/marketplace.json` (Antigravity & open agent plugin standard)
- `.claude-plugin/plugin.json` (Claude Code)
- `.codex-plugin/plugin.json` (OpenAI Codex)
- `.cursor-plugin/plugin.json` (Cursor)
- `gemini-extension.json` (Gemini CLI)
- `package.json` (`contributes.chatSkills` for VS Code Copilot + `bin` entry pointing to `skills/<pack-name>/scripts/kb-cli.mjs`)
