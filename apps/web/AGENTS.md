# Frontend Rules — `apps/web`

## 1. Mandatory Code Style & Type Boundaries
- **100% Arrow Functions**: Every React component and helper in `apps/web/src/**/*.{ts,tsx}` MUST use arrow syntax (`export const ComponentName = ({ ... }: ComponentNameProps) => { ... }`). `function` declarations/expressions are blocked by `npm run check:harness`.
- **Named Exports & Strict TS**: Export components as named `const` exports (`App.tsx` keeps `export default App` solely for root entry). Zero `any`, zero `@ts-ignore`/`@ts-nocheck`/`@ts-expect-error`, zero unused locals/params, zero `console.log`.
- **`interface` vs `type` & Shared Contracts**: Use `interface` for component `Props` and extensible domain entities (`<= 1` `extends` hop); use `type` for unions, discriminated unions, `z.infer<typeof Schema>`, and `Pick`/`Omit`. Import canonical DTOs and Zod schemas from `specs/contracts/*` (never shadow DTO interfaces in `@/lib/api`).

## 2. 2-Tier Component Granularity, Prop Routing & `useEffect` Ban List
- **2-Tier UI Layout**: Compose `@/components/ui/*` (`shadcn/ui` primitives + `cn()`) inside deterministic feature/section components in `@/components/*` (never 5-folder `atoms/molecules/organisms`, and never raw `<button>`/`<input>` strings duplicating primitive styles).
- **Anti-Prop-Drilling Ladder**: Use `<= 2`-hop explicit props -> `children` slot composition -> selector-scoped `zustand` (`usePortfolioStore((s) => s.selectedCategory)`). Never pass unmemoized inline object literals to `<Context value={{ ... }}>`.
- **`useEffect` Ban List**: Never use `useEffect` for derived state (compute inline during render; `useMemo` only for profiled heavy transforms), entity-switch state resets (use `key={entityId}`), user event actions, or server fetching (`@tanstack/react-query`). Reserve `useEffect` strictly for external browser APIs (`IntersectionObserver`, window listeners, timers) with cleanup/`AbortController`.

## 3. Forms, Async UX, Accessibility & Contract Fidelity
- **Zod v4 + React Hook Form**: Wire shared `specs/contracts/*` Zod v4 schemas via `zodResolver` (`noValidate`, `<label htmlFor>`, `aria-invalid`). Never mirror RHF fields into parallel `useState`; guard `Enter` handlers with `!event.nativeEvent.isComposing` (`IME`); wrap async submit in `try/catch` surfacing `role="alert"` without clearing user input (`reset()` only after `await` succeeds).
- **Async & Focus Hygiene**: Lock pending submits (`disabled={isSubmitting}`), reserve fixed-height skeletons to prevent CLS, and pair `focus-visible:outline-none` with `focus-visible:ring-2` (never bare `focus:outline-none`). Consult `.agents/skills/fe-kb/SKILL.md` for detailed patterns.
- **Zero Aesthetic Drift & Escalation**: Match frozen Stitch screens/tokens in `designs/`. Never invent fallback values or hide required UI fields when API data diverges — escalate `CONTRACT_MISMATCH` (`fe-shadcn-clean`).
