import './App.scss';
import { StrictMode, Suspense } from 'react';
import { RouterProvider } from 'react-router';
import LoadingSpinner from './components/LoadingSpinner';
import { router } from './router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@components/ThemeToggle/ThemeProvider';
import { TooltipProvider } from '@components/module/Tooltip/Tooltip.view';
import { Toaster } from '@components/module/Toaster/Toaster.view';
import { Toaster as Sonner } from '@components/module/Sonner/Sonner.view';

const queryClient = new QueryClient();

function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<LoadingSpinner />}>
              <RouterProvider router={router} />
            </Suspense>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}

export default App;
