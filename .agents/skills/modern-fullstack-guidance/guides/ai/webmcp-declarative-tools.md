---
id: "webmcp-declarative-tools"
title: "WebMCP Declarative & Imperative Browser Tools"
description: "Expose structured client-side actions to browser AI agents via declarative form attributes or navigator.modelContext with AbortSignal cleanup."
tags: ["webmcp", "modelContext", "toolname", "tooldescription", "ai-agent"]
maturity: "experimental"
---

# WebMCP Declarative & Imperative Browser Tools

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Exposing an existing HTML `<form>` as a structured agent tool (default)

Annotate the `<form>` declaratively with `toolname` and `tooldescription`, augmenting React's `FormHTMLAttributes` in a `.d.ts` file.

```ts
// src/types/webmcp.d.ts
import 'react';
declare module 'react' {
  interface FormHTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
  }
}
```

- **DO** keep standard human-accessible `<label>` and validation attributes on every input so browser agents infer parameter schemas accurately.
- **DON'T** cast `<form {...({ toolname: 'search' } as any)}>` in strict TypeScript codebases.

### Rule 2: Registering imperative client-side state tools (`navigator.modelContext`)

Feature-detect `'modelContext' in navigator` on secure (`https:` / `localhost`) origins and tie tool lifetime to an `AbortController`.

```ts
useEffect(() => {
  const nav = navigator as Navigator & {
    modelContext?: {
      registerTool: (def: unknown, opts?: { signal?: AbortSignal }) => void;
    };
  };
  if (!nav.modelContext) return undefined;
  const controller = new AbortController();
  nav.modelContext.registerTool(
    {
      name: 'filter_projects',
      description: 'Filter portfolio projects by technology tag',
      inputSchema: { type: 'object', properties: { tag: { type: 'string' } }, required: ['tag'] },
      execute: async ({ tag }: { tag: string }) => ({ appliedTag: tag }),
    },
    { signal: controller.signal }
  );
  return () => controller.abort();
}, []);
```

- **DO** abort registrations on component unmount so SPA route changes never leave stale or duplicate tools registered.
- **DON'T** assume `navigator.modelContext` exists without feature detection (currently gated behind Chromium experimental WebMCP flags).

## When NOT to replace legacy code

- **Keep existing pattern when:** Target deployments disable experimental browser features in `.kbrc.json` (`"allowExperimental": false`) or execute exclusively on server-rendered endpoints with no client interactivity.
