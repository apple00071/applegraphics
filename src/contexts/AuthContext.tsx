import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as authService from '../services/authService';
import { User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, userData?: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Memoize checkSession to avoid dependencies issues
  const checkSession = useCallback(async () => {
    console.log('Checking auth session...');
    try {
      // First try to get user data directly from localStorage
      const userDataStr = localStorage.getItem('userData');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr) as User;
          if (userData && userData.id && userData.email && userData.role) {
            console.log('Setting user from stored userData');
            setUser(userData);
            setIsLoading(false);
            setIsAuthenticated(true);
            return;
          }
        } catch (error) {
          console.error('Error parsing userData:', error);
          localStorage.removeItem('userData');
        }
      }
      
      // Try to get the token from localStorage next
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          // Use the auth service to validate token
          const userData = authService.validateToken(token);
          
          if (userData) {
            console.log('Token validated, setting user');
            setUser(userData);
            // Also save the user data for future reference
            localStorage.setItem('userData', JSON.stringify(userData));
            setIsLoading(false);
            setIsAuthenticated(true);
            return;
          } else {
            console.log('Token invalid or expired, removing');
            // Token invalid or expired, remove it
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
          }
        } catch (error) {
          console.error('Error validating token:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
      }
      
      // No valid session found
      setUser(null);
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email: string, password: string, userData?: User) => {
    try {
      const response = await authService.login(email, password);
      console.log('🔍 Login response:', response);
      if (response.token) {
        localStorage.setItem('token', response.token);
        console.log('✅ Token stored in localStorage:', response.token);
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        console.error('❌ No token received from login response');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      toast.error('Login failed. Please try again.');
    }
  };

  const logout = async () => {
    try {
      // Remove token and user data from localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      // Clear user state
      setUser(null);
      setIsAuthenticated(false);
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to log out');
    }
  };

  // Provide auth status information to consumer components
  const authValues = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={authValues}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 