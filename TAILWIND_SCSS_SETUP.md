# Tailwind CSS & SCSS Setup

This project has been configured with both **Tailwind CSS** and **SCSS** support.

## 🚀 What's Included

### Tailwind CSS

- **Configuration**: `tailwind.config.js` - Configure content paths, theme, and plugins
- **PostCSS**: `postcss.config.js` - Handles Tailwind processing with Autoprefixer
- **Directives**: Added to `src/index.scss` with `@tailwind` directives

### SCSS Support

- **Sass**: Full SCSS syntax support including variables, mixins, nesting, etc.
- **File structure**:
  - `src/index.scss` - Main stylesheet with Tailwind imports
  - `src/App.scss` - Component-specific styles
  - `src/styles/_variables.scss` - SCSS variables and mixins

## 📁 File Structure

```
src/
├── styles/
│   └── _variables.scss     # SCSS variables, mixins, and utilities
├── index.scss              # Main stylesheet with Tailwind imports
├── App.scss               # App component styles
├── App.tsx                # Updated with examples
└── main.tsx               # Updated import paths
```

## 🎨 Usage Examples

### Using Tailwind CSS

```tsx
<div className="bg-blue-500 hover:bg-blue-700 text-white p-4 rounded">
  Tailwind Button
</div>
```

### Using SCSS Variables and Mixins

```scss
// In _variables.scss
$primary-color: #646cff;

@mixin button-style($bg-color) {
  background-color: $bg-color;
  &:hover {
    background-color: darken($bg-color, 10%);
  }
}

// Usage
.my-button {
  @include button-style($primary-color);
}
```

### Combining Both

You can use Tailwind utility classes alongside custom SCSS:

```tsx
<div className="flex justify-center custom-card">
  <button className="px-4 py-2 custom-button">Hybrid Button</button>
</div>
```

## 🛠️ Development

- **Start dev server**: `npm run dev`
- **Build for production**: `npm run build`

## 📝 Notes

- Tailwind processes first, then custom SCSS styles are applied
- Use `@layer` directive in CSS for better Tailwind integration
- SCSS files are automatically processed by Vite
- Hot reload works for both Tailwind and SCSS changes

## 🎯 Best Practices

1. Use Tailwind for utility-first styling
2. Use SCSS for complex components or when you need variables/mixins
3. Organize SCSS files in the `src/styles/` directory
4. Use meaningful names for SCSS partials (prefix with underscore)
5. Import SCSS partials in `index.scss` for global availability
