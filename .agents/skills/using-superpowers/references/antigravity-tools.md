# Antigravity (`agy`) Tool Mapping

Skills speak in actions ("dispatch a subagent", "create a todo", "read a file"). On Antigravity (`agy`) these resolve to the tools below.

| Action skills request | Antigravity equivalent |
|----------------------|------------------------|
| Dispatch a subagent (`Subagent (general-purpose):` template) | `invoke_subagent` with a built-in `TypeName` — `self` for full-capability work, `research` for read-only, `browser` for live UI verification |
| Task tracking ("create a todo", "mark complete") | a **task artifact** — `write_file` in the conversation artifact directory with `ArtifactMetadata` (see [Task tracking](#task-tracking)). **Not** `manage_task`, which manages background processes. |

## Task tracking

Antigravity has **no todo tool** (`manage_task` manages background processes — `list`/`kill`/`status`/`send_input` — it is *not* a checklist). When a skill says to create a todo list or track tasks, maintain a markdown checklist artifact in `<appDataDir>/brain/<conversation-id>/` created with `write_file` (providing `ArtifactMetadata`) and updated with `edit_file` as you go.

At the start of any multi-step task, create the checklist listing every step of your plan. As you complete each step, edit the artifact to mark it done (`- [x]`). If the plan changes, update the checklist and re-read it before starting each step once the conversation grows long.
