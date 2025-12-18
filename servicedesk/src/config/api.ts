export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// In development (no VITE_API_BASE_URL), use /api prefix for Vite proxy
// In production (with VITE_API_BASE_URL), use the backend base URL + /api/tickets
const getEndpoint = (path: string) => {
  if (API_BASE_URL) {
    // Production: backend base URL + /api/tickets + endpoint path
    return `${API_BASE_URL}/api/tickets${path}`;
  } else {
    // Development: use /api prefix for Vite proxy
    return `/api/tickets${path}`;
  }
};

export const API_ENDPOINTS = {
  // Authentication
  AUTH_LOGIN: getEndpoint('/auth/login/'),
  AUTH_ME: getEndpoint('/auth/me/'),
  AUTH_CHANGE_PASSWORD: getEndpoint('/auth/change-password/'),

  // Tickets
  MY_TICKETS: getEndpoint('/tickets/'),
  ARCHIVED_TICKETS: getEndpoint('/tickets/archived/'),
  COLUMNS: getEndpoint('/columns/'),
  TICKET_DETAIL: (id: number) => getEndpoint(`/tickets/${id}/`),
  TICKET_HISTORY: (id: number) => getEndpoint(`/tickets/${id}/history/`),
  TICKET_REVIEW: (id: number) => getEndpoint(`/tickets/${id}/review/`),
  TICKET_REJECT_RESOLUTION: (id: number) => getEndpoint(`/tickets/${id}/reject_resolution/`),
  TICKET_FOLLOW: (id: number) => getEndpoint(`/tickets/${id}/toggle_follow/`),

  // Comments
  TICKET_COMMENTS: (ticketId: number) => getEndpoint(`/tickets/${ticketId}/comments/`),

  // Attachments
  ATTACHMENTS: getEndpoint('/attachments/'),
};

export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const API_CONFIG = {
  timeout: 30000,
  withCredentials: true,
};
