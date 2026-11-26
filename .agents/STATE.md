# Active Task State

## Goal
Build the `authoring-agent-knowledge` Meta-Skill (Full Kit with zero-dep Node ESM `kb-cli.mjs`: `init`, BM25 `search`, `.kbrc`-gated `retrieve`, `keepWhen`/`dropWhen` `scan`, `validate`), dogfood it to build `modern-fullstack-guidance`, sync both to Global (`~/.gemini/config/skills/`), export the standalone multi-agent plugin (`/Users/phucnguyen/Dev/modern-fullstack-guidance`), and lock repository harness gates.

## Checklist
- [x] Step 1 (RED Baselines): Verify `./init.sh` baseline, capture unguided subagent baselines for Meta-Skill & Fullstack Pack, and write failing `scripts/kb-cli.test.mjs`
- [x] Step 2 (GREEN CLI): Implement zero-dep `.agents/skills/authoring-agent-knowledge/scripts/kb-cli.mjs` and pass `node --test scripts/kb-cli.test.mjs`
- [x] Step 3 (GREEN Meta-Skill): Author `authoring-agent-knowledge/SKILL.md` + `references/*` addressing RED failures and verify with guided subagent
- [x] Step 4 (GREEN Dogfood Pack): Scaffold & author `.agents/skills/modern-fullstack-guidance/` (`SKILL.md`, 6 pruned guides, `scanner-rules.json`, `.kbrc.json`), run live read-only `scan` on `apps/web/src`, and verify guided subagent uplift
- [x] Step 5 (Sync & Export): Sync both skills byte-for-byte to `~/.gemini/config/skills/` and export `/Users/phucnguyen/Dev/modern-fullstack-guidance` via `--standalone-plugin`
- [x] Step 6 (Harness Gate & Proof): Wire `using-superpowers`, `package.json`, `check-harness.mjs` + tests, update `progress.md` / `session-handoff.md`, run fresh `./init.sh`, and write `walkthrough.md`
