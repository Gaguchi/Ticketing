export interface Project {
  id: number;
  key: string;
  name: string;
  description?: string;
  members?: User[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Column {
  id: number;
  name: string;
  order: number;
  project: number;
}

export interface Ticket {
  id: number;
  ticket_key: string;
  key?: string; // Deprecated, use ticket_key
  name: string;
  description?: string;
  type: string;
  priority_id: number;
  status: string;
  column: number;
  column_name?: string;
  column_order?: number;
  reporter?: User;
  assignees?: User[];
  assignee_ids?: number[];
  company: number | { id: number; name: string; } | null;
  company_name?: string;
  project: number | { id: number; name: string; } | null;
  project_key?: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  comments_count?: number;
  comment_count?: number; // Deprecated
  tag_names?: string[];
  is_archived?: boolean;
  is_final_column?: boolean;
  // Resolution fields
  resolution_rating?: number | null;
  resolution_feedback?: string;
  resolved_at?: string | null;
}

export interface Comment {
  id: number;
  ticket: number;
  author?: User;
  user?: User; // Backend returns 'user' instead of 'author'
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: number;
  ticket: number;
  file: string;
  filename: string;
  uploaded_by: User;
  uploaded_at: string;
}

export interface CreateTicketData {
  name: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}
