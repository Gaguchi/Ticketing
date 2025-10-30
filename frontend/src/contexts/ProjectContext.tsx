import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface Project {
  id: number;
  key: string;
  name: string;
  description?: string;
  lead_username?: string;
  created_at?: string;
  updated_at?: string;
  members?: number[];
  companies?: number[];
}

interface ProjectContextType {
  selectedProject: Project | null;
  availableProjects: Project[];
  hasProjects: boolean;
  loading: boolean;
  setSelectedProject: (project: Project | null) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({
  children,
}) => {
  const { user, refreshUser } = useAuth();
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(
    null
  );
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [hasProjects, setHasProjects] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Load projects from user data
  useEffect(() => {
    if (user) {
      const projects = user.projects || [];

      setAvailableProjects(projects);
      setHasProjects(user.has_projects || false);

      // Auto-select first project if none selected
      if (!selectedProject && projects.length > 0) {
        const storedProjectId = localStorage.getItem("selectedProjectId");

        if (storedProjectId) {
          const storedProject = projects.find(
            (p: Project) => p.id === parseInt(storedProjectId)
          );
          if (storedProject) {
            setSelectedProjectState(storedProject);
          } else {
            setSelectedProjectState(projects[0]);
          }
        } else {
          setSelectedProjectState(projects[0]);
        }
      }

      setLoading(false);
    } else {
      setAvailableProjects([]);
      setSelectedProjectState(null);
      setHasProjects(false);
      setLoading(false);
    }
  }, [user]);

  const setSelectedProject = (project: Project | null) => {
    setSelectedProjectState(project);
    if (project) {
      localStorage.setItem("selectedProjectId", project.id.toString());
    } else {
      localStorage.removeItem("selectedProjectId");
    }
  };

  const refreshProjects = async () => {
    // Refresh user data from API to get latest projects
    setLoading(true);
    try {
      await refreshUser();
    } catch (error) {
      console.error("Failed to refresh projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const value: ProjectContextType = {
    selectedProject,
    availableProjects,
    hasProjects,
    loading,
    setSelectedProject,
    refreshProjects,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};
