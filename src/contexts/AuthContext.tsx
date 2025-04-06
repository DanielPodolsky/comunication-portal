import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  email: string;
  failedLoginAttempts: number;
  locked: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isSecureMode: boolean;
  setIsSecureMode: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSecureMode: () => void;
}

const API_BASE_URL = 'http://localhost:3001/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSecureMode, setIsSecureMode] = useState(true);
  const { toast } = useToast();

  // Toggle secure/vulnerable mode
  const toggleSecureMode = () => {
    setIsSecureMode(prev => !prev);
    toast({
      title: `Switched to ${!isSecureMode ? "Secure" : "Vulnerable"} Mode`,
      description: `The application is now running in ${!isSecureMode ? "secure" : "vulnerable"} mode.`,
      variant: !isSecureMode ? "default" : "destructive",
    });
  };

  // Auto-login based on session (e.g., cookie)
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/me`, {
          method: 'GET',
          credentials: 'include', // ✅ this is REQUIRED
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auto-login failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
          secureMode: isSecureMode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        setUser(data.user);
        return true;
      } else {
        toast({
          title: "Login Failed",
          description: data.message || "Invalid username or password",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isLoading,
      isSecureMode,
      setIsSecureMode,
      toggleSecureMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider, useAuth };