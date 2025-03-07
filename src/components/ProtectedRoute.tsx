import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log('ProtectedRoute Auth Status:', { 
      isAuthenticated, 
      isLoading, 
      hasUser: !!user,
      userData: user,
      hasToken: !!localStorage.getItem('authToken'),
      hasStoredUser: !!localStorage.getItem('userData')
    });
  }, [isAuthenticated, isLoading, user]);

  if (isLoading) {
    console.log('Auth is still loading...');
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    
    // Check for token and user data - try manual recovery if possible
    const token = localStorage.getItem('authToken');
    const userDataStr = localStorage.getItem('userData');
    
    if (token && userDataStr) {
      console.log('Found token and userData in localStorage, but user not authenticated in context');
    }
    
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('Protected route rendering children');
  return <>{children}</>;
};

export default ProtectedRoute; 