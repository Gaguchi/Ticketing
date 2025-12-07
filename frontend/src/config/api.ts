/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

// Get base URL from environment variable or use default
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH_LOGIN: `${API_BASE_URL}/api/tickets/auth/login/`,
  AUTH_REGISTER: `${API_BASE_URL}/api/tickets/auth/register/`,
  AUTH_ME: `${API_BASE_URL}/api/tickets/auth/me/`,
  AUTH_TOKEN_REFRESH: `${API_BASE_URL}/api/tickets/auth/token/refresh/`,
  
  // Projects
  PROJECTS: `${API_BASE_URL}/api/tickets/projects/`,
  PROJECT_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/projects/${id}/`,
  PROJECT_TICKETS: (id: number) => `${API_BASE_URL}/api/tickets/projects/${id}/tickets/`,
  PROJECT_COLUMNS: (id: number) => `${API_BASE_URL}/api/tickets/projects/${id}/columns/`,
  
  // Tickets
  TICKETS: `${API_BASE_URL}/api/tickets/tickets/`,
  TICKETS_ARCHIVED: `${API_BASE_URL}/api/tickets/tickets/archived/`,
  TICKET_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/tickets/${id}/`,
  TICKET_HISTORY: (id: number) => `${API_BASE_URL}/api/tickets/tickets/${id}/history/`,
  TICKET_FOLLOW: (id: number) => `${API_BASE_URL}/api/tickets/tickets/${id}/toggle_follow/`,
  TICKET_ARCHIVE: (id: number) => `${API_BASE_URL}/api/tickets/tickets/${id}/archive/`,
  TICKET_RESTORE: (id: number) => `${API_BASE_URL}/api/tickets/tickets/${id}/restore/`,
  TICKET_TRIGGER_ARCHIVE: `${API_BASE_URL}/api/tickets/tickets/trigger-archive/`,
  TICKET_REORDER: `${API_BASE_URL}/api/tickets/tickets/reorder_tickets/`,
  
  // Columns
  COLUMNS: `${API_BASE_URL}/api/tickets/columns/`,
  COLUMN_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/columns/${id}/`,
  COLUMN_REORDER: `${API_BASE_URL}/api/tickets/columns/reorder/`,
  
  // Comments
  TICKET_COMMENTS: (ticketId: number) => `${API_BASE_URL}/api/tickets/tickets/${ticketId}/comments/`,
  TICKET_COMMENT_DETAIL: (ticketId: number, commentId: number) => `${API_BASE_URL}/api/tickets/tickets/${ticketId}/comments/${commentId}/`,
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
  
  // Companies
  COMPANIES: `${API_BASE_URL}/api/tickets/companies/`,
  COMPANY_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/companies/${id}/`,
  COMPANY_STATS: (id: number) => `${API_BASE_URL}/api/tickets/companies/${id}/stats/`,
  COMPANY_ASSIGN_ADMIN: (id: number) => `${API_BASE_URL}/api/tickets/companies/${id}/assign_admin/`,
  COMPANY_REMOVE_ADMIN: (id: number) => `${API_BASE_URL}/api/tickets/companies/${id}/remove_admin/`,
  COMPANY_ASSIGN_USER: (id: number) => `${API_BASE_URL}/api/tickets/companies/${id}/assign_user/`,
  COMPANY_REMOVE_USER: (id: number) => `${API_BASE_URL}/api/tickets/companies/${id}/remove_user/`,
  COMPANY_CREATE_USER: (id: number) => `${API_BASE_URL}/api/tickets/companies/${id}/create_user/`,
  COMPANY_TICKETS: (id: number) => `${API_BASE_URL}/api/tickets/companies/${id}/tickets/`,
  
  // User Management
  USERS: `${API_BASE_URL}/api/tickets/users/`,
  USER_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/users/${id}/`,
  USER_ASSIGN_ROLE: (id: number) => `${API_BASE_URL}/api/tickets/users/${id}/assign_role/`,
  USER_REMOVE_ROLE: (id: number) => `${API_BASE_URL}/api/tickets/users/${id}/remove_role/`,
  USER_SET_PASSWORD: (id: number) => `${API_BASE_URL}/api/tickets/users/${id}/set_password/`,
  USER_TOGGLE_ACTIVE: (id: number) => `${API_BASE_URL}/api/tickets/users/${id}/toggle_active/`,
  USER_ROLES: (id: number) => `${API_BASE_URL}/api/tickets/users/${id}/roles/`,
  
  // Dashboard
  DASHBOARD_COMPANY_HEALTH: `${API_BASE_URL}/api/tickets/dashboard/company-health/`,
  DASHBOARD_ATTENTION_NEEDED: `${API_BASE_URL}/api/tickets/dashboard/attention-needed/`,
  DASHBOARD_NEWEST: `${API_BASE_URL}/api/tickets/dashboard/newest/`,
  DASHBOARD_ACTIVITY: `${API_BASE_URL}/api/tickets/dashboard/activity/`,
  DASHBOARD_WORKLOAD: `${API_BASE_URL}/api/tickets/dashboard/workload/`,
  DASHBOARD_KANBAN_SUMMARY: `${API_BASE_URL}/api/tickets/dashboard/kanban-summary/`,
  
  // Jira-style Status System
  STATUSES: `${API_BASE_URL}/api/tickets/statuses/`,
  STATUS_DETAIL: (key: string) => `${API_BASE_URL}/api/tickets/statuses/${key}/`,
  
  // Board Columns (per-project visual groupings)
  BOARD_COLUMNS: `${API_BASE_URL}/api/tickets/board-columns/`,
  BOARD_COLUMN_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/board-columns/${id}/`,
  BOARD_COLUMNS_REORDER: `${API_BASE_URL}/api/tickets/board-columns/reorder/`,
  
  // Ticket status-based move (new Jira-style)
  TICKET_MOVE_TO_STATUS: (id: number) => `${API_BASE_URL}/api/tickets/tickets/${id}/move_to_status/`,
  
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
