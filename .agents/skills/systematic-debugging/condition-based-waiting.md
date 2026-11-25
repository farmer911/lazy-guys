# Condition-Based Waiting

Flaky tests guess at timing with arbitrary delays (`setTimeout`, `page.waitForTimeout`), creating race conditions under CI load.

**Core principle:** Wait for the observable condition (DOM state, HTTP response, DB row, or predicate), never an arbitrary sleep.

## When to Use

- Async state updates in React Testing Library (`waitFor`, `findByRole`)
- Live UI hydration and network round-trips in Playwright (`await expect(locator).toBeVisible()`)
- Server/database readiness probes (e.g. `pg_isready`, `/api/health`)

**Exception:** When testing real timing behavior (debounce/throttle intervals), first wait for the triggering condition, then wait the exact documented interval with a comment explaining why.

## Core Pattern (Vitest / RTL / Playwright)

```typescript
// ❌ Guessing at timing
await new Promise((r) => setTimeout(r, 100));
expect(screen.getByText('Message sent. Thank you!')).toBeInTheDocument();

// ✅ Waiting for observable condition
expect(await screen.findByText('Message sent. Thank you!')).toBeInTheDocument();
```

## Generic Polling Helper (Non-DOM Conditions)

```typescript
export const waitForCondition = async <T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000
): Promise<T> => {
  const start = Date.now();
  while (true) {
    const result = condition();
    if (result) return result;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, 10));
  }
};
```

## Common Mistakes

- **Polling every 1ms:** Wastes CPU — poll every `10–50ms`.
- **No timeout:** Hangs CI indefinitely — always enforce a bounded `timeoutMs` with a diagnostic error.
- **Caching state outside the loop:** Always re-read live state inside the condition callback.
