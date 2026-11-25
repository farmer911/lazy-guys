---
name: using-superpowers
description: Use when routing a new single-agent engineering task to the matching workflow skill before planning or editing. Not for read-only Q&A, trivial 1-file tweaks, or subagents dispatched with an explicit [AGENT_ROLE] prompt.
---

<SUBAGENT-STOP>
If you were dispatched as a subagent (or Role-DAG worker with `[AGENT_ROLE: ...]`), ignore this skill and follow your assigned role skill only.
</SUBAGENT-STOP>

# Skill Routing

## Operating Mode Selection

Pick **one** mode — never stack both ceremonies on the same task:

1. **Multi-Agent Role-DAG (`run_workflow`):** For full-stack `feature_list.json` delivery or multi-domain bugs, run `.agents/workflows/{project_init,feature_delivery,bugfix}.py`. Skip `brainstorming` / `writing-plans` / `executing-plans`.
2. **Single-Agent Session:** Match the narrowest skill whose `Use when...` trigger fits and whose `Not for...` boundary does not exclude the task:
   - Ambiguous new feature/design → `brainstorming` → `writing-plans` → `executing-plans`
   - Clear multi-file coding/config task (`>= 2` files or gates) → `task-guardrail`
   - Bug or test failure → `systematic-debugging`
   - Pre-`"done"` live audit → `evaluating-features` (mandatory)
3. **Skip skill ceremony** for pure Q&A, read-only audits, or single-line 1-file tweaks — answer directly with verified facts.

## Priority & Precedence

- **User instructions (`AGENTS.md`, `GEMINI.md`, direct requests)** override skills.
- **Process skills before implementation skills:** investigate/plan first, then edit.
- Announce the active skill in one line (`Using [skill] to [purpose]`) and follow its checklist without inventing extra ceremony.

## Platform Reference

- Antigravity tool mapping: `references/antigravity-tools.md`
