---
id: "accessible-validation-and-ime"
title: "Accessible Form Validation, Focus Rings & IME-Safe Enter Submit"
description: "Wire accessible inline errors, preserve :focus-visible keyboard rings, auto-size textareas via CSS field-sizing, and guard Vietnamese/CJK IME Enter composition."
tags: ["forms", "validation", "aria-invalid", "aria-describedby", "focus-visible", "field-sizing", "isComposing", "ime", "textarea"]
maturity: "stable"
---

# Accessible Form Validation, Focus Rings & IME-Safe Enter Submit

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Validated text inputs and standard forms

Associate every control with an explicit `<label htmlFor>`, expose error state via `aria-invalid` + `aria-describedby`, and preserve `:focus-visible` keyboard indicators.

```tsx
<label htmlFor={emailId} className="block text-xs font-medium text-slate-300">
  Email
</label>
<input
  id={emailId}
  type="email"
  autoComplete="email"
  aria-invalid={ error ? true : undefined }
  aria-describedby={ error ? errorId : undefined }
  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 aria-[invalid=true]:border-rose-500 [&:user-invalid]:border-rose-500"
/>
{error && (
  <p id={errorId} role="alert" className="text-xs text-rose-400">
    {error}
  </p>
)}
```

- **DO** pair `focus-visible:outline-none` with an explicit `focus-visible:ring-2` (or `focus-visible:outline-*`) on the same control so keyboard users always see focus.
- **DO** style native validation states with `:user-invalid` (never bare `:invalid`, which paints empty required fields red before the user interacts).
- **DON'T** write bare `focus:outline-none` with no `focus-visible:*` replacement.

### Rule 2: Auto-growing `<textarea>` with `Enter`-to-submit (Chat, Comments, Search)

Use CSS `field-sizing: content` bounded by `min-h-*` and `max-h-* overflow-y-auto`, and ignore `Enter` keydown events while an IME composition session is active.

```tsx
const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
  e.preventDefault();
  e.currentTarget.form?.requestSubmit();
};

// Class list: "min-h-10 max-h-40 w-full resize-none overflow-y-auto [field-sizing:content] ..."
```

- **DO** check `e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229` before calling `requestSubmit()` — Vietnamese (Telex/VNI) and CJK input methods use `Enter` to commit composed syllables, and omitting this guard truncates words or fires premature submissions.
- **DO** trigger submission via `e.currentTarget.form?.requestSubmit()` (not `form.submit()`, which bypasses `onSubmit` handlers and validation).
- **DON'T** run unconditional `el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'` on every keystroke when CSS `[field-sizing:content]` handles auto-sizing without layout thrashing (if legacy non-Chromium auto-grow is mandatory, gate the JS fallback behind `!CSS.supports('field-sizing', 'content')`).

## When NOT to replace legacy code

- **Keep existing pattern when:** A custom composite input wrapper intentionally hides the inner `<input>` outline (`focus:outline-none`) because the parent wrapper renders `has-[:focus-visible]:ring-2`.
