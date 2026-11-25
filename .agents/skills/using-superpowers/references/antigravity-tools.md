# Antigravity (`agy`) Tool Mapping

Skills speak in actions ("dispatch a subagent", "create a todo", "read a file"). On Antigravity (`agy`) these resolve to the tools below.

| Action skills request | Antigravity equivalent |
|----------------------|------------------------|
| Dispatch a subagent (`Subagent (general-purpose):` template) | `invoke_subagent` with a built-in `TypeName` (`self` for full-capability work, `research` for read-only, `browser` for live UI verification) or `define_subagent` + `invoke_subagent` |
| Live step checklist ("create a todo", "mark complete") | `update_steps` for live 3–12 step execution checklists in chat + `update_focus` for current phase status. **Not** `manage_task`, which manages background shell processes. |
| Persistent cross-turn plan / artifact | `write_file` / `edit_file` in `<appDataDir>/brain/<conversation-id>/` with `ArtifactMetadata` when a long plan or report must survive context compaction |

## Task tracking

1. **In-session step checklists (`3–12` steps):** Call `update_steps` in parallel with your first tool call of each step (marking active steps `in_progress` and finished steps `done`), paired with `update_focus` for fine-grained activity.
2. **Long plans & compaction-proof ledgers:** Persist active multi-step checklists in `.agents/STATE.md` (for crash-safe resume across turns), use `.superpowers/sdd/<slug>/progress.md` during `executing-plans`, and write user-facing reports in `<appDataDir>/brain/<conversation-id>/` with `ArtifactMetadata`.
