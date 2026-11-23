# Frontend Rules — `apps/web`

## 1. Mandatory Code Style (Mechanically Enforced)
- **100% Arrow Functions**: Every React component and helper in `apps/web/src/**/*.{ts,tsx}` MUST use arrow syntax (`export const ComponentName = ({ ... }: ComponentNameProps) => { ... }`). `function` declarations and `function` expressions are blocked by `npm run check:harness`.
- **Named Exports**: Export components as named `const` exports (`App.tsx` keeps `export default App` solely for root entry).
- **Strict TypeScript**: Zero `any`, zero `@ts-ignore`/`@ts-nocheck`, zero unused locals/parameters, zero `console.log`.

## 2. Component & State Architecture
- **`shadcn/ui` Primitives First**: Compose primitives from `@/components/ui/*` and `cn()` from `@/lib/utils`. Never duplicate button/card/badge base styles inline.
- **State Placement**:
  - Server data: `@tanstack/react-query` calling typed methods in `@/lib/api`.
  - Shared UI filter/modal state: `zustand` stores in `@/store/*`.
  - Form validation & submission: `react-hook-form` with explicit `noValidate`, accessible `<label htmlFor>`, and `role="alert"` error feedback.
- **Presentational vs Data Wiring**: Keep section/modal components deterministic via typed props so unit tests (`src/components/__tests__/*.test.tsx`) render states without brittle network mocks.

## 3. Design & Contract Discipline
- **Zero Aesthetic Drift**: Match frozen layouts and tokens in `designs/` (`designs/design-tokens.json` and `designs/screens/*.html`). Do not invent unapproved gradients, animations, or layout shifts.
- **Never Mask API Gaps**: Do not invent fake fallback values or silently hide approved UI sections when an API field is missing; escalate `CONTRACT_MISMATCH` to Tech Lead (`fe-shadcn-clean` skill).
