# React Router v7 & Error Boundary Setup

This project now includes **React Router v7** for navigation and a robust **Error Boundary** implementation for error handling.

## 🚀 What's Included

### React Router v7

- **Modern Routing**: Latest React Router with data loading and error handling
- **Nested Routes**: Structured routing with layout components
- **Type Safety**: Full TypeScript support
- **404 Handling**: Custom Not Found page

### Error Boundary

- **Class-based Error Boundary**: Catches JavaScript errors anywhere in the component tree
- **Graceful Fallback UI**: User-friendly error interface
- **Development Details**: Detailed error information in development mode
- **Recovery Options**: Try again and refresh page buttons

## 📁 Project Structure

```
src/
├── components/
│   └── ErrorBoundary.tsx      # Error boundary component
├── pages/
│   ├── Home.tsx              # Homepage with feature showcase
│   ├── About.tsx             # About page with tech stack info
│   ├── Contact.tsx           # Contact form page
│   ├── ErrorTest.tsx         # Error boundary demonstration
│   └── NotFound.tsx          # 404 page
├── router.tsx                # Route configuration
├── App.tsx                   # Main layout component
└── main.tsx                  # App entry point with RouterProvider
```

## 🧭 Available Routes

- **`/`** - Home page with feature overview
- **`/about`** - About page with tech stack information
- **`/contact`** - Contact form
- **`/error-test`** - Error boundary test page
- **`/*`** - 404 Not Found page

## 🛡️ Error Boundary Features

### Automatic Error Catching

```tsx
// Wraps components to catch errors
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Custom Fallback UI

```tsx
<ErrorBoundary fallback={<CustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

### Development Error Details

- Error message and stack trace
- Component stack information
- Helpful debugging information

### User Recovery Options

- **Try Again**: Resets the error boundary state
- **Refresh Page**: Reloads the entire page

## 🎨 Usage Examples

### Basic Routing

```tsx
import { Link } from 'react-router';

// Navigation links
<Link to="/about">About</Link>
<Link to="/contact">Contact</Link>
```

### Error Boundary Integration

```tsx
// In router.tsx - Route-level error boundary
{
  path: '/error-test',
  element: (
    <ErrorBoundary>
      <ErrorTest />
    </ErrorBoundary>
  )
}

// Component-level error boundary
function MyComponent() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong!</div>}>
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

### Testing Error Boundary

1. Navigate to `/error-test`
2. Click "Trigger Error" button
3. See the error boundary in action
4. Use recovery options to restore functionality

## 🔧 Configuration

### Router Setup (router.tsx)

```tsx
import { createBrowserRouter } from 'react-router';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: (
      <ErrorBoundary>
        <div>Routing Error</div>
      </ErrorBoundary>
    ),
    children: [
      // Nested routes...
    ],
  },
]);
```

### Main App Integration (main.tsx)

```tsx
import { RouterProvider } from 'react-router';
import { router } from './router';

<RouterProvider router={router} />;
```

## 🎯 Best Practices

### Error Boundaries

1. **Place Strategically**: Use at route level and around risky components
2. **Provide Context**: Show helpful error messages to users
3. **Log Errors**: Send errors to monitoring services in production
4. **Recovery Options**: Always provide ways for users to recover

### Routing

1. **Nested Routes**: Use layout components for shared UI
2. **Type Safety**: Leverage TypeScript for route parameters
3. **Error Handling**: Use route-level error boundaries
4. **Loading States**: Implement loading indicators for async routes

### Development

1. **Error Testing**: Regularly test error boundary functionality
2. **User Experience**: Design error states that match your app's design
3. **Monitoring**: Implement error tracking in production

## 🚦 Testing the Setup

1. **Start the server**: `npm run dev`
2. **Navigate routes**: Test all navigation links
3. **Test error boundary**: Visit `/error-test` and trigger an error
4. **Test 404**: Visit any non-existent route
5. **Recovery**: Test error recovery functionality

## 🔍 Development Notes

- SCSS deprecation warnings are cosmetic and don't affect functionality
- Error boundary only catches JavaScript errors in the component tree
- Network errors and promise rejections need separate handling
- The error boundary provides detailed information in development mode

## 📱 Features Showcase

The home page demonstrates:

- Modern React Router v7 navigation
- Tailwind CSS styling
- SCSS custom components
- Error boundary integration
- Responsive design
- Dark mode support
