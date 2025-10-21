/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

// Get base URL from environment variable or use default
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// API endpoints
export const API_ENDPOINTS = {
  // Tickets
  TICKETS: `${API_BASE_URL}/api/tickets/tickets/`,
  TICKET_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/tickets/${id}/`,
  TICKET_MOVE: (id: number) => `${API_BASE_URL}/api/tickets/tickets/${id}/move_to_column/`,
  TICKET_FOLLOW: (id: number) => `${API_BASE_URL}/api/tickets/tickets/${id}/toggle_follow/`,
  
  // Columns
  COLUMNS: `${API_BASE_URL}/api/tickets/columns/`,
  COLUMN_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/columns/${id}/`,
  COLUMN_REORDER: `${API_BASE_URL}/api/tickets/columns/reorder/`,
  
  // Customers
  CUSTOMERS: `${API_BASE_URL}/api/tickets/customers/`,
  CUSTOMER_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/customers/${id}/`,
  
  // Comments
  COMMENTS: `${API_BASE_URL}/api/tickets/comments/`,
  COMMENT_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/comments/${id}/`,
  
  // Attachments
  ATTACHMENTS: `${API_BASE_URL}/api/tickets/attachments/`,
  ATTACHMENT_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/attachments/${id}/`,
  
  // Tags
  TAGS: `${API_BASE_URL}/api/tickets/tags/`,
  TAG_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/tags/${id}/`,
  TAG_CONTACTS: (id: number) => `${API_BASE_URL}/api/tickets/tags/${id}/contacts/`,
  TAG_ADD_CONTACT: (id: number) => `${API_BASE_URL}/api/tickets/tags/${id}/add_contact/`,
  TAG_REMOVE_CONTACT: (id: number) => `${API_BASE_URL}/api/tickets/tags/${id}/remove_contact/`,
  TAG_TICKETS: (id: number) => `${API_BASE_URL}/api/tickets/tags/${id}/tickets/`,
  
  // Contacts
  CONTACTS: `${API_BASE_URL}/api/tickets/contacts/`,
  CONTACT_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/contacts/${id}/`,
  CONTACT_TAGS: (id: number) => `${API_BASE_URL}/api/tickets/contacts/${id}/tags/`,
  
  // Ticket Tags
  TICKET_TAGS: `${API_BASE_URL}/api/tickets/ticket-tags/`,
  TICKET_TAG_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/ticket-tags/${id}/`,
  
  // User Tags (Team Membership)
  USER_TAGS: `${API_BASE_URL}/api/tickets/user-tags/`,
  USER_TAG_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/user-tags/${id}/`,
  
  // Tag Contacts
  TAG_CONTACTS_LIST: `${API_BASE_URL}/api/tickets/tag-contacts/`,
  TAG_CONTACT_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/tag-contacts/${id}/`,
  
  // API Documentation
  API_DOCS: `${API_BASE_URL}/api/docs/`,
  API_SCHEMA: `${API_BASE_URL}/api/schema/`,
};

// HTTP Headers
export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Request configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  withCredentials: true, // Include cookies in requests
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  API_HEADERS,
  API_CONFIG,
};
