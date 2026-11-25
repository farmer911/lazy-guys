---
name: finishing-a-development-branch
description: Use when implementation is complete, all repository gates pass, and you need to merge, open a PR, or clean up a feature branch or worktree. Not for in-progress work, failing suites, or direct commits on main without branch integration.
---

# Finishing a Development Branch

**Flow:** Verify gates → Detect worktree state → Confirm base branch → Present options → Execute & clean up.

## Step 1: Verify Full Suite

Run the repository verification gate before offering integration options:

```bash
./init.sh && npm run test:e2e
```

If any check fails, stop and report failures — never offer merge/PR options on a red tree. For branches delivering a `feature_list.json` feature, confirm independent `evaluating-features` `PASS` sign-off (`evaluations/<feat-id>.json`) before integrating into `<base-branch>`.

## Step 2: Detect Workspace & Base Branch

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
MAIN_ROOT=$(cd "$GIT_COMMON/.." 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

Confirm `<base-branch>` (e.g. `main`) if it wasn't explicitly stated.

## Step 3: Present Options

- **Named branch (normal repo or worktree):**
  1. Merge back to `<base-branch>` locally
  2. Push and create a Pull Request
  3. Keep the branch as-is
- **Detached HEAD:** Only offer (1) Push as new branch & create PR, or (2) Keep as-is.

Wait for the user's choice. Only offer **Discard** if the user explicitly asks to throw the work away, and require typing `discard` to confirm before `git branch -D`.

## Step 4: Execute Choice

- **Option 1 (Merge locally):** Switch to `MAIN_ROOT`, checkout & pull `<base-branch>`, `git merge <feature-branch>`, re-run `./init.sh && npm run test:e2e`, clean up worktree (Step 5), then `git branch -d <feature-branch>`. If merged tests fail, stop and keep branch/worktree intact.
- **Option 2 (Push & PR):** `git push -u origin <feature-branch>` (never `--force`), open PR against `<base-branch>`, preserve worktree for review iterations.
- **Option 3 (Keep as-is):** Report branch name and worktree path.

## Step 5: Safe Worktree Cleanup (Option 1 & Confirmed Discard Only)

Only remove worktrees under `.worktrees/` or `worktrees/` from outside `WORKTREE_PATH`:

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune
```

If removal is refused due to untracked/modified files, **never `--force`** — show `git -C "$WORKTREE_PATH" status --porcelain -uall` and ask whether to commit, move, or delete them.

## Red Flags

| Excuse | Reality |
|--------|---------|
| "Tests passed earlier" | Re-run `./init.sh` on the exact tree being integrated. |
| "Push rejected — force-push it" | Never force-push; investigate remote divergence first. |
| "Removal refused — add `--force`" | Refusal protects uncommitted files; ask the user first. |
