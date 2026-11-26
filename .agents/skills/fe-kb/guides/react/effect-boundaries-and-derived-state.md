---
id: "effect-boundaries-and-derived-state"
title: "Derive State Inline, Reset Subtrees by Key & Scope useEffect to External Systems"
description: "Eliminate extra render passes from derived-state useEffect sync, reset form/editor state via key={entityId}, and scope useEffect strictly to external browser subscriptions."
tags: ["derived-state", "useEffect", "reset", "key", "useMemo", "useQuery", "IntersectionObserver", "AbortController"]
maturity: "stable"
---

# Derive State Inline, Reset Subtrees by Key & Scope useEffect to External Systems

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Value computable from current props, query cache, or local state

Compute derived collections, totals, and flags directly during render. Wrap in `useMemo` only when profiling proves an expensive transform (`1,000+` items) is bottlenecking input responsiveness or downstream referential equality.

```tsx
interface ProjectCatalogProps {
  readonly projects: readonly Project[];
  readonly selectedTag: string;
}

export const ProjectCatalog = ({ projects, selectedTag }: ProjectCatalogProps) => {
  const visibleProjects =
    selectedTag === 'All'
      ? projects
      : projects.filter((project) => project.tech_tags.includes(selectedTag));

  const featuredCount = visibleProjects.reduce(
    (count, project) => count + (project.featured ? 1 : 0),
    0
  );

  return <ProjectGrid projects={visibleProjects} featuredCount={featuredCount} />;
};
```

- **DO** compute filtered/sorted slices and booleans inline so React commits once with consistent state.
- **DON'T** mirror props or filter results into `useState` + `useEffect(() => { setVisible(...); }, [projects, selectedTag])`, which renders stale state first and triggers an immediate second render cascade.

### Rule 2: Resetting draft state when switching active entity (`projectId` / `recordId`)

Mount an inner stateful component keyed by `key={entity.id}` so React cleanly discards all local state and refs in a single render pass when the active entity changes.

```tsx
export const ProjectNoteWorkspace = ({ project }: { readonly project: Project }) => (
  <ProjectNoteEditor key={project.id} initialSummary={project.summary} projectId={project.id} />
);

const ProjectNoteEditor = ({
  initialSummary,
}: {
  readonly initialSummary: string;
  readonly projectId: string;
}) => {
  const [draftSummary, setDraftSummary] = useState(initialSummary);
  return (
    <textarea
      value={draftSummary}
      onChange={(event) => setDraftSummary(event.target.value)}
      className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    />
  );
};
```

- **DO** place `key={project.id}` on the boundary whose local state belongs to that entity, preserving untouched sibling layout state outside the keyed subtree.
- **DON'T** write `useEffect(() => { setDraftSummary(project.summary); }, [project.id, project.summary])` — children briefly render with the previous entity's draft attached to the new `project.id`.

### Rule 3: User-triggered mutations, server fetching, vs external browser APIs

Run user-initiated mutations inside event handlers (`onClick`, `onSubmit`), delegate server reads to `@tanstack/react-query` (`useQuery`), and reserve `useEffect` strictly for synchronizing with non-React external systems (`IntersectionObserver`, `ResizeObserver`, `window` listeners, timers) with deterministic teardown.

```tsx
export const useElementVisible = (targetRef: React.RefObject<HTMLElement | null>) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setIsVisible(entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [targetRef]);

  return isVisible;
};
```

- **DO** return an explicit cleanup callback (`observer.disconnect()`, `clearTimeout(id)`, `controller.abort()`) from every `useEffect` so React StrictMode double-invocation is idempotent.
- **DON'T** fetch API endpoints inside raw `useEffect` without `@tanstack/react-query` cache deduplication, or trigger analytics/POST calls inside an effect that re-fires on unrelated re-renders.

## When NOT to replace legacy code

- **Keep existing pattern when:** A controlled editor intentionally preserves unsaved text across parent prop refreshes and reconciles incoming server revisions only when an explicit `serverRevision` version increments.
