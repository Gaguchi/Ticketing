/**
 * Column Service
 * Handles all column-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';

export interface Column {
  id: number;
  name: string;
  order: number;
  color?: string;
  tickets_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateColumnData {
  name: string;
  order?: number;
  color?: string;
}

export interface ReorderColumnsData {
  column_orders: { id: number; order: number }[];
}

class ColumnService {
  /**
   * Get all columns
   */
  async getColumns(): Promise<Column[]> {
    return apiService.get<Column[]>(API_ENDPOINTS.COLUMNS);
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
  async updateColumn(id: number, data: Partial<CreateColumnData>): Promise<Column> {
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
