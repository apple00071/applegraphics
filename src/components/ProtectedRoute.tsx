import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as authService from '../services/authService';
import { User } from '../services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user, login } = useAuth();
  const location = useLocation();
  const [localAuth, setLocalAuth] = useState<boolean>(false);
  const [localLoading, setLocalLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('ProtectedRoute Auth Status:', { 
      isAuthenticated, 
      isLoading, 
      hasUser: !!user,
      userData: user,
      hasToken: !!localStorage.getItem('authToken'),
      hasStoredUser: !!localStorage.getItem('userData')
    });

    // Try direct recovery if not authenticated but tokens exist
    const tryDirectAuth = async () => {
      try {
        if (!isAuthenticated && !isLoading) {
          const token = localStorage.getItem('authToken');
          const userDataStr = localStorage.getItem('userData');
          
          if (token && userDataStr) {
            console.log('Found token and userData in localStorage, trying direct recovery');
            
            // Try to validate token
            const userData = authService.validateToken(token);
            
            if (userData) {
              console.log('Token is valid, setting user directly');
              // Use the recovered user data to log in directly
              await login('', '', userData);
              setLocalAuth(true);
            } else {
              console.log('Token validation failed');
              localStorage.removeItem('authToken');
              localStorage.removeItem('userData');
            }
          }
        } else if (isAuthenticated) {
          setLocalAuth(true);
        }
      } catch (error) {
        console.error('Direct auth recovery failed:', error);
      } finally {
        setLocalLoading(false);
      }
    };
    
    tryDirectAuth();
  }, [isAuthenticated, isLoading, user, login]);

  if (isLoading || localLoading) {
    console.log('Auth is still loading...');
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!isAuthenticated && !localAuth) {
    console.log('Not authenticated, redirecting to login');
    
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('Protected route rendering children');
  return <>{children}</>;
};

export default ProtectedRoute; 