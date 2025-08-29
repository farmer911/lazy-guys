# Husky & Code Formatting Setup

This project now includes **Husky** for Git hooks and comprehensive code formatting with **Prettier** and **ESLint**, all configured for 2-space indentation.

## 🚀 What's Included

### Husky Git Hooks

- **Pre-commit hook**: Automatically runs linting and formatting before commits
- **Lint-staged**: Only processes staged files for better performance
- **Automated quality checks**: Ensures consistent code quality

### Code Formatting

- **Prettier**: Automatic code formatting with 2-space indentation
- **ESLint**: Code linting with automatic fixes
- **EditorConfig**: Cross-editor consistency
- **VS Code settings**: Optimized for 2-space indentation

## 📁 Configuration Files

```
.vscode/
├── settings.json         # VS Code workspace settings (2-space tabs)
└── extensions.json       # Recommended VS Code extensions

.husky/
└── pre-commit           # Pre-commit git hook

.prettierrc              # Prettier configuration
.prettierignore          # Files to ignore from formatting
.editorconfig           # Cross-editor configuration
```

## ⚙️ Configuration Details

### VS Code Settings (2-Space Indentation)

- **Tab size**: 2 spaces
- **Insert spaces**: Always use spaces, not tabs
- **Format on save**: Automatically format files when saving
- **Auto-fix ESLint**: Fix linting issues automatically
- **Organize imports**: Sort imports on save

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### ESLint Integration

- **Auto-fix**: Runs ESLint with `--fix` flag
- **Pre-commit**: Lints staged files before commit
- **Format after lint**: Prettier runs after ESLint

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Run ESLint with auto-fix
npm run format          # Format all files with Prettier
npm run format:check    # Check formatting without writing
```

## 🎯 Git Workflow

### Pre-commit Hook

When you commit files, Husky automatically:

1. **Runs ESLint** with auto-fix on staged `.js`, `.jsx`, `.ts`, `.tsx` files
2. **Runs Prettier** on staged files to ensure formatting
3. **Only processes staged files** for performance
4. **Blocks commit** if there are unfixable linting errors

### Manual Commands

```bash
# Format specific files
npx prettier --write src/components/MyComponent.tsx

# Lint specific files
npx eslint src/components/MyComponent.tsx --fix

# Check all files
npm run format:check
npm run lint
```

## 📝 File-Specific Settings

### Supported File Types (2-space indentation)

- **TypeScript/JavaScript**: `.ts`, `.tsx`, `.js`, `.jsx`
- **Styles**: `.css`, `.scss`
- **Markup**: `.html`, `.json`
- **Documentation**: `.md`

### Ignored Files

- `node_modules/`
- `dist/`, `build/`
- Generated files (`.min.js`, `.min.css`)
- Lock files (`package-lock.json`, `yarn.lock`)

## 🎨 VS Code Extensions

The setup recommends these extensions:

- **Prettier**: `esbenp.prettier-vscode`
- **ESLint**: `dbaeumer.vscode-eslint`
- **Tailwind CSS**: `bradlc.vscode-tailwindcss`
- **TypeScript**: `ms-vscode.vscode-typescript-next`
- **Auto Rename Tag**: `formulahendry.auto-rename-tag`
- **npm Intellisense**: `christian-kohler.npm-intellisense`

## 🔧 Customization

### Change Indentation Size

Update these files for different indentation:

**`.prettierrc`**:

```json
{
  "tabWidth": 4 // Change from 2 to 4
}
```

**`.vscode/settings.json`**:

```json
{
  "editor.tabSize": 4,
  "editor.indentSize": 4
}
```

**`.editorconfig`**:

```ini
[*]
indent_size = 4
```

### Modify Pre-commit Hook

Edit `.husky/pre-commit` to customize what runs before commits:

```bash
npx lint-staged
# Add other commands here
```

### Lint-Staged Configuration

Modify `package.json` lint-staged section:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css,scss,html,json,md}": ["prettier --write"]
  }
}
```

## 🚦 Testing the Setup

1. **Make a code change** with inconsistent formatting
2. **Stage the file**: `git add src/components/MyComponent.tsx`
3. **Commit**: `git commit -m "test formatting"`
4. **Watch**: Husky will automatically lint and format the file
5. **Result**: Code is consistently formatted with 2-space indentation

## 🎯 Benefits

- ✅ **Consistent formatting** across the entire codebase
- ✅ **Automatic code quality** checks before commits
- ✅ **Team consistency** with shared configuration
- ✅ **Editor-agnostic** setup works in any editor
- ✅ **Performance optimized** with lint-staged
- ✅ **2-space indentation** throughout all file types
- ✅ **VS Code integration** with format-on-save
- ✅ **Git workflow** integration with pre-commit hooks

## 🔍 Troubleshooting

### Husky not running?

```bash
npm run prepare  # Re-initialize Husky
```

### Formatting issues?

```bash
npm run format   # Format all files manually
```

### ESLint errors?

```bash
npm run lint:fix # Fix auto-fixable issues
```

The setup ensures your codebase maintains consistent 2-space indentation and high code quality automatically!
