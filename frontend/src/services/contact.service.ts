/**
 * Contact Service
 * Handles all contact-related API calls
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  Contact,
  CreateContactData,
  UpdateContactData,
  PaginatedResponse,
  PaginationParams,
} from '../types/api';

class ContactService {
  /**
   * Get all contacts with pagination
   */
  async getContacts(params?: PaginationParams): Promise<PaginatedResponse<Contact>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.CONTACTS}?${queryParams.toString()}`
      : API_ENDPOINTS.CONTACTS;
    
    return apiService.get<PaginatedResponse<Contact>>(url);
  }

  /**
   * Get all contacts (unpaginated)
   */
  async getAllContacts(): Promise<Contact[]> {
    const response = await this.getContacts({ page_size: 1000 });
    return response.results;
  }

  /**
   * Get a single contact by ID
   */
  async getContact(id: number): Promise<Contact> {
    return apiService.get<Contact>(API_ENDPOINTS.CONTACT_DETAIL(id));
  }

  /**
   * Create a new contact
   */
  async createContact(data: CreateContactData): Promise<Contact> {
    return apiService.post<Contact>(API_ENDPOINTS.CONTACTS, data);
  }

  /**
   * Update a contact
   */
  async updateContact(id: number, data: UpdateContactData): Promise<Contact> {
    return apiService.patch<Contact>(API_ENDPOINTS.CONTACT_DETAIL(id), data);
  }

  /**
   * Delete a contact
   */
  async deleteContact(id: number): Promise<void> {
    return apiService.delete(API_ENDPOINTS.CONTACT_DETAIL(id));
  }
}

export const contactService = new ContactService();
export default contactService;
