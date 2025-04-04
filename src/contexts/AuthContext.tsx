
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, loginUser, loginUserVulnerable } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isSecureMode: boolean;
  setIsSecureMode: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSecureMode: () => void; // Add this new function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSecureMode, setIsSecureMode] = useState(true);
  const { toast } = useToast();

  // Add the toggleSecureMode function
  const toggleSecureMode = () => {
    setIsSecureMode(prev => !prev);
    toast({
      title: `Switched to ${!isSecureMode ? "Secure" : "Vulnerable"} Mode`,
      description: `The application is now running in ${!isSecureMode ? "secure" : "vulnerable"} mode.`,
      variant: !isSecureMode ? "default" : "destructive"
    });
  };

  useEffect(() => {
    // Try to get user from localStorage on initial load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        // Fixed: Don't set promise as state
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Use secure or vulnerable login based on mode
      const authenticatedUser = isSecureMode
        ? await loginUser(username, password)
        : await loginUserVulnerable(username, password);
      
      if (authenticatedUser) {
        // Fixed: Store serialized user object
        localStorage.setItem('user', JSON.stringify(authenticatedUser));
        setUser(authenticatedUser);
        return true;
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid username or password",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoading, 
      isSecureMode, 
      setIsSecureMode,
      toggleSecureMode // Add the new function to the context value
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
