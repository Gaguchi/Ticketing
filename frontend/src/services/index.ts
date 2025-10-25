/**
 * Services Index
 * Exports all service modules
 */

export { apiService } from './api.service';
export type { APIError } from './api.service';

export { ticketService } from './ticket.service';
export type { CreateTicketData, UpdateTicketData, TicketListResponse } from './ticket.service';

export { columnService } from './column.service';
export type { Column, CreateColumnData, ReorderColumnsData } from './column.service';

export { customerService } from './customer.service';
export type { Customer, CreateCustomerData } from './customer.service';
