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
      // Set the user based on local storage token
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Get the username from email
          const username = email.split('@')[0];
          
          // Try to get user data from users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, username')
            .eq('email', email)
            .single();

          if (userError) {
            // Fallback to using the username
            const { data: usernameData, error: usernameError } = await supabase
              .from('users')
              .select('role, username')
              .eq('username', username)
              .single();
              
            if (usernameError) {
              // If we can't get user data from Supabase, create a minimal user object
              setUser({
                id: username, // use username as id fallback
                email,
                role: username === 'admin' ? 'admin' : 'user', // Default role based on username
                username
              });
              return;
            }
            
            setUser({
              id: username, // use username as id fallback
              email,
              role: usernameData.role,
              username: usernameData.username
            });
            return;
          }

          setUser({
            id: userData.username, // use username as id fallback
            email,
            role: userData.role,
            username: userData.username || username
          });
        } catch (error) {
          console.error('Error setting user data:', error);
          // Set minimal user object as fallback
          const username = email.split('@')[0];
          setUser({
            id: username,
            email,
            role: username === 'admin' ? 'admin' : 'user',
            username
          });
        }
      }
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