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
  login: (email: string, password: string) => Promise<void>;
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

  const login = async (email: string, password: string) => {
    try {
      // Get token from localStorage (set by the Login component)
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          // Extract user data from the token (which is base64 encoded)
          const tokenData = JSON.parse(atob(token));
          
          setUser({
            id: tokenData.id || tokenData.username,
            email: tokenData.email || email,
            role: tokenData.role || (email.startsWith('admin') ? 'admin' : 'user'),
            username: tokenData.username || email.split('@')[0]
          });
          
          return;
        } catch (error) {
          console.error('Error parsing token:', error);
        }
      }
      
      // Fallback: Set user based on email pattern
      const username = email.split('@')[0];
      setUser({
        id: username,
        email,
        role: username === 'admin' ? 'admin' : 'user',
        username
      });
    } catch (error: any) {
      console.error('Login context update failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
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