/**
 * Project Service
 * Handles project-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  PaginatedResponse,
  PaginationParams,
} from '../types/api';

class ProjectService {
  /**
   * Get all projects with pagination
   */
  async getProjects(params?: PaginationParams): Promise<PaginatedResponse<Project>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.PROJECTS}?${queryParams.toString()}`
      : API_ENDPOINTS.PROJECTS;
    
    return await apiService.get<PaginatedResponse<Project>>(url);
  }

  /**
   * Get all projects (unpaginated - fetches all results)
   */
  async getAllProjects(): Promise<Project[]> {
    const response = await this.getProjects({ page_size: 1000 });
    return response.results;
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
  async updateProject(id: number, data: UpdateProjectData): Promise<Project> {
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
      const projects = await this.getAllProjects();
      
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
