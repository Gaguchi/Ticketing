import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { User } from "../types";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Use localStorage as auth signal — the is_authenticated cookie may not be
    // readable cross-origin in production. Actual auth uses httpOnly cookies.
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        logout();
        setLoading(false);
        return;
      }

      // Validate session with backend (httpOnly cookies sent automatically)
      try {
        const userData = await apiService.get<User>(API_ENDPOINTS.AUTH_ME);
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } catch {
        // Token invalid and refresh failed — API interceptor handles redirect
      }
    }
    setLoading(false);
  };

  const login = async (username: string, password: string) => {
    const response = await apiService.post<{
      user: User;
      access?: string;
      refresh?: string;
    }>(API_ENDPOINTS.AUTH_LOGIN, { username, password });

    // Tokens are set as httpOnly cookies AND returned in body (cross-site fallback)
    localStorage.setItem("user", JSON.stringify(response.user));
    if (response.access) localStorage.setItem("access_token", response.access);
    if (response.refresh) localStorage.setItem("refresh_token", response.refresh);
    setUser(response.user);
  };

  const logout = () => {
    // Call backend to clear httpOnly cookies
    apiService.post('/api/tickets/auth/logout/').catch(() => {});
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
