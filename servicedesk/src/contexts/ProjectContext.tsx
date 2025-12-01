import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Project } from "../types";
import { API_ENDPOINTS } from "../config/api";
import apiService from "../services/api.service";
import { useAuth } from "./AuthContext";

interface ProjectContextType {
  selectedProject: Project | null;
  projects: Project[];
  loading: boolean;
  setSelectedProject: (project: Project | null) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProjects = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await apiService.get<any>(API_ENDPOINTS.AUTH_ME);
      const userProjects = response.projects || [];
      setProjects(userProjects);

      // Auto-select first project if none selected
      if (userProjects.length > 0 && !selectedProject) {
        setSelectedProject(userProjects[0]);
      } else if (selectedProject) {
        // Verify selected project still exists
        const exists = userProjects.find(
          (p: Project) => p.id === selectedProject.id
        );
        if (!exists && userProjects.length > 0) {
          setSelectedProject(userProjects[0]);
        } else if (!exists) {
          setSelectedProject(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    } else {
      setProjects([]);
      setSelectedProject(null);
    }
  }, [user]);

  return (
    <ProjectContext.Provider
      value={{
        selectedProject,
        projects,
        loading,
        setSelectedProject,
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};
