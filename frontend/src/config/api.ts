/**
 * API Configuration
 * Centralized configuration for API endpoints
 * 
 * In development: Uses empty string so requests go through Vite proxy
 * In production: Set VITE_API_BASE_URL to your production API URL
 */

// Get base URL from environment variable (empty string for dev = Vite proxy)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper to build API endpoint paths
const api = (path: string) => `${API_BASE_URL}/api/tickets${path}`;

// API endpoints - all use relative paths for Vite proxy in development
export const API_ENDPOINTS = {
  // Authentication
  AUTH_LOGIN: api('/auth/login/'),
  AUTH_REGISTER: api('/auth/register/'),
  AUTH_ME: api('/auth/me/'),
  AUTH_TOKEN_REFRESH: api('/auth/token/refresh/'),

  // Projects
  PROJECTS: api('/projects/'),
  PROJECT_TICKETS: (id: number) => api(`/projects/${id}/tickets/`),
  PROJECT_COLUMNS: (id: number) => api(`/projects/${id}/columns/`),
  PROJECT_ADMINS: (id: number) => api(`/projects/${id}/admins/`),

  // Tickets
  TICKETS: api('/tickets/'),
  TICKETS_ARCHIVED: api('/tickets/archived/'),
  TICKET_DETAIL: (id: number) => api(`/tickets/${id}/`),
  TICKET_HISTORY: (id: number) => api(`/tickets/${id}/history/`),
  TICKET_FOLLOW: (id: number) => api(`/tickets/${id}/toggle_follow/`),
  TICKET_ARCHIVE: (id: number) => api(`/tickets/${id}/archive/`),
  TICKET_RESTORE: (id: number) => api(`/tickets/${id}/restore/`),
  TICKET_TRIGGER_ARCHIVE: api('/tickets/trigger-archive/'),
  TICKET_REORDER: api('/tickets/reorder_tickets/'),

  // Columns
  COLUMNS: api('/columns/'),
  COLUMN_DETAIL: (id: number) => api(`/columns/${id}/`),
  COLUMN_REORDER: api('/columns/reorder/'),

  // Comments
  TICKET_COMMENTS: (ticketId: number) => api(`/tickets/${ticketId}/comments/`),
  TICKET_COMMENT_DETAIL: (ticketId: number, commentId: number) => api(`/tickets/${ticketId}/comments/${commentId}/`),
  COMMENTS: api('/comments/'),
  COMMENT_DETAIL: (id: number) => api(`/comments/${id}/`),

  // Attachments
  ATTACHMENTS: api('/attachments/'),
  ATTACHMENT_DETAIL: (id: number) => api(`/attachments/${id}/`),

  // Tags
  TAGS: api('/tags/'),
  TAG_DETAIL: (id: number) => api(`/tags/${id}/`),
  TAG_CONTACTS: (id: number) => api(`/tags/${id}/contacts/`),
  TAG_ADD_CONTACT: (id: number) => api(`/tags/${id}/add_contact/`),
  TAG_REMOVE_CONTACT: (id: number) => api(`/tags/${id}/remove_contact/`),
  TAG_TICKETS: (id: number) => api(`/tags/${id}/tickets/`),

  // Contacts
  CONTACTS: api('/contacts/'),
  CONTACT_DETAIL: (id: number) => api(`/contacts/${id}/`),
  CONTACT_TAGS: (id: number) => api(`/contacts/${id}/tags/`),

  // Ticket Tags
  TICKET_TAGS: api('/ticket-tags/'),
  TICKET_TAG_DETAIL: (id: number) => api(`/ticket-tags/${id}/`),

  // User Tags (Team Membership)
  USER_TAGS: api('/user-tags/'),
  USER_TAG_DETAIL: (id: number) => api(`/user-tags/${id}/`),

  // Tag Contacts
  TAG_CONTACTS_LIST: api('/tag-contacts/'),
  TAG_CONTACT_DETAIL: (id: number) => api(`/tag-contacts/${id}/`),

  // Companies
  COMPANIES: api('/companies/'),
  COMPANY_DETAIL: (id: number) => api(`/companies/${id}/`),
  COMPANY_STATS: (id: number) => api(`/companies/${id}/stats/`),
  COMPANY_ADMINS: (id: number) => api(`/companies/${id}/admins/`),
  COMPANY_ASSIGN_ADMIN: (id: number) => api(`/companies/${id}/assign_admin/`),
  COMPANY_REMOVE_ADMIN: (id: number) => api(`/companies/${id}/remove_admin/`),
  COMPANY_ASSIGN_USER: (id: number) => api(`/companies/${id}/assign_user/`),
  COMPANY_REMOVE_USER: (id: number) => api(`/companies/${id}/remove_user/`),
  COMPANY_CREATE_USER: (id: number) => api(`/companies/${id}/create_user/`),
  COMPANY_TICKETS: (id: number) => api(`/companies/${id}/tickets/`),

  // User Management
  USERS: api('/users/'),
  USER_DETAIL: (id: number) => api(`/users/${id}/`),
  USER_ASSIGN_ROLE: (id: number) => api(`/users/${id}/assign_role/`),
  USER_REMOVE_ROLE: (id: number) => api(`/users/${id}/remove_role/`),
  USER_SET_PASSWORD: (id: number) => api(`/users/${id}/set_password/`),
  USER_TOGGLE_ACTIVE: (id: number) => api(`/users/${id}/toggle_active/`),
  USER_ROLES: (id: number) => api(`/users/${id}/roles/`),

  // Dashboard
  DASHBOARD_COMPANY_HEALTH: api('/dashboard/company-health/'),
  DASHBOARD_ATTENTION_NEEDED: api('/dashboard/attention-needed/'),
  DASHBOARD_NEWEST: api('/dashboard/newest/'),
  DASHBOARD_ACTIVITY: api('/dashboard/activity/'),
  DASHBOARD_WORKLOAD: api('/dashboard/workload/'),
  DASHBOARD_KANBAN_SUMMARY: api('/dashboard/kanban-summary/'),

  // Jira-style Status System
  STATUSES: api('/statuses/'),
  STATUS_DETAIL: (key: string) => api(`/statuses/${key}/`),

  // Board Columns (per-project visual groupings)
  BOARD_COLUMNS: api('/board-columns/'),
  BOARD_COLUMN_DETAIL: (id: number) => api(`/board-columns/${id}/`),
  BOARD_COLUMNS_REORDER: api('/board-columns/reorder/'),

  // Ticket status-based move (new Jira-style)
  TICKET_MOVE_TO_STATUS: (id: number) => api(`/tickets/${id}/move_to_status/`),

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
