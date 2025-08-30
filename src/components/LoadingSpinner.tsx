import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600 dark:text-gray-300">Loading...</span>
  </div>
);

export default LoadingSpinner;
