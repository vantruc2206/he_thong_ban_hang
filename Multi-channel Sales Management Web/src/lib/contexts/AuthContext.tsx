import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { mockUsers } from "../../app/data/mockData";

export type Role = "admin" | "sales" | "warehouse";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("system_auth_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem("system_auth_user");
      }
    }
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      if (res.ok) {
        const tokens = await res.json();
        localStorage.setItem("access_token", tokens.access_token);
        localStorage.setItem("refresh_token", tokens.refresh_token);

        const userRes = await fetch("http://localhost:8000/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (userRes.ok) {
          const profile = await userRes.json();
          const appUser: User = {
            id: profile.id,
            email: profile.email,
            name: profile.full_name || profile.email,
            role: profile.role === "admin" ? "admin" : profile.role === "warehouse_staff" ? "warehouse" : "sales",
            avatar: profile.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
          };
          setUser(appUser);
          localStorage.setItem("system_auth_user", JSON.stringify(appUser));
          return true;
        }
      }
    } catch (err) {
      console.warn("Backend login error", err);
    }

    if (email === "admin@hethong.vn" || email === "sales@hethong.vn" || email === "warehouse@hethong.vn") {
      const role: Role = email.startsWith("admin") ? "admin" : email.startsWith("warehouse") ? "warehouse" : "sales";
      const demoUser: User = {
        id: 1,
        email,
        name: email.startsWith("admin") ? "Quản Trị Viên" : email.startsWith("warehouse") ? "Thủ Kho" : "Nhân Viên Sales",
        role,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
      };
      setUser(demoUser);
      localStorage.setItem("system_auth_user", JSON.stringify(demoUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("system_auth_user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
