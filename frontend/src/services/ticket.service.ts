/**
 * Ticket Service
 * Handles all ticket-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type { Ticket } from '../types/ticket';

export interface CreateTicketData {
  name: string;
  description?: string;
  type: string;
  status: string;
  priority_id: number;
  column: number;
  project: number;
  customer?: number;
  assignee_ids?: number[];
  parent?: number;
  tags?: number[];
  due_date?: string;
  start_date?: string;
}

export interface UpdateTicketData extends Partial<CreateTicketData> {
  id: number;
}

export interface TicketListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Ticket[];
}

class TicketService {
  /**
   * Get all tickets
   */
  async getTickets(): Promise<TicketListResponse> {
    return apiService.get<TicketListResponse>(API_ENDPOINTS.TICKETS);
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
  async updateTicket(id: number, data: Partial<CreateTicketData>): Promise<Ticket> {
    return apiService.patch<Ticket>(API_ENDPOINTS.TICKET_DETAIL(id), data);
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(id: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.TICKET_DETAIL(id));
  }

  /**
   * Move ticket to a different column
   */
  async moveTicket(id: number, columnId: number): Promise<Ticket> {
    return apiService.post<Ticket>(API_ENDPOINTS.TICKET_MOVE(id), {
      column_id: columnId,
    });
  }

  /**
   * Toggle follow status for a ticket
   */
  async toggleFollow(id: number): Promise<{ following: boolean }> {
    return apiService.post<{ following: boolean }>(
      API_ENDPOINTS.TICKET_FOLLOW(id)
    );
  }
}

export const ticketService = new TicketService();
export default ticketService;
