/**
 * Column Service
 * Handles all column-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  Column,
  CreateColumnData,
  UpdateColumnData,
  ReorderColumnsData,
  PaginatedResponse,
  PaginationParams,
} from '../types/api';

class ColumnService {
  /**
   * Get all columns with pagination
   */
  async getColumns(params?: PaginationParams): Promise<PaginatedResponse<Column>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.COLUMNS}?${queryParams.toString()}`
      : API_ENDPOINTS.COLUMNS;
    
    return apiService.get<PaginatedResponse<Column>>(url);
  }

  /**
   * Get all columns (unpaginated)
   */
  async getAllColumns(): Promise<Column[]> {
    const response = await this.getColumns({ page_size: 1000 });
    return response.results;
  }

  /**
   * Get a single column by ID
   */
  async getColumn(id: number): Promise<Column> {
    return apiService.get<Column>(API_ENDPOINTS.COLUMN_DETAIL(id));
  }

  /**
   * Create a new column
   */
  async createColumn(data: CreateColumnData): Promise<Column> {
    return apiService.post<Column>(API_ENDPOINTS.COLUMNS, data);
  }

  /**
   * Update a column
   */
  async updateColumn(id: number, data: UpdateColumnData): Promise<Column> {
    return apiService.patch<Column>(API_ENDPOINTS.COLUMN_DETAIL(id), data);
  }

  /**
   * Delete a column
   */
  async deleteColumn(id: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.COLUMN_DETAIL(id));
  }

  /**
   * Reorder columns
   */
  async reorderColumns(data: ReorderColumnsData): Promise<void> {
    return apiService.post(API_ENDPOINTS.COLUMN_REORDER, data);
  }
}

export const columnService = new ColumnService();
export default columnService;
