import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../api/supabase';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  role: string;
  username?: string;
}

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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        try {
          // Get user details from users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, username')
            .eq('email', session.user.email)
            .single();

          if (userError) throw userError;

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: userData.role,
            username: userData.username
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      // First try to get user data directly from localStorage
      const userDataStr = localStorage.getItem('userData');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
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
          // Parse the token data
          const tokenData = JSON.parse(atob(token));
          
          // Check if token is expired
          if (tokenData.exp && tokenData.exp > Date.now()) {
            setUser({
              id: tokenData.id,
              email: tokenData.email,
              role: tokenData.role,
              username: tokenData.username
            });
            setIsLoading(false);
            return;
          } else {
            // Token expired, remove it
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
          }
        } catch (error) {
          console.error('Error parsing token:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
      }
      
      // If no valid data in localStorage, fallback to Supabase session check
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Get user details from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, username')
          .eq('email', session.user.email)
          .single();

        if (userError) throw userError;

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: userData.role,
          username: userData.username
        });
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

      // Otherwise, check if token is in localStorage
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          // Extract user data from the token (which is base64 encoded)
          const tokenData = JSON.parse(atob(token));
          
          // Check if token has all the required fields
          if (tokenData.id && tokenData.email && tokenData.role) {
            setUser({
              id: tokenData.id,
              email: tokenData.email,
              role: tokenData.role,
              username: tokenData.username || tokenData.email.split('@')[0]
            });
            return;
          }
        } catch (error) {
          console.error('Error parsing token:', error);
          localStorage.removeItem('authToken');
        }
      }
      
      // If no valid token in localStorage, try to login directly with the API
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      const data = await response.json();
      
      // Store the authentication token
      localStorage.setItem('authToken', data.token);
      
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
      
      // Clean up Supabase session if it exists
      await supabase.auth.signOut();
      
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