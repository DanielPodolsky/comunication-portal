
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, loginUser, loginUserVulnerable, getUserById } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSecureMode: boolean;
  toggleSecureMode: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSecureMode, setIsSecureMode] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is logged in
    const storedUserId = localStorage.getItem('currentUserId');
    if (storedUserId) {
      const foundUser = getUserById(storedUserId);
      if (foundUser) {
        setUser(foundUser);
      } else {
        localStorage.removeItem('currentUserId');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Use secure or vulnerable login based on mode
      const loggedInUser = isSecureMode 
        ? loginUser(username, password)
        : loginUserVulnerable(username, password);
      
      if (loggedInUser) {
        setUser(loggedInUser);
        localStorage.setItem('currentUserId', loggedInUser.id);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${loggedInUser.username}!`,
        });
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
        title: "Login Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('currentUserId');
    setUser(null);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out"
    });
  };

  const toggleSecureMode = () => {
    setIsSecureMode(prev => !prev);
    toast({
      title: `${!isSecureMode ? "Secure" : "Vulnerable"} Mode Activated`,
      description: `The application is now in ${!isSecureMode ? "secure" : "vulnerable"} mode.`,
      variant: !isSecureMode ? "default" : "destructive"
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isSecureMode,
      toggleSecureMode,
      login, 
      logout 
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
