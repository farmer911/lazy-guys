import type { JSX } from 'react';
import { Link } from 'react-router';

const NavigationBar = (): JSX.Element => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mb-12">
      <Link
        to="/about"
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 shadow-lg hover:shadow-xl"
      >
        About Us
      </Link>
      <Link
        to="/contact"
        className="bg-white hover:bg-gray-50 text-blue-600 font-bold py-3 px-6 rounded-lg border-2 border-blue-600 transition-colors duration-300 shadow-lg hover:shadow-xl"
      >
        Contact
      </Link>
      <Link
        to="/error-test"
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 shadow-lg hover:shadow-xl"
      >
        Test Error Boundary
      </Link>
    </div>
  );
};

export default NavigationBar;
