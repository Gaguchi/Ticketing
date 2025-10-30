/**
 * Company Service
 * Handles company-related API calls including user assignments
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  Company,
  CreateCompanyData,
  AssignUserToCompanyData,
  PaginatedResponse,
  PaginationParams,
  Ticket,
} from '../types/api';

class CompanyService {
  /**
   * Get all companies with pagination
   */
  async getCompanies(params?: PaginationParams): Promise<PaginatedResponse<Company>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.COMPANIES}?${queryParams.toString()}`
      : API_ENDPOINTS.COMPANIES;
    
    return apiService.get<PaginatedResponse<Company>>(url);
  }

  /**
   * Get all companies (unpaginated)
   */
  async getAllCompanies(): Promise<Company[]> {
    const response = await this.getCompanies({ page_size: 1000 });
    return response.results;
  }

  /**
   * Get a single company by ID
   */
  async getCompany(id: number): Promise<Company> {
    return apiService.get<Company>(API_ENDPOINTS.COMPANY_DETAIL(id));
  }

  /**
   * Create a new company
   */
  async createCompany(data: CreateCompanyData): Promise<Company> {
    return apiService.post<Company>(API_ENDPOINTS.COMPANIES, data);
  }

  /**
   * Update a company
   */
  async updateCompany(id: number, data: Partial<CreateCompanyData>): Promise<Company> {
    return apiService.patch<Company>(API_ENDPOINTS.COMPANY_DETAIL(id), data);
  }

  /**
   * Delete a company
   */
  async deleteCompany(id: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.COMPANY_DETAIL(id));
  }

  /**
   * Assign admin to company
   */
  async assignAdmin(id: number, data: AssignUserToCompanyData): Promise<Company> {
    return apiService.post<Company>(API_ENDPOINTS.COMPANY_ASSIGN_ADMIN(id), data);
  }

  /**
   * Remove admin from company
   */
  async removeAdmin(id: number, userId: number): Promise<Company> {
    return apiService.post<Company>(API_ENDPOINTS.COMPANY_REMOVE_ADMIN(id), { user_id: userId });
  }

  /**
   * Assign user to company
   */
  async assignUser(id: number, data: AssignUserToCompanyData): Promise<Company> {
    return apiService.post<Company>(API_ENDPOINTS.COMPANY_ASSIGN_USER(id), data);
  }

  /**
   * Remove user from company
   */
  async removeUser(id: number, userId: number): Promise<Company> {
    return apiService.post<Company>(API_ENDPOINTS.COMPANY_REMOVE_USER(id), { user_id: userId });
  }

  /**
   * Get all tickets for a company
   */
  async getCompanyTickets(id: number): Promise<PaginatedResponse<Ticket>> {
    return apiService.get<PaginatedResponse<Ticket>>(API_ENDPOINTS.COMPANY_TICKETS(id));
  }
}

export const companyService = new CompanyService();
export default companyService;
