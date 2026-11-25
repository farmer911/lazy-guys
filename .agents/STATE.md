# Active Task State (Crash-Safe Checkpoint)

> Updated BEFORE Step 1 of any multi-step task/plan and ticked after each step so work can resume immediately after a power outage, disconnect, or new session.
> Auto-logged tool & token checkpoints live in `.agents/logs/session-checkpoint.md` (gitignored).

## Current Task

- **Goal:** Ship 3-layer Anti-Tunnel-Vision combo (orphan skill-file gate in `check-harness.mjs`, TDD-tested `adversarial-audit/SKILL.md`, `AGENTS.md` anchor) + fix all 5 live red-team bugs surfaced during `adversarial-audit` testing.
- **Status:** Complete
- **Last Updated:** 2026-11-26 00:37

## Plan & Progress

- [x] RED: Added failing tests for orphan skill files (`check-harness.test.mjs`) and transcript non-zero exit detection (`agent-hooks.test.mjs`)
- [x] GREEN: Shipped transitive orphan skill-file gate, `adversarial-audit/SKILL.md` (`45` lines), `AGENTS.md` + `using-superpowers` routing, and fixed 5 real hook bypasses (live `transcript.jsonl` exit-code check, dot-prefixed `REPO_PATH_TOKEN_RE` lookbehind, `;`/`||` exit-masking, shell `feature_list.json` mutation lock, `GENERIC` transcript filter)
- [x] VERIFY GREEN: Subagent complied with `adversarial-audit/SKILL.md` and caught live bypasses; all `71/71` unit/integration tests green
- [x] GATE & SHIP: Run `./init.sh`, commit and push to `origin/main`

## Resume Notes

- All harness gates, skills, and red-team fixes committed and pushed cleanly to `origin/main`.
