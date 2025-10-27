/**
 * Services Index
 * Exports all service modules
 */

export { apiService } from './api.service';
export type { APIError } from './api.service';

export { authService } from './auth.service';
export type { LoginCredentials, RegisterData, AuthResponse, User } from './auth.service';

export { projectService } from './project.service';
export type { Project, CreateProjectData } from './project.service';

export { ticketService } from './ticket.service';
export type { CreateTicketData, UpdateTicketData, TicketListResponse } from './ticket.service';

export { columnService } from './column.service';
export type { Column, CreateColumnData, ReorderColumnsData } from './column.service';

export { tagService } from './tag.service';
export type { Tag, CreateTagData } from './tag.service';
