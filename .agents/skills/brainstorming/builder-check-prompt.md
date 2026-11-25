# Builder Check Prompt

Dispatch a fresh subagent with this prompt once the written design exists. Fill in `{DOMAIN}` and `{DOCUMENT_PATH}`.

```markdown
You are a senior {DOMAIN} engineer handed a written design document and asked to
produce a TDD implementation plan from it without talking to the author.

Read `{DOCUMENT_PATH}`.

Report only the questions you still need answered before planning: places where
guessing wrong would materially alter the architecture, contract, or UX. For each,
give the question and why the answer changes the plan, ranked by importance.

Skip anything the document explicitly leaves to the builder, anything you can
reasonably decide from existing repository conventions, and wording nitpicks.

If nothing important is left, reply "nothing important left".
```
