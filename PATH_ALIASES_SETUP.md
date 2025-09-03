# Path Aliases Configuration

This project has been configured with clean, direct path aliases.

## Available Aliases

- `@router` → `src/router/`
- `@components` → `src/components/`
- `@pages` → `src/pages/`
- `@styles` → `src/styles/`
- `@assets` → `src/assets/`
- `@utils` → `src/utils/`

## Usage Examples

### Before (relative imports)

```tsx
import NavigationBar from '../../router/Home/NavigationBar';
import Button from '../../../components/Button/Button';
import { formatDate } from '../../../../utils/dateUtils';
```

### After (alias imports)

```tsx
import NavigationBar from '@router/Home/NavigationBar';
import Button from '@components/Button/Button';
import { formatDate } from '@utils/dateUtils';
```

## Configuration Files

### 1. TypeScript Configuration (`tsconfig.app.json`)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@router/*": ["src/router/*"],
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@styles/*": ["src/styles/*"],
      "@assets/*": ["src/assets/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

### 2. Vite Configuration (`vite.config.ts`)

```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@router': '/src/router',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@styles': '/src/styles',
      '@assets': '/src/assets',
      '@utils': '/src/utils',
    },
  },
});
```

## Benefits

1. **Cleaner imports**: No more `../../../../../../` chains
2. **Better maintainability**: Moving files doesn't break import paths
3. **Consistent structure**: Clear indication of what's being imported
4. **IDE support**: Full IntelliSense and auto-completion support
5. **Refactoring friendly**: Easier to reorganize code structure

## IDE Support

Most modern IDEs including VS Code will automatically recognize these paths and provide:

- Auto-completion
- Go to definition
- Refactoring support
- Import suggestions

## Migration Guide

To migrate existing imports:

1. **Identify relative imports** that go up multiple directories
2. **Replace with direct aliases**:
   - `../../components/Button` → `@components/Button`
   - `../../../utils/helpers` → `@utils/helpers`
   - `../../router/Home/NavigationBar` → `@router/Home/NavigationBar`

3. **Test the application** to ensure all imports resolve correctly

## Best Practices

- Use direct aliases (`@router`, `@components`) for clean imports
- Keep component-level imports (same directory) as relative imports
- Be consistent across the codebase
- Each alias is short and descriptive
