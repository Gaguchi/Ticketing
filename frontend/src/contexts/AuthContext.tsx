import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { authService } from "../services/auth.service";
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

  useEffect(() => {
    // Prevent duplicate initialization in React Strict Mode
    if (initRef.current) {
      console.log("🔐 [AuthContext] Already initialized, skipping");
      return;
    }
    initRef.current = true;

    // Check for stored auth on mount and fetch fresh user data
    const initAuth = async () => {
      console.log("🔐 [AuthContext] Initializing auth...");
      const storedToken = authService.getAccessToken();
      const storedUser = authService.getUser();

      console.log(
        "🔐 [AuthContext] Stored token:",
        storedToken ? "EXISTS" : "NONE"
      );
      console.log(
        "🔐 [AuthContext] Stored user:",
        storedUser ? storedUser.username : "NONE"
      );

      if (storedToken && storedUser) {
        console.log("🔐 [AuthContext] Setting initial user from localStorage");
        console.log(
          "🔐 [AuthContext] User projects:",
          storedUser.projects?.length || 0
        );
        setToken(storedToken);
        setUser(storedUser);

        // Check if we need to fetch fresh data (cache for 5 minutes)
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        const timeSinceLastFetch = now - lastFetchRef.current;

        if (timeSinceLastFetch < fiveMinutes && lastFetchRef.current > 0) {
          console.log(
            "🔐 [AuthContext] Using cached user data (fetched",
            Math.round(timeSinceLastFetch / 1000),
            "seconds ago)"
          );
          setLoading(false);
          return;
        }

        // Fetch fresh user data from API to get updated projects/companies
        try {
          console.log("🔐 [AuthContext] Fetching fresh user data from API...");
          const freshUser = await authService.getCurrentUser();
          lastFetchRef.current = Date.now();
          console.log(
            "🔐 [AuthContext] Fresh user data received:",
            freshUser.username
          );
          console.log(
            "🔐 [AuthContext] Fresh user projects:",
            freshUser.projects?.length || 0
          );
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

      console.log("🔐 [AuthContext] Setting loading to false");
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    console.log("🔐 [AuthContext] Login called with user:", newUser.username);
    console.log(
      "🔐 [AuthContext] User projects on login:",
      newUser.projects?.length || 0
    );
    console.log(
      "🔐 [AuthContext] User has_projects on login:",
      newUser.has_projects
    );
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
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
