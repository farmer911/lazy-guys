import { createBrowserRouter } from 'react-router';
import App from './App';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import ErrorTest from './pages/ErrorTest';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';

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
