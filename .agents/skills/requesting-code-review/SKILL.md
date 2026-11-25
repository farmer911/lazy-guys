---
name: requesting-code-review
description: Use when dispatching an independent static git-diff review after a complex multi-file task or refactor before merging. Not for final live runtime feature sign-off (use evaluating-features) or trivial 1-file edits.
---

# Requesting Code Review

Dispatch a fresh-context code reviewer subagent on a git commit range — never pass your whole session history.

## Scope Boundary vs `evaluating-features`

- `requesting-code-review`: **Optional static git-diff review** mid-branch (architecture, edge cases, readability, maintainability).
- `evaluating-features` + `qa-vercel-audit`: **Mandatory live runtime evaluation** (HTTP + PostgreSQL + rendered DOM) required to produce `evaluations/<feat-id>.json` (`PASS`) before marking any `feature_list.json` item `"done"`. Static review never substitutes for live evaluation.

## How to Dispatch

1. **Capture git range:**
   ```bash
   BASE_SHA=$(git merge-base origin/main HEAD) # or task BASE SHA
   HEAD_SHA=$(git rev-parse HEAD)
   ```
2. **Dispatch reviewer subagent** using [code-reviewer.md](code-reviewer.md), filling:
   - `{DESCRIPTION}` — concise summary of what changed
   - `{PLAN_OR_REQUIREMENTS}` — spec/contract path or acceptance criteria
   - `{BASE_SHA}` and `{HEAD_SHA}`
3. **Act on findings:**
   - **Critical / Important:** Fix via TDD before proceeding.
   - **Minor:** Record in `progress.md` or fix if trivial.
   - **Disputed finding:** Push back with concrete code/test evidence, never silently ignore.

## Red Flags

| Excuse | Reality |
|--------|---------|
| "I'll review my own diff inline" | Self-review shares your blind spots and burns main context; dispatch a fresh reviewer. |
| "Static review passed, mark feature done" | Only `evaluating-features` live verification can certify `"done"`. |
| "Skip Important issues — they're small" | Unfixed Important issues compound across tasks; fix before advancing. |

Template: [code-reviewer.md](code-reviewer.md)
