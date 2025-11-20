/**
 * Ticket Service
 * Handles all ticket-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  Ticket,
  TicketActivityItem,
  CreateTicketData,
  UpdateTicketData,
  TicketFilterParams,
  PaginatedResponse,
  ToggleFollowResponse,
} from '../types/api';

class TicketService {
  /**
   * Get all tickets with optional filtering and pagination
   */
  async getTickets(params?: TicketFilterParams): Promise<PaginatedResponse<Ticket>> {
    const query = this.buildTicketQuery(params);
    const url = query ? `${API_ENDPOINTS.TICKETS}?${query}` : API_ENDPOINTS.TICKETS;
    return apiService.get<PaginatedResponse<Ticket>>(url);
  }

  async getArchivedTickets(params?: TicketFilterParams): Promise<PaginatedResponse<Ticket>> {
    const query = this.buildTicketQuery(params);
    const url = query
      ? `${API_ENDPOINTS.TICKETS_ARCHIVED}?${query}`
      : API_ENDPOINTS.TICKETS_ARCHIVED;
    return apiService.get<PaginatedResponse<Ticket>>(url);
  }

  /**
   * Get all tickets for a project (unpaginated)
   */
  async getAllProjectTickets(projectId: number): Promise<Ticket[]> {
    const response = await this.getTickets({ project: projectId, page_size: 1000 });
    return response.results;
  }

  /**
   * Get a single ticket by ID
   */
  async getTicket(id: number): Promise<Ticket> {
    return apiService.get<Ticket>(API_ENDPOINTS.TICKET_DETAIL(id));
  }

  /**
   * Get ticket history
   */
  async getTicketHistory(id: number): Promise<TicketActivityItem[]> {
    return apiService.get<TicketActivityItem[]>(API_ENDPOINTS.TICKET_HISTORY(id));
  }

  /**
   * Create a new ticket
   */
  async createTicket(data: CreateTicketData): Promise<Ticket> {
    return apiService.post<Ticket>(API_ENDPOINTS.TICKETS, data);
  }

  /**
   * Update a ticket
   */
  async updateTicket(id: number, data: UpdateTicketData): Promise<Ticket> {
    return apiService.patch<Ticket>(API_ENDPOINTS.TICKET_DETAIL(id), data);
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(id: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.TICKET_DETAIL(id));
  }

  /**
   * Move ticket to a different column (using PATCH to update column field)
   */
  async moveTicket(id: number, columnId: number): Promise<Ticket> {
    return apiService.patch<Ticket>(API_ENDPOINTS.TICKET_DETAIL(id), {
      column: columnId,
    });
  }

  /**
   * Toggle follow status for a ticket
   */
  async toggleFollow(id: number): Promise<ToggleFollowResponse> {
    return apiService.post<ToggleFollowResponse>(
      API_ENDPOINTS.TICKET_FOLLOW(id)
    );
  }

  async archiveTicket(id: number, reason?: string): Promise<Ticket> {
    const payload = reason ? { reason } : {};
    return apiService.post<Ticket>(API_ENDPOINTS.TICKET_ARCHIVE(id), payload);
  }

  async restoreTicket(id: number): Promise<Ticket> {
    return apiService.post<Ticket>(API_ENDPOINTS.TICKET_RESTORE(id), {});
  }

  /**
   * Reorder tickets within or across columns
   */
  async reorderTickets(updates: Array<{ticket_id: number, column_id: number, order: number}>): Promise<{status: string, updated: number[]}> {
    return apiService.post<{status: string, updated: number[]}>(API_ENDPOINTS.TICKET_REORDER, { updates });
  }

  private buildTicketQuery(params?: TicketFilterParams): string {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.priority_id) queryParams.append('priority_id', params.priority_id.toString());
    if (params?.column) queryParams.append('column', params.column.toString());
    if (params?.company) queryParams.append('company', params.company.toString());
    if (params?.project) queryParams.append('project', params.project.toString());
    if (params?.assignee) queryParams.append('assignee', params.assignee.toString());
    if (params?.reporter) queryParams.append('reporter', params.reporter.toString());
    if (params?.tag) queryParams.append('tag', params.tag.toString());
    if (params?.ordering) queryParams.append('ordering', params.ordering);
    if (typeof params?.archived !== 'undefined') {
      const archivedValue =
        typeof params.archived === 'boolean'
          ? params.archived.toString()
          : params.archived;
      queryParams.append('archived', archivedValue);
    }
    if (typeof params?.include_archived !== 'undefined') {
      queryParams.append('include_archived', params.include_archived ? 'true' : 'false');
    }

    return queryParams.toString();
  }
}

export const ticketService = new TicketService();
export default ticketService;
