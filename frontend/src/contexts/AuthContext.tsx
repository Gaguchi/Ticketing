import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { authService } from "../services/auth.service";
import { tabSync } from "../utils/tab-sync";
import { getRefreshTime, isTokenExpired } from "../utils/jwt-decoder";
import type { User } from "../types/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
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
  const initRef = useRef(false); // Prevent double initialization in React Strict Mode
  const lastFetchRef = useRef<number>(0); // Track last fetch time
  const refreshTimeoutRef = useRef<number | null>(null); // Token refresh timer

  // Initialize multi-tab synchronization
  useEffect(() => {
    tabSync.init();
    return () => tabSync.destroy();
  }, []);

  // Proactive token refresh scheduler
  useEffect(() => {
    const scheduleTokenRefresh = () => {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        return;
      }

      // Check if token is already expired
      if (isTokenExpired(accessToken)) {
        return;
      }

      // Calculate when to refresh (10 minutes before expiry)
      const refreshIn = getRefreshTime(accessToken, 10);

      if (refreshIn <= 0) {
        refreshTokenProactively();
        return;
      }

      refreshTimeoutRef.current = setTimeout(() => {
        refreshTokenProactively();
      }, refreshIn);
    };

    const refreshTokenProactively = async () => {
      try {
        const newToken = await authService.refreshToken();

        setToken(newToken);

        // Broadcast to other tabs
        tabSync.broadcastTokenRefresh(newToken);

        // Schedule next refresh
        scheduleTokenRefresh();
      } catch (error) {
        console.error("❌ [AuthContext] Failed to refresh token:", error);
        // Let the 401 interceptor handle it on next request
      }
    };

    // Schedule refresh when token changes
    if (token) {
      scheduleTokenRefresh();
    }

    // Cleanup timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [token]);

  useEffect(() => {
    // Prevent duplicate initialization in React Strict Mode
    if (initRef.current) {
      return;
    }
    initRef.current = true;

    // Check for stored auth on mount and fetch fresh user data
    const initAuth = async () => {
      const storedToken = authService.getAccessToken();
      const storedUser = authService.getUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);

        // Check if we need to fetch fresh data (cache for 5 minutes)
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        const timeSinceLastFetch = now - lastFetchRef.current;

        if (timeSinceLastFetch < fiveMinutes && lastFetchRef.current > 0) {
          setLoading(false);
          return;
        }

        // Fetch fresh user data from API to get updated projects/companies
        try {
          const freshUser = await authService.getCurrentUser();
          lastFetchRef.current = Date.now();
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        } catch (error) {
          console.error(
            "🔐 [AuthContext] Failed to fetch fresh user data:",
            error
          );
          // Keep the stored user if API call fails
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    // Clear refresh timer
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    // Broadcast logout to all tabs
    tabSync.broadcastLogout();

    // Clear local state
    authService.logout();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const freshUser = await authService.getCurrentUser();
      setUser(freshUser);
      // Update stored user
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
    isAuthenticated: !!token && !!user,
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
