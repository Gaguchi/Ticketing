/**
 * Ticket Service
 * Handles all ticket-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  Ticket,
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
    
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.TICKETS}?${queryParams.toString()}`
      : API_ENDPOINTS.TICKETS;
    
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
}

export const ticketService = new TicketService();
export default ticketService;
