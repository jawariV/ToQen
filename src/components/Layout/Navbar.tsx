import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationSystem from '../NotificationSystem';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navigation = [
    { name: 'Home', href: '/', show: true },
    { name: 'Dashboard', href: '/dashboard', show: user?.role === 'patient' },
    { name: 'Book Appointment', href: '/book', show: !user || user.role === 'patient' },
    { name: 'Track Queue', href: '/track', show: !user || user.role === 'patient' },
    { name: 'Admin Dashboard', href: '/admin', show: user?.role === 'admin' },
    { name: 'Register Hospital', href: '/admin/register', show: !user },
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-[#2A5D9B]" />
              <span className="text-2xl font-bold text-[#2A5D9B]">ToQen</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user && <NotificationSystem />}
            {navigation.map((item) => 
              item.show ? (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.href
                      ? 'text-[#2A5D9B] bg-blue-50'
                      : 'text-gray-700 hover:text-[#2A5D9B] hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              ) : null
            )}
            
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Welcome, {user.role === 'admin' ? 'Admin' : 'Patient'}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-[#2A5D9B] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-[#2A5D9B] p-2"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 rounded-lg mt-2">
              {navigation.map((item) =>
                item.show ? (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      location.pathname === item.href
                        ? 'text-[#2A5D9B] bg-blue-50'
                        : 'text-gray-700 hover:text-[#2A5D9B] hover:bg-gray-100'
                    }`}
                  >
                    {item.name}
                  </Link>
                ) : null
              )}
              
              {user ? (
                <button
                  <NotificationSystem />
                  onClick={handleSignOut}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium bg-[#2A5D9B] text-white hover:bg-blue-700 transition-colors text-center"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;