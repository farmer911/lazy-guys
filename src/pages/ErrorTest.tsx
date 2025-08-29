import React, { useState } from 'react';
import { Link } from 'react-router';

// Component that throws an error when triggered
const ErrorComponent: React.FC<{ shouldError: boolean }> = ({
  shouldError,
}) => {
  if (shouldError) {
    throw new Error('This is a test error to demonstrate the Error Boundary!');
  }
  return <div>This component is working fine!</div>;
};

const ErrorTest: React.FC = () => {
  const [triggerError, setTriggerError] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Error Boundary Test
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Test the error boundary implementation
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Error Boundary Demo
            </h2>

            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Click the button below to trigger a JavaScript error and see how
                the Error Boundary handles it gracefully. The error will be
                caught and displayed with a user-friendly interface instead of
                crashing the entire application.
              </p>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      <strong>Warning:</strong> This will intentionally break
                      the component to demonstrate error handling. The error
                      boundary will catch it and show a recovery interface.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Test Component Area
              </h3>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                <ErrorComponent shouldError={triggerError} />
              </div>

              <button
                onClick={() => setTriggerError(!triggerError)}
                className={`font-bold py-3 px-6 rounded-lg transition-colors duration-300 ${
                  triggerError
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {triggerError ? 'Reset Component' : 'Trigger Error'}
              </button>
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                What happens when you trigger an error:
              </h3>
              <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                <li>• The error boundary catches the JavaScript error</li>
                <li>• A user-friendly error message is displayed</li>
                <li>
                  • In development mode, detailed error information is shown
                </li>
                <li>• Users can try again or refresh the page</li>
                <li>
                  • The rest of the application continues to work normally
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/"
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.707 14.707a1 1 0 01-1.414 0L2.586 11H16a1 1 0 110 2H2.586l3.707 3.707a1 1 0 01-1.414 1.414l-5.414-5.414a1 1 0 010-1.414L5.293 6.293a1 1 0 011.414 1.414L3.414 11H16a1 1 0 110 2H3.414l3.293 3.293z"
                  clipRule="evenodd"
                />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorTest;
