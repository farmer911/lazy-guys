---
id: "native-dialog-and-popover"
title: "Native Dialog & Popover Overlays"
description: "Build accessible modal confirmations and non-modal overlays with native <dialog>, backdrop scroll containment, and safe initial focus."
tags: ["dialog", "modal", "popover", "backdrop", "overscroll-behavior", "showModal", "closedby", "focus"]
maturity: "stable"
---

# Native Dialog & Popover Overlays

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Blocking modal confirmation or form dialog (default)

Open a native `<dialog>` imperatively via `dialogRef.current?.showModal()` and close via `<form method="dialog">` or `dialogRef.current?.close()`.

```tsx
// Optional src/types/html-dialog.d.ts when using declarative light-dismiss:
// declare module 'react' {
//   interface DialogHTMLAttributes<T> { closedby?: 'any' | 'closerequest' | 'none'; }
// }

export const DeleteProjectDialog = ({ onConfirm }: { onConfirm: () => void }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => dialogRef.current?.showModal()}>
        Delete Project
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => {
          if (dialogRef.current?.returnValue === 'confirm') onConfirm();
          if (dialogRef.current) dialogRef.current.returnValue = '';
        }}
        className="m-auto max-w-md rounded-lg border border-slate-700 bg-slate-950 p-6 text-slate-100 overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-black/60"
      >
        <h2 id={titleId} className="text-lg font-semibold">Delete this project?</h2>
        <form method="dialog" className="mt-6 flex justify-end gap-2">
          <Button type="submit" value="cancel" variant="outline" size="sm" autoFocus>
            Cancel
          </Button>
          <Button type="submit" value="confirm" size="sm">
            Confirm Delete
          </Button>
        </form>
      </dialog>
    </>
  );
};
```

- **DO** apply scroll containment to **both** `dialog:modal` (`overscroll-contain` / `overscroll-behavior: contain`) **and** `dialog::backdrop` (`backdrop:overflow-hidden backdrop:overscroll-contain`); `::backdrop` is not a scroll container unless `overflow: hidden` is set, so omitting it lets wheel/touch gestures over the backdrop scroll the page behind.
- **DO** place `autoFocus` (`autofocus`) on the **safe action (`Cancel` or `Keep`)** in destructive confirmations, and reset `dialog.returnValue = ''` after handling `close` so subsequent `Esc` dismissals never replay a stale action value.
- **DO** augment `DialogHTMLAttributes` in a `.d.ts` file (never `as any`) when adding `closedby="any"` for outside-click light dismiss.
- **DON'T** lock background scroll by mutating `document.body.style.overflow = 'hidden'` or calculating `scrollbarWidth` padding in `useEffect`.
- **DON'T** add `role="dialog"`, `aria-modal="true"`, custom `Escape` listeners, or focus-return `useEffect` code — `showModal()` provides all four natively.
- **DON'T** attach `onClick={(e) => e.target === e.currentTarget && close()}` directly to a padded `<dialog>` (dragging a text selection from inside the dialog onto padding/backdrop falsely closes the modal).

### Rule 2: Non-blocking utility panel (find bar, inspector) while page stays interactive

Use `<dialog popover="manual">` (or `popover="auto"` for light-dismiss) with an explicit Close button — **DON'T** call `showModal()`.

### Rule 3: Menus, tooltips, dropdowns, and hovercards

Use a semantic element (`<ul popover>`, `<div popover>`) rather than `<dialog>`.

## When NOT to replace legacy code

- **Keep existing pattern when:** The application already standardizes on a tested design-system modal (`@/components/ui/dialog` built on Radix/headless primitives) required by frozen UI specs.
