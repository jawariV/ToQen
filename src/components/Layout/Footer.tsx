import React from 'react';
import { Clock, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="h-6 w-6 text-[#2A5D9B]" />
              <span className="text-xl font-bold text-[#2A5D9B]">ToQen</span>
            </div>
            <p className="text-gray-600 text-sm">
              Revolutionizing hospital queue management with real-time tracking and smart appointment booking.
            </p>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="/" className="text-gray-600 hover:text-[#2A5D9B] text-sm">Home</a></li>
              <li><a href="/book" className="text-gray-600 hover:text-[#2A5D9B] text-sm">Book Appointment</a></li>
              <li><a href="/track" className="text-gray-600 hover:text-[#2A5D9B] text-sm">Track Queue</a></li>
              <li><a href="/admin" className="text-gray-600 hover:text-[#2A5D9B] text-sm">Admin Portal</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-2">
              <li className="text-gray-600 text-sm">Email: support@toqen.com</li>
              <li className="text-gray-600 text-sm">Phone: +1 (555) 123-4567</li>
              <li className="text-gray-600 text-sm">Hours: 24/7 Support</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm">
              © 2024 ToQen. All rights reserved.
            </p>
            <div className="flex items-center space-x-1 mt-2 md:mt-0">
              <span className="text-gray-600 text-sm">Made with</span>
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-gray-600 text-sm">for better healthcare</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile CTA Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <a
          href="/book"
          className="w-full bg-[#F7941D] text-white py-3 px-4 rounded-lg font-medium text-center block hover:bg-orange-600 transition-colors"
        >
          Book Appointment Now
        </a>
      </div>
    </footer>
  );
};

export default Footer;