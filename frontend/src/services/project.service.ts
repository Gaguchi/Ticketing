/**
 * Project Service
 * Handles project-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';

export interface Project {
  id: number;
  key: string;
  name: string;
  description?: string;
  lead_username?: string;
  members?: Array<{
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  }>;
  tickets_count: number;
  columns_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectData {
  key: string;
  name: string;
  description?: string;
  lead_username?: string;
}

class ProjectService {
  /**
   * Get all projects
   */
  async getProjects(): Promise<Project[]> {
    return await apiService.get<Project[]>(API_ENDPOINTS.PROJECTS);
  }

  /**
   * Get project by ID
   */
  async getProject(id: number): Promise<Project> {
    return await apiService.get<Project>(API_ENDPOINTS.PROJECT_DETAIL(id));
  }

  /**
   * Create new project
   */
  async createProject(data: CreateProjectData): Promise<Project> {
    return await apiService.post<Project>(API_ENDPOINTS.PROJECTS, data);
  }

  /**
   * Update project
   */
  async updateProject(id: number, data: Partial<CreateProjectData>): Promise<Project> {
    return await apiService.patch<Project>(API_ENDPOINTS.PROJECT_DETAIL(id), data);
  }

  /**
   * Delete project
   */
  async deleteProject(id: number): Promise<void> {
    return await apiService.delete<void>(API_ENDPOINTS.PROJECT_DETAIL(id));
  }

  /**
   * Get project tickets
   */
  async getProjectTickets(id: number): Promise<any[]> {
    return await apiService.get<any[]>(API_ENDPOINTS.PROJECT_TICKETS(id));
  }

  /**
   * Get project columns
   */
  async getProjectColumns(id: number): Promise<any[]> {
    return await apiService.get<any[]>(API_ENDPOINTS.PROJECT_COLUMNS(id));
  }

  /**
   * Check if user has access to any projects (as lead or member)
   * Returns true if user is lead or member of at least one project
   */
  async userHasProjects(username: string): Promise<boolean> {
    try {
      const projects = await this.getProjects();
      
      // Check if user is lead or member of any project
      return projects.some(project => 
        project.lead_username === username || 
        (project.members && project.members.some(member => member.username === username))
      );
    } catch (error) {
      console.error('Error checking user projects:', error);
      return false;
    }
  }
}

export const projectService = new ProjectService();
export default projectService;
