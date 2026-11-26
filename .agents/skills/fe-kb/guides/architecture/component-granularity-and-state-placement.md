---
id: "component-granularity-and-state-placement"
title: "2-Tier Component Granularity & State Placement to Avoid Prop Drilling"
description: "Organize UI into shadcn/ui primitives plus feature views, avoid prop drilling via children slots or selector-scoped zustand, and eliminate inline Context re-render storms."
tags: ["prop-drilling", "zustand", "children", "context", "shadcn-ui", "selector", "granularity", "architecture"]
maturity: "stable"
---

# 2-Tier Component Granularity & State Placement to Avoid Prop Drilling

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Directory layout & primitive reuse (2-Tier UI Architecture)

Keep exactly two component tiers: reusable design-system primitives in `@/components/ui/*` (`Button`, `Card`, `Badge` composed with `cn()`) and deterministic feature/section components in `@/components/*` wired to thin `@tanstack/react-query` hooks at the section boundary.

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  readonly project: Project;
  readonly isHighlighted?: boolean;
  readonly onSelect: (projectId: string) => void;
}

export const ProjectCard = ({ project, isHighlighted = false, onSelect }: ProjectCardProps) => (
  <Card className={cn('transition-colors', isHighlighted && 'border-sky-400')}>
    <CardHeader>
      <CardTitle>{project.title}</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-1.5">
        {project.tech_tags.map((tag) => (
          <Badge key={tag} variant="secondary">{tag}</Badge>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onSelect(project.id)}>
        Inspect
      </Button>
    </CardContent>
  </Card>
);
```

- **DO** compose `@/components/ui/*` primitives and `cn()` instead of writing raw `<button>` or `<div>` strings that duplicate focus rings, spacing, and variant tokens.
- **DON'T** introduce dogmatic 5-folder hierarchies (`atoms/`, `molecules/`, `organisms/`, `templates/`, `pages/`) or premature DRY wrappers before three real call sites share identical behavior (Rule of Three).

### Rule 2: Eliminating prop drilling (`<= 2` hops -> `children` slots -> selector `zustand`)

Pass explicit typed props for `1–2` component hops. When intermediate layout shells do not read the data, pass pre-wired leaf elements via `children` or named ReactNode slots; when cross-tree siblings share UI filter/modal state, read narrow slices via selector-scoped `zustand`.

```tsx
import { usePortfolioStore } from '@/store/usePortfolioStore';

export const CategoryFilterBar = ({ categories }: { readonly categories: readonly string[] }) => {
  const selectedCategory = usePortfolioStore((state) => state.selectedCategory);
  const setSelectedCategory = usePortfolioStore((state) => state.setSelectedCategory);

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter projects by category">
      {categories.map((category) => (
        <Button
          key={category}
          type="button"
          variant={selectedCategory === category ? 'default' : 'outline'}
          onClick={() => setSelectedCategory(category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
};
```

- **DO** subscribe to atomic `zustand` selectors (`usePortfolioStore((s) => s.selectedCategory)`) so keystrokes in unrelated inputs never re-render sibling list rows.
- **DON'T** wrap a stateful search parent in `<ActionsContext value={{ themeMode, onBookmark }}>` with an unmemoized inline object literal — every `setQuery` keystroke allocates a fresh `value` reference and forces every Context consumer to re-render.
- **DON'T** destructure the entire store (`const { selectedCategory } = usePortfolioStore()`) without a selector, which subscribes the component to every unrelated store field.

### Rule 3: Splitting boolean-flag-soup components

When a component accumulates mode-switching boolean props (`isCompact`, `isEditable`, `isPreviewOnly`) that branch >30% of its JSX, split it into explicit, single-purpose components sharing small presentational sub-parts.

- **DO** create distinct `ProjectSummaryCard` and `ProjectEditorForm` components with exact required props for each mode.
- **DON'T** ship one mega-component where half the props are optional and silently ignored depending on boolean combinations.

## When NOT to replace legacy code

- **Keep existing pattern when:** Low-frequency compound UI primitives (such as Tabs, Dialog, or Accordion sub-components) share localized state through a memoized React Context (`useMemo`) scoped strictly to that widget subtree.
