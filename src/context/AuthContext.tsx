import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthUser } from "../types/business-rules.types.ts";
import { clearAuthSession, getStoredToken, getStoredUser, setAuthSession } from "../utils/auth.ts";

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;  
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);  

  useEffect(() => {
    
    const storedUser = getStoredUser();
    const storedToken = getStoredToken();
    
    setUser(storedUser);
    setToken(storedToken);
    setIsLoading(false);  
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    setAuthSession(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,  
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}