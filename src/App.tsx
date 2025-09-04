import { ThemeProvider } from '@components/ThemeToggle/ThemeProvider';
import { Toaster as Sonner } from '@components/module/Sonner/Sonner.view';
import { Toaster } from '@components/module/Toaster/Toaster.view';
import { TooltipProvider } from '@components/module/Tooltip/Tooltip.view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, Suspense } from 'react';
import { RouterProvider } from 'react-router';
import './App.css';
import LoadingSpinner from './components/LoadingSpinner';
import router from './router';

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
