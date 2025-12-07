/**
 * Status Service
 * Handles all Jira-style status and board column API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  Status,
  BoardColumn,
  CreateBoardColumnData,
  UpdateBoardColumnData,
  ReorderBoardColumnsData,
  MoveTicketToStatusRequest,
  Ticket,
} from '../types/api';

class StatusService {
  // ============================================================================
  // Global Statuses (read-only from frontend)
  // ============================================================================

  /**
   * Get all available statuses
   */
  async getStatuses(): Promise<Status[]> {
    return apiService.get<Status[]>(API_ENDPOINTS.STATUSES);
  }

  /**
   * Get a single status by key
   */
  async getStatus(key: string): Promise<Status> {
    return apiService.get<Status>(API_ENDPOINTS.STATUS_DETAIL(key));
  }

  // ============================================================================
  // Board Columns (per-project configuration)
  // ============================================================================

  /**
   * Get board columns for a project
   */
  async getBoardColumns(projectId: number): Promise<BoardColumn[]> {
    const url = `${API_ENDPOINTS.BOARD_COLUMNS}?project=${projectId}`;
    return apiService.get<BoardColumn[]>(url);
  }

  /**
   * Get a single board column by ID
   */
  async getBoardColumn(id: number): Promise<BoardColumn> {
    return apiService.get<BoardColumn>(API_ENDPOINTS.BOARD_COLUMN_DETAIL(id));
  }

  /**
   * Create a new board column
   */
  async createBoardColumn(data: CreateBoardColumnData): Promise<BoardColumn> {
    return apiService.post<BoardColumn>(API_ENDPOINTS.BOARD_COLUMNS, data);
  }

  /**
   * Update a board column
   */
  async updateBoardColumn(id: number, data: UpdateBoardColumnData): Promise<BoardColumn> {
    return apiService.patch<BoardColumn>(API_ENDPOINTS.BOARD_COLUMN_DETAIL(id), data);
  }

  /**
   * Delete a board column
   */
  async deleteBoardColumn(id: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.BOARD_COLUMN_DETAIL(id));
  }

  /**
   * Reorder board columns
   */
  async reorderBoardColumns(data: ReorderBoardColumnsData): Promise<{ status: string }> {
    return apiService.post<{ status: string }>(API_ENDPOINTS.BOARD_COLUMNS_REORDER, data);
  }

  // ============================================================================
  // Ticket Status Movement (Jira-style)
  // ============================================================================

  /**
   * Move a ticket to a new status with optional position
   * Uses LexoRank for efficient ordering
   */
  async moveTicketToStatus(
    ticketId: number,
    statusKey: string,
    options?: { beforeId?: number; afterId?: number }
  ): Promise<Ticket> {
    const payload: MoveTicketToStatusRequest = {
      status: statusKey,
      before_id: options?.beforeId,
      after_id: options?.afterId,
    };
    return apiService.post<Ticket>(
      API_ENDPOINTS.TICKET_MOVE_TO_STATUS(ticketId),
      payload
    );
  }
}

export const statusService = new StatusService();
export default statusService;
