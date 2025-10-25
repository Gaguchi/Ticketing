/**
 * Customer Service
 * Handles all customer-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

class CustomerService {
  /**
   * Get all customers
   */
  async getCustomers(): Promise<Customer[]> {
    return apiService.get<Customer[]>(API_ENDPOINTS.CUSTOMERS);
  }

  /**
   * Get a single customer by ID
   */
  async getCustomer(id: number): Promise<Customer> {
    return apiService.get<Customer>(API_ENDPOINTS.CUSTOMER_DETAIL(id));
  }

  /**
   * Create a new customer
   */
  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    return apiService.post<Customer>(API_ENDPOINTS.CUSTOMERS, data);
  }

  /**
   * Update a customer
   */
  async updateCustomer(id: number, data: Partial<CreateCustomerData>): Promise<Customer> {
    return apiService.patch<Customer>(API_ENDPOINTS.CUSTOMER_DETAIL(id), data);
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(id: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.CUSTOMER_DETAIL(id));
  }
}

export const customerService = new CustomerService();
export default customerService;
