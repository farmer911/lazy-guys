# Frontend Engineering Knowledge Pack — Guide Index

- [effect-boundaries-and-derived-state.md](react/effect-boundaries-and-derived-state.md) — Inline render derivation, `key={entityId}` subtree resets, and scoping `useEffect` strictly to external browser subscriptions with teardown.
- [component-granularity-and-state-placement.md](architecture/component-granularity-and-state-placement.md) — 2-tier `shadcn/ui` vs feature components, `<= 2`-hop props -> `children` slots -> selector-scoped `zustand`, and banning inline Context re-render storms.
- [type-vs-interface-and-response-composition.md](typescript/type-vs-interface-and-response-composition.md) — `interface` for `Props`/entities vs `type` for unions/`z.infer`, canonical `specs/contracts/*` DTO imports, and `CONTRACT_MISMATCH` escalation.
- [zod-rhf-schema-validation.md](forms/zod-rhf-schema-validation.md) — Shared Zod v4 `zodResolver` forms without parallel `useState` drift, Vietnamese/CJK IME `isComposing` Enter guards, and input-preserving `role="alert"` error handling.
- [async-ux-and-accessibility-behaviors.md](ux/async-ux-and-accessibility-behaviors.md) — `disabled={isSubmitting}` double-submit locks, fixed-height skeletons for zero CLS, `:focus-visible` ring pairing, and modal focus restoration.
