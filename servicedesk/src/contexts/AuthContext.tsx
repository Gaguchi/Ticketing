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

// Helper to read a specific cookie value
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

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
    // Check if is_authenticated cookie exists (set by backend, non-httpOnly)
    const isAuth = getCookie('is_authenticated');
    const storedUser = localStorage.getItem("user");

    if (isAuth === 'true' && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        logout();
      }
    } else if (isAuth === 'true') {
      // Cookie exists but no local user data - fetch from API
      try {
        const userData = await apiService.get<User>(API_ENDPOINTS.AUTH_ME);
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } catch {
        logout();
      }
    }
    setLoading(false);
  };

  const login = async (username: string, password: string) => {
    const response = await apiService.post<{
      user: User;
    }>(API_ENDPOINTS.AUTH_LOGIN, { username, password });

    // Tokens are set as httpOnly cookies by the backend
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
  };

  const logout = () => {
    // Call backend to clear httpOnly cookies
    apiService.post('/api/tickets/auth/logout/').catch(() => {});
    localStorage.removeItem("user");
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
