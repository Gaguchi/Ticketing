export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Ticket {
  id: number;
  key: string;
  name: string;
  description: string;
  type: string;
  priority_id: number;
  status: string;
  column: number;
  reporter: User;
  assignees: User[];
  company: {
    id: number;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  comment_count: number;
}

export interface Comment {
  id: number;
  ticket: number;
  author: User;
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
