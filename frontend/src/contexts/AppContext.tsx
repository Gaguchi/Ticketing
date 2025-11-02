/**
 * Centralized Application Context
 * Combines authentication and project management with optimized performance
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { authService } from "../services/auth.service";
import { storage } from "../utils/storage";
import { debug } from "../utils/debug";
import type { User, Project } from "../types/api";

// ============ TYPES ============
interface AppState {
  // Auth state
  user: User | null;
  token: string | null;
  authLoading: boolean;
  isAuthenticated: boolean;

  // Project state
  selectedProject: Project | null;
  availableProjects: Project[];
  hasProjects: boolean;
  projectLoading: boolean;
}

interface AppActions {
  // Auth actions
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;

  // Project actions
  setSelectedProject: (project: Project | null) => void;
  refreshProjects: () => Promise<void>;
}

type AppContextType = AppState & AppActions;

// ============ CONTEXT ============
const AppContext = createContext<AppContextType | undefined>(undefined);

// ============ PROVIDER ============
export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // ===== State =====
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(
    null
  );
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [projectLoading, setProjectLoading] = useState(true);

  // ===== Refs for optimization =====
  const initRef = useRef(false);
  const fetchInProgressRef = useRef(false);

  // ===== Derived state (memoized) =====
  const isAuthenticated = useMemo(() => !!token && !!user, [token, user]);
  const hasProjects = useMemo(
    () => user?.has_projects || availableProjects.length > 0,
    [user?.has_projects, availableProjects.length]
  );

  // ===== Auth initialization =====
  useEffect(() => {
    // Prevent duplicate initialization
    if (initRef.current) {
      debug.auth("Already initialized, skipping");
      return;
    }
    initRef.current = true;

    const initAuth = async () => {
      debug.auth("Initializing...");

      const storedToken = storage.getAccessToken();
      const storedUser = storage.getUser();

      if (!storedToken || !storedUser) {
        debug.auth("No stored credentials");
        setAuthLoading(false);
        setProjectLoading(false);
        return;
      }

      debug.auth("Found stored user:", storedUser.username);
      setToken(storedToken);
      setUser(storedUser);

      // Check if cached data is fresh
      if (storage.isUserDataFresh()) {
        debug.auth("Using cached user data");
        setAuthLoading(false);
        return;
      }

      // Fetch fresh data
      if (fetchInProgressRef.current) {
        debug.auth("Fetch already in progress, skipping");
        setAuthLoading(false);
        return;
      }

      try {
        fetchInProgressRef.current = true;
        debug.auth("Fetching fresh user data...");

        const freshUser = await authService.getCurrentUser();
        setUser(freshUser);
        storage.setUser(freshUser);

        debug.auth("Fresh data received:", freshUser.username);
      } catch (error) {
        console.error("Auth fetch failed:", error);
      } finally {
        fetchInProgressRef.current = false;
        setAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  // ===== Project selection effect =====
  useEffect(() => {
    if (authLoading || !user) {
      setProjectLoading(true);
      return;
    }

    const projects = user.projects || [];
    setAvailableProjects(projects);

    // Auto-select project
    if (!selectedProject && projects.length > 0) {
      const storedProjectId = storage.getSelectedProjectId();
      const projectToSelect =
        projects.find((p) => p.id === storedProjectId) || projects[0];

      debug.project("Auto-selecting:", projectToSelect.name);
      setSelectedProjectState(projectToSelect);
    }

    setProjectLoading(false);
  }, [user, authLoading, selectedProject]);

  // ===== Memoized actions =====
  const login = useCallback((newToken: string, newUser: User) => {
    debug.auth("Login:", newUser.username);
    setToken(newToken);
    setUser(newUser);
    storage.setAccessToken(newToken);
    storage.setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    debug.auth("Logout");
    authService.logout();
    setToken(null);
    setUser(null);
    setSelectedProjectState(null);
    setAvailableProjects([]);
    storage.clearAll();
  }, []);

  const refreshUser = useCallback(async () => {
    if (fetchInProgressRef.current) {
      debug.auth("Refresh already in progress");
      return;
    }

    try {
      fetchInProgressRef.current = true;
      debug.auth("Refreshing user data...");

      const freshUser = await authService.getCurrentUser();
      setUser(freshUser);
      storage.setUser(freshUser);

      debug.auth("User refreshed:", freshUser.username);
    } catch (error) {
      console.error("User refresh failed:", error);
    } finally {
      fetchInProgressRef.current = false;
    }
  }, []);

  const setSelectedProject = useCallback((project: Project | null) => {
    setSelectedProjectState(project);
    if (project) {
      storage.setSelectedProjectId(project.id);
      debug.project("Selected:", project.name);
    } else {
      storage.clearSelectedProjectId();
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    setProjectLoading(true);
    try {
      await refreshUser();
    } finally {
      setProjectLoading(false);
    }
  }, [refreshUser]);

  // ===== Memoized context value =====
  const value = useMemo<AppContextType>(
    () => ({
      // State
      user,
      token,
      authLoading,
      isAuthenticated,
      selectedProject,
      availableProjects,
      hasProjects,
      projectLoading,
      // Actions
      login,
      logout,
      refreshUser,
      setSelectedProject,
      refreshProjects,
    }),
    [
      user,
      token,
      authLoading,
      isAuthenticated,
      selectedProject,
      availableProjects,
      hasProjects,
      projectLoading,
      login,
      logout,
      refreshUser,
      setSelectedProject,
      refreshProjects,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ============ HOOK ============
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

// ============ LEGACY HOOKS (for backward compatibility) ============
export const useAuth = () => {
  const {
    user,
    token,
    authLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  } = useApp();
  return {
    user,
    token,
    loading: authLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };
};

export const useProject = () => {
  const {
    selectedProject,
    availableProjects,
    hasProjects,
    projectLoading,
    setSelectedProject,
    refreshProjects,
  } = useApp();
  return {
    selectedProject,
    availableProjects,
    hasProjects,
    loading: projectLoading,
    setSelectedProject,
    refreshProjects,
  };
};
