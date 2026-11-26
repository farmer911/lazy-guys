---
id: "async-ux-and-accessibility-behaviors"
title: "Prevent Double Submit, CLS Layout Shift & Missing Focus Rings"
description: "Lock async buttons against double submit, reserve fixed-height skeletons to prevent CLS, pair focus-visible rings with outline resets, and restore modal focus."
tags: ["double-submit", "isSubmitting", "focus-visible", "focus-ring", "skeleton", "cls", "dialog", "accessibility"]
maturity: "stable"
---

# Prevent Double Submit, CLS Layout Shift & Missing Focus Rings

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Async mutation buttons & keyboard-visible focus rings

Disable submit/action triggers while in flight (`disabled={isPending || isSubmitting}` + `aria-busy`) using `@/components/ui/button`, and always pair outline resets with an explicit `:focus-visible` ring on interactive controls.

```tsx
import { Button } from '@/components/ui/button';

interface AsyncActionBarProps {
  readonly isSubmitting: boolean;
  readonly errorMessage: string | null;
  readonly onRetry: () => void;
}

export const AsyncActionBar = ({ isSubmitting, errorMessage, onRetry }: AsyncActionBarProps) => (
  <div className="space-y-2">
    <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="min-w-36">
      {isSubmitting ? 'Saving...' : 'Save Changes'}
    </Button>
    {errorMessage && (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
        <span>{errorMessage}</span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )}
  </div>
);
```

- **DO** pair `focus-visible:outline-none` with `focus-visible:ring-2 focus-visible:ring-sky-400` on every custom `<input>`, `<textarea>`, `<select>`, and link control so `Tab` navigation always displays a clear keyboard ring.
- **DO** set a stable `min-w-*` or icon slot on pending buttons so switching `'Save'` -> `'Saving...'` does not jitter adjacent buttons horizontally.
- **DON'T** write bare `focus:outline-none` without a `focus-visible:ring-*` or `focus-visible:outline-*` utility on the same element.
- **DON'T** leave async handlers unlocked during `await`, allowing rapid double-clicks to fire duplicate `POST` requests.

### Rule 2: Loading skeletons, empty states, and recoverable error states (Zero CLS)

Match loading placeholder heights to the loaded card geometry (`min-h-*` / identical grid rows) so resolving `@tanstack/react-query` data causes `0` Cumulative Layout Shift (CLS), and provide actionable empty/error recovery.

```tsx
export const ProjectsAsyncBoundary = ({
  isLoading,
  isError,
  projects,
  onRetry,
  onResetFilter,
}: {
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly projects: readonly Project[];
  readonly onRetry: () => void;
  readonly onResetFilter: () => void;
}) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Loading projects">
        <div className="h-48 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
        <div className="h-48 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
      </div>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="rounded-xl border border-rose-500/40 p-6 text-sm text-rose-200">
        <p>Could not load projects.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 p-6 text-sm text-slate-400">
        <p>No projects match the active filter.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onResetFilter}>
          Show all projects
        </Button>
      </div>
    );
  }
  return <ProjectGrid projects={projects} />;
};
```

- **DO** render native `<dialog>` modals via `dialogRef.current?.showModal()` so `Escape` dismissal, top-layer backdrop, and automatic focus restoration to the opener button work natively.
- **DON'T** render `null` or a 1-line `"Loading..."` string where a `h-48` card grid belongs, causing sections below to jump hundreds of pixels on hydration.

## When NOT to replace legacy code

- **Keep existing pattern when:** An inner `<input className="focus:outline-none">` sits inside a composite search shell whose parent wrapper visibly highlights keyboard focus via `has-[:focus-visible]:ring-2`.
