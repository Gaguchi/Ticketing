import apiService from "./api.service";
import { API_BASE_URL } from "../config/api";

// Type definitions
export interface LinkedTicket {
  id: number;
  name: string;
  type: string;
  status: string;
  project: number;
  project_key: string;
}

export interface IssueLink {
  id: number;
  source_ticket: LinkedTicket;
  source_ticket_id: number;
  target_ticket: LinkedTicket;
  target_ticket_id: number;
  link_type: string;
  created_by?: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  created_at: string;
}

export interface CreateIssueLinkData {
  source_ticket_id: number;
  target_ticket_id: number;
  link_type: string;
}

export const LINK_TYPES = [
  { value: 'blocks', label: 'Blocks' },
  { value: 'is_blocked_by', label: 'Is Blocked By' },
  { value: 'relates_to', label: 'Relates To' },
  { value: 'duplicates', label: 'Duplicates' },
  { value: 'is_duplicated_by', label: 'Is Duplicated By' },
  { value: 'causes', label: 'Causes' },
  { value: 'is_caused_by', label: 'Is Caused By' },
];

class LinkedItemService {
  /**
   * Get all linked items for a ticket
   * @param ticketId - The ticket ID to get linked items for
   * @returns Promise with array of issue links
   */
  async getLinkedItems(ticketId: number): Promise<IssueLink[]> {
    const response = await apiService.get<{ results: IssueLink[] }>(`${API_BASE_URL}/api/tickets/issue-links/?ticket=${ticketId}`);
    return response.results || [];
  }

  /**
   * Create a new link between tickets
   * @param data - The link data (source, target, type)
   * @returns Promise with the created link
   */
  async createLink(data: CreateIssueLinkData): Promise<IssueLink> {
    return await apiService.post<IssueLink>(`${API_BASE_URL}/api/tickets/issue-links/`, data);
  }

  /**
   * Delete a link
   * @param linkId - The ID of the link to delete
   * @returns Promise that resolves when deleted
   */
  async deleteLink(linkId: number): Promise<void> {
    await apiService.delete(`${API_BASE_URL}/api/tickets/issue-links/${linkId}/`);
  }

  /**
   * Search for tickets to link (autocomplete)
   * @param searchTerm - The search term for ticket name
   * @param projectId - Optional project ID to filter by
   * @returns Promise with array of tickets
   */
  async searchTickets(searchTerm: string, projectId?: number): Promise<LinkedTicket[]> {
    let url = `${API_BASE_URL}/api/tickets/tickets/?search=${encodeURIComponent(searchTerm)}`;
    if (projectId) {
      url += `&project=${projectId}`;
    }
    const response = await apiService.get<{ results: LinkedTicket[] }>(url);
    return response.results;
  }
}

export const linkedItemService = new LinkedItemService();
