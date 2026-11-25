# Written Design Template & Builder Check

Write a plain document a builder can plan from without returning to the user:
- **Intent & Why:** Problem solved and concrete user outcome
- **Goals, Non-Goals & Anti-Goals:** Explicit scope boundaries
- **Constraints:** Stack, latency, security, accessibility, or migration limits
- **Approaches Considered & Chosen:** 2–3 concrete options and why the chosen one wins
- **Settled vs Builder Decisions:** What is locked vs left to implementation

For a small change, write a 1–2 line summary per bullet and send directly to the user. For a larger feature, save to `specs/designs/YYYY-MM-DD-<topic>-design.md` and run a fresh-context builder check with [../builder-check-prompt.md](../builder-check-prompt.md) (sorting questions into answered, minor builder calls, and user decisions).
