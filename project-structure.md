# Lazy Guys Project Structure

## Project Overview

This appears to be a web application project with a clean, modular architecture.

## Directory Structure

```
c:\Dev\lazy-guys\
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Page-level components
│   ├── services/           # API and business logic services
│   ├── utils/              # Utility functions and helpers
│   ├── styles/             # CSS/styling files
│   ├── types/              # TypeScript type definitions
│   └── hooks/              # Custom React hooks (if applicable)
├── public/                 # Static assets
├── tests/                  # Test files
├── docs/                   # Documentation
└── config/                 # Configuration files
```

## Component Architecture Principles

### 1. Component Structure

- **Atomic Design**: Components should follow atomic design principles
- **Single Responsibility**: Each component handles one specific concern
- **Props Interface**: Clear TypeScript interfaces for all props
- **Clean Separation**: Logic, styling, and markup cleanly separated

### 2. File Naming Convention

- Components: PascalCase (e.g., `UserProfile.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- Types: PascalCase with `.types.ts` suffix

### 3. Component Template

```typescript
// Standard component structure
interface ComponentProps {
  // Clear prop definitions
}

export const ComponentName: React.FC<ComponentProps> = ({
  prop1,
  prop2
}) => {
  // Hooks at the top
  // Event handlers
  // Render logic

  return (
    <div>
      {/* Clean, readable JSX */}
    </div>
  );
};
```

### 4. Service Layer

- API calls abstracted into service modules
- Error handling centralized
- Type-safe responses
- Consistent naming patterns

### 5. State Management

- Local state for component-specific data
- Global state for shared application data
- Custom hooks for reusable stateful logic

## Code Quality Standards

- TypeScript strict mode enabled
- ESLint and Prettier configuration
- Consistent import ordering
- Comprehensive error boundaries
- Unit tests for critical components

## Best Practices Applied

1. **Readability**: Self-documenting code with clear naming
2. **Maintainability**: Modular structure for easy updates
3. **Reusability**: Components designed for multiple use cases
4. **Performance**: Optimized rendering and lazy loading where appropriate
5. **Accessibility**: ARIA labels and semantic HTML
6. **Testing**: Testable component architecture

This structure ensures components remain clean, maintainable, and easy to understand while following modern React/TypeScript best practices.

```

```
