/**
 * API Response Types
 * Comprehensive type definitions matching the actual API structure
 */

// ============================================================================
// Pagination
// ============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// ============================================================================
// User & Authentication
// ============================================================================

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser?: boolean;
  projects?: Project[];
  project_memberships?: number[]; // Array of project IDs where user is a member
  has_projects?: boolean;
  companies?: Company[];
  administered_companies?: Company[];
  member_companies?: Company[];
  has_companies?: boolean;
  is_it_admin?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  project_key?: string;
  project_name?: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface RefreshTokenResponse {
  access: string;
}

// ============================================================================
// Company
// ============================================================================

export interface Company {
  id: number;
  name: string;
  description?: string;
  ticket_count?: number;
  admin_count?: number;
  user_count?: number;
  admin_names?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyData {
  name: string;
  description?: string;
}

export interface AssignUserToCompanyData {
  user_id: number;
  role?: 'admin' | 'user';
}

// ============================================================================
// Project
// ============================================================================

export interface Project {
  id: number;
  key: string;
  name: string;
  description?: string;
  lead_username?: string;
  members: ProjectMember[];
  companies: Company[];
  tickets_count: number;
  columns_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  administered_companies?: Company[];
  member_companies?: Company[];
  has_companies?: boolean;
  is_it_admin?: boolean;
}

export interface CreateProjectData {
  key: string;
  name: string;
  description?: string;
  lead_username?: string;
}

export interface UpdateProjectData {
  key?: string;
  name?: string;
  description?: string;
  lead_username?: string;
  member_usernames?: string[];
}

// ============================================================================
// Column
// ============================================================================

export interface Column {
  id: number;
  name: string;
  project: number;
  project_key: string;
  order: number;
  color: string;
  tickets_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateColumnData {
  name: string;
  project?: number;
  order?: number;
  color?: string;
}

export interface UpdateColumnData {
  name?: string;
  order?: number;
  color?: string;
}

export interface ReorderColumnsData {
  order: Array<{
    id: number;
    order: number;
  }>;
}

// ============================================================================
// Ticket
// ============================================================================

export type TicketType = 'task' | 'bug' | 'story' | 'epic';
export type TicketStatus = 'new' | 'in_progress' | 'resolved' | 'closed' | 'blocked';
export type TicketUrgency = 'low' | 'medium' | 'high' | 'critical';
export type TicketImportance = 'low' | 'medium' | 'high' | 'critical';

export interface Ticket {
  id: number;
  name: string;
  description?: string;
  type: TicketType;
  status: TicketStatus;
  priority_id: number;
  urgency: TicketUrgency;
  importance: TicketImportance;
  
  // Relationships
  company: number | null;
  project: number;
  project_key: string;
  project_number: number;
  ticket_key: string;
  column: number;
  column_name: string;
  column_order: number; // Position within column (legacy field, kept for backward compatibility)
  assignees: User[];
  reporter: User;
  parent: number | null;
  subtasks: Ticket[];
  tags: number[];
  tags_detail: Tag[];
  
  // Metadata
  following: boolean;
  due_date: string | null;
  start_date: string | null;
  comments_count: number;
  is_archived: boolean;
  archived_at: string | null;
  archived_by?: User | null;
  archived_reason?: string | null;
  done_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketHistoryItem {
  id: number;
  ticket: number;
  user: User;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  type: 'history';
}

export interface TicketCommentItem {
  id: number;
  ticket: number;
  user: User;
  content: string;
  created_at: string;
  updated_at?: string;
  type: 'comment';
}

export type TicketActivityItem = TicketHistoryItem | TicketCommentItem;

export interface CreateTicketData {
  name: string;
  description?: string;
  type: TicketType;
  priority_id: number;
  urgency: TicketUrgency;
  importance: TicketImportance;
  column: number;
  project: number;
  company?: number;
  assignee_ids?: number[];
  parent?: number;
  tags?: number[];
  tag_names?: string[];
  due_date?: string | null;
  start_date?: string | null;
}

export interface UpdateTicketData {
  name?: string;
  description?: string;
  type?: TicketType;
  status?: TicketStatus;
  priority_id?: number;
  urgency?: TicketUrgency;
  importance?: TicketImportance;
  column?: number;
  order?: number; // Position within column (for reordering)
  company?: number;
  assignee_ids?: number[];
  parent?: number;
  tags?: number[];
  tag_names?: string[];
  due_date?: string | null;
  start_date?: string | null;
}

export interface TicketFilterParams extends PaginationParams {
  search?: string;
  status?: TicketStatus;
  type?: TicketType;
  priority_id?: number;
  column?: number;
  company?: number;
  project?: number;
  assignee?: number;
  reporter?: number;
  tag?: number;
  ordering?: string;
  archived?: boolean | 'all';
  include_archived?: boolean;
}

export interface ToggleFollowResponse {
  following: boolean;
}

// ============================================================================
// Tag
// ============================================================================

export interface Tag {
  id: number;
  name: string;
  description?: string;
  color: string;
  project: number;
  project_name?: string;
  tickets_count?: number;
  contacts_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTagData {
  name: string;
  description?: string;
  color?: string;
  project: number;
}

export interface UpdateTagData {
  name?: string;
  description?: string;
  color?: string;
}

export interface AddContactToTagData {
  contact_id: number;
  role?: string;
}

// ============================================================================
// Contact
// ============================================================================

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  department?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactData {
  name: string;
  email: string;
  phone?: string;
  title?: string;
  department?: string;
  description?: string;
}

export interface UpdateContactData {
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  description?: string;
}

// ============================================================================
// Comment
// ============================================================================

export interface Comment {
  id: number;
  ticket: number;
  author: User;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentData {
  ticket: number;
  content: string;
}

export interface UpdateCommentData {
  content: string;
}

// ============================================================================
// Attachment
// ============================================================================

export interface Attachment {
  id: number;
  ticket: number;
  file: string;
  filename: string;
  uploaded_by: User;
  created_at: string;
}

export interface UploadAttachmentData {
  ticket: number;
  file: File;
  filename?: string;
}

// ============================================================================
// Error Responses
// ============================================================================

export interface APIError {
  message: string;
  status?: number;
  details?: Record<string, string[]> | string;
}

export interface ValidationError {
  [field: string]: string[];
}

// ============================================================================
// Common Response Types
// ============================================================================

export interface MessageResponse {
  message: string;
  detail?: string;
}

export interface ErrorResponse {
  error?: string;
  detail?: string;
  message?: string;
  [key: string]: any; // For field-specific errors
}

export interface DeleteResponse {
  message?: string;
}

export interface BulkOperationResponse {
  success: number;
  failed: number;
  errors?: Array<{
    id: number;
    error: string;
  }>;
}

// ============================================================================
// UI/Component Types
// ============================================================================

export interface TicketColumn {
  id: number;
  name: string;
  project: number;
  order: number;
}

export interface KanbanItems {
  [key: string]: string[];
}
