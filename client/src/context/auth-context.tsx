import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/services/api';
import type { AuthResponse } from '@/services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  roles?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  walletLogin: (address: string, signature: string, nonce: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          _id: payload.sub,
          name: payload.name || '',
          email: payload.email || '',
          roles: payload.roles || [],
        });
      } catch (error) {
        api.clearToken();
      }
    }
    setIsLoading(false);
  }, []);

  const handleAuthResponse = (response: AuthResponse) => {
    api.setToken(response.token);
    setUser(response.user);
  };

  const login = async (email: string, password: string) => {
    const response = await api.login({ email, password });
    handleAuthResponse(response);
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await api.signup({ name, email, password });
    handleAuthResponse(response);
  };

  const walletLogin = async (address: string, signature: string, nonce: string) => {
    const response = await api.walletLogin({
      address,
      chain: 'solana',
      signature,
      nonce,
    });
    handleAuthResponse(response);
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        walletLogin,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
