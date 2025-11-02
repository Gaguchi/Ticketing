import apiService from "./api.service";
import { API_BASE_URL } from "../config/api";

// Type definitions

export interface Subtask {
  id: number;
  ticket: number;
  title: string;
  assignee?: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  } | null;
  assignee_id?: number | null;
  is_complete: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  created_by?: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  } | null;
}

export interface CreateSubtaskData {
  ticket: number;
  title: string;
  assignee_id?: number | null;
  is_complete?: boolean;
  order?: number;
}

export interface UpdateSubtaskData {
  title?: string;
  assignee_id?: number | null;
  is_complete?: boolean;
  order?: number;
}

class SubtaskService {
  /**
   * Get all subtasks for a specific ticket
   */
  async getSubtasks(ticketId: number): Promise<Subtask[]> {
    const response = await apiService.get<{ results: Subtask[] }>(`${API_BASE_URL}/api/tickets/subtasks/?ticket=${ticketId}`);
    return response.results || [];
  }

  /**
   * Create a new subtask
   */
  async createSubtask(data: CreateSubtaskData): Promise<Subtask> {
    return await apiService.post<Subtask>(`${API_BASE_URL}/api/tickets/subtasks/`, data);
  }

  /**
   * Update a subtask
   */
  async updateSubtask(id: number, data: UpdateSubtaskData): Promise<Subtask> {
    return await apiService.patch<Subtask>(`${API_BASE_URL}/api/tickets/subtasks/${id}/`, data);
  }

  /**
   * Toggle subtask completion status
   */
  async toggleComplete(id: number, isComplete: boolean): Promise<Subtask> {
    return await apiService.patch<Subtask>(`${API_BASE_URL}/api/tickets/subtasks/${id}/`, {
      is_complete: isComplete,
    });
  }

  /**
   * Reorder subtasks
   */
  async reorderSubtasks(subtasks: { id: number; order: number }[]): Promise<void> {
    // Batch update subtask orders
    const promises = subtasks.map(({ id, order }) =>
      apiService.patch(`${API_BASE_URL}/api/tickets/subtasks/${id}/`, { order })
    );
    await Promise.all(promises);
  }

  /**
   * Delete a subtask
   */
  async deleteSubtask(id: number): Promise<void> {
    await apiService.delete(`${API_BASE_URL}/api/tickets/subtasks/${id}/`);
  }
}

export const subtaskService = new SubtaskService();
