
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, ShieldAlert, LogOut } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout, isSecureMode, toggleSecureMode } = useAuth();

  return (
    <header className="bg-brand-blue text-white py-4 px-6 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">Comunication_LTD</Link>
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="mr-2">Welcome, {user.username}</span>
              <Button 
                onClick={toggleSecureMode} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1 bg-transparent border-white text-white hover:bg-white hover:text-brand-blue"
              >
                {isSecureMode ? 
                  <><Shield size={16} /> Secure Mode</> : 
                  <><ShieldAlert size={16} /> Vulnerable Mode</>
                }
              </Button>
              <Button 
                onClick={logout} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1 bg-transparent border-white text-white hover:bg-white hover:text-brand-blue"
              >
                <LogOut size={16} /> Logout
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/login">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-transparent border-white text-white hover:bg-white hover:text-brand-blue"
                >
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-transparent border-white text-white hover:bg-white hover:text-brand-blue"
                >
                  Register
                </Button>
              </Link>
              <Button 
                onClick={toggleSecureMode} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1 bg-transparent border-white text-white hover:bg-white hover:text-brand-blue"
              >
                {isSecureMode ? 
                  <><Shield size={16} /> Secure Mode</> : 
                  <><ShieldAlert size={16} /> Vulnerable Mode</>
                }
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
