---
id: "interactive-link-button-semantics"
title: "Interactive Link vs. Button Semantics"
description: "Style navigation links as buttons without nesting <button> inside <a> or hallucinating unverified asChild props."
tags: ["anchor", "link", "button", "buttonVariants", "asChild", "a11y", "navigation"]
maturity: "stable"
---

# Interactive Link vs. Button Semantics

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Navigating to a URL (`href`, `mailto:`, external tab, or file download)

Render a **single `<a>` element** styled with exported `buttonVariants({ variant, size })` (or matching Tailwind token classes when `buttonVariants` is private to `ui/button.tsx` and out of scope to modify).

```tsx
// When buttonVariants is exported from @/components/ui/button:
<a
  href="https://github.com/acme"
  target="_blank"
  rel="noreferrer"
  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
>
  GitHub
</a>
```

- **DO** inspect `ui/button.tsx` before using `asChild` or `buttonVariants`: if `ButtonProps` does not implement `@radix-ui/react-slot` (`Slot`), passing `<Button asChild>` fails TypeScript compilation and renders an invalid `<button><a>` DOM tree.
- **DO** apply button utility classes directly on `<a>` when `ui/button.tsx` neither exports `buttonVariants` nor supports `asChild` within task scope.
- **DON'T** nest `<Button>` or `<button>` inside `<a href>` (or `<a>` inside `<button>`); HTML5 forbids interactive descendants inside `<a>` and `<button>`, causing double keyboard tab stops and broken screen-reader announcements.

### Rule 2: Triggering an in-page action (opening a dialog, toggling filters, mutating state)

Render a native `<button type="button">` (or `<Button type="button">`).

- **DO** set explicit `type="button"` on non-submit buttons so placing the component inside a `<form>` never triggers accidental form submission.
- **DON'T** use `<a href="#">`, `<div onClick>`, or `<span role="button">` for actions.

## When NOT to replace legacy code

- **Keep existing pattern when:** `<Button asChild><a href="...">` is verified against a `Button` component that genuinely delegates via `@radix-ui/react-slot` (`Slot`), which merges props onto the single `<a>` element with zero nested `<button>`.
