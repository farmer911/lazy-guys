## The Written Design

Write a plain document a builder in the domain can plan from without going back to the user:
- intent and the why
- goals, non-goals, anti-goals
- constraints
- approaches (considered, chosen, and why)
- decisions already settled vs left to the builder

For a small change, write a short 1–2 line summary per bullet and send directly to the user. For a larger feature, save to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and run a builder check with `builder-check-prompt.md` (sort questions into answered, minor calls you make, and user decisions).

<HARD-GATE>
Nothing gets built until your human partner approves the design doc (short or full), unless they opted out of brainstorming or asked for a throwaway spike. After approval, invoke `writing-plans` next.
</HARD-GATE>

## Red Flags

| Thought | Reality |
|---------|---------|
| "I'll offer a menu of what they might want" | Options steer. Ask them to describe intent first. |
| "I'll fill in sensible defaults silently" | State assumptions out loud so they can reject them. |
| "They said 'sounds good' to the idea" | Approval covers a written design, not a vague idea. |
| "The spike works, I'll keep building on it" | Keeping a throwaway spike is a new request; go back through the gate. |
