---
name: using-git-worktrees
description: Use when starting isolated feature work or executing an implementation plan on a separate branch without disturbing the main working tree. Not for quick fixes on the active branch, read-only research, or Role-DAG subagents with pre-managed workspaces.
---

# Using Git Worktrees

**Core principle:** Detect existing isolation first → prefer native workspace tools → fall back to `git worktree add` → verify clean baseline (`./init.sh`).

## Step 0: Detect Existing Isolation

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
SUPERPROJECT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
```

- If `GIT_DIR != GIT_COMMON` and `SUPERPROJECT` is empty: already in a linked worktree — skip to Step 2.
- Otherwise: honor any explicit user preference; if none was stated, ask once before creating a worktree. If declined, work in place and run Step 2.

## Step 1: Create Isolated Workspace

1. **Native tool first:** Use any platform-native workspace/worktree tool if available (avoid manual `git worktree add` when the harness manages isolation).
2. **Git fallback (`.worktrees/`):**
   - Prefer `.worktrees/` (or existing `worktrees/`). Verify it is gitignored before creating:
     ```bash
     git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
     ```
     If not ignored, add it to `.gitignore` and commit before proceeding.
   - Create worktree:
     ```bash
     git worktree add ".worktrees/$BRANCH_NAME" -b "$BRANCH_NAME"
     cd ".worktrees/$BRANCH_NAME"
     ```
   - If sandbox permissions block worktree creation, inform the user and work in place.

## Step 2: Workspace Setup & Clean Baseline

```bash
./init.sh
```

(`./init.sh` bootstraps `.env` with an available PostgreSQL port, sets `core.hooksPath=.githooks`, installs dependencies, applies schema/seed, and runs `check:harness`, `typecheck`, `test:unit`, and `build`.)

- If baseline checks fail, report failures and ask whether to fix them before starting new scope.
- When clean, report: `Worktree ready at <path> (<N> tests passing, 0 failures)`.

## Red Flags

| Excuse | Reality |
|--------|---------|
| "I'm obviously not in a worktree" | Run Step 0; submodules and harness workspaces fool eyeballing. |
| "`.worktrees/` is probably gitignored" | Run `git check-ignore` first so worktree contents never get staged. |
| "Skip baseline tests on a fresh branch" | Dirty baselines make later failures ambiguous; verify now. |
