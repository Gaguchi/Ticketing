import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { authService } from "../services/auth.service";
import { tabSync } from "../utils/tab-sync";
import type { User } from "../types/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const refreshIntervalRef = useRef<number | null>(null);

  // Initialize multi-tab synchronization
  useEffect(() => {
    tabSync.init();
    return () => tabSync.destroy();
  }, []);

  // Periodic token refresh (since we can't decode httpOnly cookies)
  useEffect(() => {
    if (token) {
      // Refresh every 20 minutes (tokens last 24 hours but refresh proactively)
      refreshIntervalRef.current = window.setInterval(async () => {
        try {
          await authService.refreshToken();
        } catch {
          // Let the 401 interceptor handle it on next request
        }
      }, 20 * 60 * 1000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [token]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      const isAuth = authService.isAuthenticated();
      const storedUser = authService.getUser();

      if (isAuth && storedUser) {
        setToken('cookie-auth');
        setUser(storedUser);

        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (now - lastFetchRef.current < fiveMinutes && lastFetchRef.current > 0) {
          setLoading(false);
          return;
        }

        try {
          const freshUser = await authService.getCurrentUser();
          lastFetchRef.current = Date.now();
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        } catch {
          // Keep stored user if API call fails
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (newUser: User) => {
    setToken('cookie-auth');
    setUser(newUser);
  };

  const logout = async () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    tabSync.broadcastLogout();
    await authService.logout();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const freshUser = await authService.getCurrentUser();
      setUser(freshUser);
      localStorage.setItem("user", JSON.stringify(freshUser));
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
