import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load components
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const ErrorTest = lazy(() => import('./pages/ErrorTest'));
const NotFound = lazy(() => import('./pages/NotFound'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: (
      <ErrorBoundary>
        <div>Something went wrong with routing</div>
      </ErrorBoundary>
    ),
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'about',
        element: <About />,
      },
      {
        path: 'contact',
        element: <Contact />,
      },
      {
        path: 'error-test',
        element: (
          <ErrorBoundary>
            <ErrorTest />
          </ErrorBoundary>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
