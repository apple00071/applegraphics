import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to log out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleCheckboxStyle = `
    absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer
    checked:right-0 checked:border-indigo-600
  `;

  const toggleLabelStyle = `
    block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer
    peer-checked:bg-indigo-600
  `;

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-xl font-bold mb-4">Profile</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <div className="flex items-center mb-6">
          <div className="bg-indigo-100 rounded-full p-4 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user?.email?.split('@')[0] || 'User'}</h2>
            <p className="text-gray-500 text-sm">{user?.email || 'No email'}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">ACCOUNT</h3>
          <ul>
            <li className="py-2">
              <button className="flex items-center w-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-gray-700">Edit Profile</span>
              </button>
            </li>
            <li className="py-2">
              <button className="flex items-center w-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span className="text-gray-700">Change Password</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-2">
          <h3 className="text-sm font-medium text-gray-500 mb-2">PREFERENCES</h3>
          <ul>
            <li className="py-2">
              <Link to="/settings" className="flex items-center w-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-gray-700">Settings</span>
              </Link>
            </li>
            <li className="py-2">
              <Link to="/settings/pricing" className="flex items-center w-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-gray-700">Pricing Management</span>
              </Link>
            </li>
            <li className="py-2">
              <Link to="/customers" className="flex items-center w-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-gray-700">Manage Customers</span>
              </Link>
            </li>
            <li className="py-2">
              <button className="flex items-center w-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700">Help & Support</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">APP</h3>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-gray-700">Offline Mode</span>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input type="checkbox" id="toggle" className={`peer ${toggleCheckboxStyle}`} />
            <label htmlFor="toggle" className={toggleLabelStyle}></label>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-gray-700">Notifications</span>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input type="checkbox" id="toggle-notifications" className={`peer ${toggleCheckboxStyle}`} />
            <label htmlFor="toggle-notifications" className={toggleLabelStyle}></label>
          </div>
        </div>

        <div className="py-2">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-gray-700">Sync Data</span>
          </div>
          <button className="mt-2 w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg font-medium">
            Sync Now
          </button>
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className="w-full bg-red-600 text-white py-3 rounded-lg font-medium"
        >
          {isLoggingOut ? 'Logging out...' : 'Log Out'}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage; 