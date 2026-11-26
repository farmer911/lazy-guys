---
id: "modern-clone-sort-groupby-abort"
title: "Modern Cloning, Immutable Sorting, Object.groupBy & AbortSignal"
description: "Use structuredClone, toSorted, null-prototype-safe Object.groupBy, and AbortSignal.any/timeout without hitting DataCloneError or TypeError traps."
tags: ["structuredClone", "toSorted", "groupBy", "hasOwn", "AbortSignal", "TimeoutError", "DataCloneError", "Proxy"]
maturity: "stable"
---

# Modern Cloning, Immutable Sorting, Object.groupBy & AbortSignal

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Deep-cloning plain nested state in memory

Use `structuredClone(value)` for plain objects, arrays, `Date`, `Map`, and `Set`.

- **DO** unwrap reactive `Proxy` objects and strip closures or DOM nodes before cloning — `structuredClone` throws `DataCloneError` on `Proxy`, `Function`, and DOM `Node` instances.
- **DON'T** use `JSON.parse(JSON.stringify(value))` for in-memory state cloning.

### Rule 2: Sorting or replacing array elements without mutating the source array

Use `items.toSorted(compareFn)` and `items.with(index, nextValue)`.

- **DO** pass an explicit comparator `(a, b) => a - b` for numeric sorting (bare `toSorted()` converts items to UTF-16 strings, sorting `10` before `2`).
- **DON'T** deep-clone an entire array (`structuredClone(items).sort(...)`) when you only need a non-mutating order change without mutating nested element fields.

### Rule 3: Grouping items into keyed buckets (`Object.groupBy`)

Use `Object.groupBy(items, keySelector)` for string/symbol keys (or `Map.groupBy` for object keys).

```ts
const groups = Object.groupBy(events, (ev) => ev.monthLabel);
const hasMarch = Object.hasOwn(groups, 'Mar 2026');
```

- **DO** check bucket existence with `Object.hasOwn(groups, key)` (or `groups[key] !== undefined`).
- **DON'T** call `groups.hasOwnProperty(key)` — `Object.groupBy()` returns a **`null`-prototype object**, so `groups.hasOwnProperty` is `undefined` and throws `TypeError` at runtime.

### Rule 4: Combining caller cancellation with a deadline timeout

Use `AbortSignal.any([callerSignal, AbortSignal.timeout(ms)])`.

- **DO** handle **both** `err.name === 'TimeoutError'` (thrown by `AbortSignal.timeout()`) and `err.name === 'AbortError'` (thrown by manual `AbortController.abort()`).
- **DON'T** wire manual `setTimeout(() => controller.abort(), ms)` + `clearTimeout` boilerplate when `AbortSignal.timeout(ms)` composes cleanly via `AbortSignal.any`.

## When NOT to replace legacy code

- **Keep existing pattern when:** `JSON.parse(JSON.stringify(payload))` is intentionally used for **wire-payload normalization** — invoking `.toJSON()`, converting `Date` objects into ISO-8601 strings, or stripping `undefined`-valued keys before snapshot assertions or HTTP transport. Extract a named `toWireJson(payload)` helper rather than switching to `structuredClone`.
