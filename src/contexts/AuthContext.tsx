import React, { createContext, useContext, useState, useCallback } from "react";

type Role = "owner" | "sitter" | "both";
type ActiveRole = "owner" | "sitter";

interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  profileCompletion: number;
}

interface AuthContextType {
  user: User | null;
  activeRole: ActiveRole;
  isAuthenticated: boolean;
  setActiveRole: (role: ActiveRole) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<ActiveRole>("sitter");

  const login = useCallback(async (_email: string, _password: string) => {
    // Mock login — will be replaced with Lovable Cloud
    setUser({
      id: "mock-user-1",
      email: _email,
      role: "both",
      firstName: "Jean",
      lastName: "Dupont",
      profileCompletion: 0,
    });
  }, []);

  const register = useCallback(async (_email: string, _password: string, role: Role) => {
    setUser({
      id: "mock-user-1",
      email: _email,
      role,
      firstName: "",
      lastName: "",
      profileCompletion: 0,
    });
    if (role === "owner" || role === "both") setActiveRole("owner");
    else setActiveRole("sitter");
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        isAuthenticated: !!user,
        setActiveRole,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
