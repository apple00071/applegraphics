import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    // Check active session on mount
    checkSession();
  }, []);

  const checkSession = async () => {
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
            setUser(userData);
            setIsLoading(false);
            return;
          } else {
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
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, userData?: User) => {
    try {
      // If user data is directly provided, use it immediately
      if (userData) {
        console.log('Setting user from provided data:', userData);
        setUser(userData);
        return;
      }

      // Otherwise, try to login using the service
      const data = await authService.login(email, password);
      
      // Store the authentication token and user data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      
      // Set user state from API response
      setUser(data.user);
      
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Remove token and user data from localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      // Clear user state
      setUser(null);
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to log out');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 