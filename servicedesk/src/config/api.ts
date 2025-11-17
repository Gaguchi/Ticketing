export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Authentication
  AUTH_LOGIN: `${API_BASE_URL}/api/tickets/auth/login/`,
  AUTH_ME: `${API_BASE_URL}/api/tickets/auth/me/`,
  AUTH_CHANGE_PASSWORD: `${API_BASE_URL}/api/tickets/auth/change-password/`,
  
  // Tickets
  MY_TICKETS: `${API_BASE_URL}/api/tickets/tickets/`,
  TICKET_DETAIL: (id: number) => `${API_BASE_URL}/api/tickets/tickets/${id}/`,
  
  // Comments
  TICKET_COMMENTS: (ticketId: number) => `${API_BASE_URL}/api/tickets/tickets/${ticketId}/comments/`,
  
  // Attachments
  ATTACHMENTS: `${API_BASE_URL}/api/tickets/attachments/`,
};

export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const API_CONFIG = {
  timeout: 30000,
  withCredentials: true,
};
