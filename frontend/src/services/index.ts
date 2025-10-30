/**
 * Services Index
 * Exports all service modules
 */

// Core API Service
export { apiService } from './api.service';

// Authentication Service
export { authService } from './auth.service';

// Project Service
export { projectService } from './project.service';

// Ticket Service
export { ticketService } from './ticket.service';

// Column Service
export { columnService } from './column.service';

// Tag Service
export { tagService } from './tag.service';

// Contact Service
export { contactService } from './contact.service';

// Comment Service
export { commentService } from './comment.service';

// Attachment Service
export { attachmentService } from './attachment.service';

// Company Service
export { companyService } from './company.service';

// User Management Service
export { userService } from './user.service';

// Re-export all types from centralized types/api.ts
export type * from '../types/api';
