export interface Ticket {
  id: number;
  name: string;
  description?: string;
  type: 'task' | 'bug' | 'story' | 'epic';
  status: string;
  priority_id: number;
  priorityId?: number; // Alias for backward compatibility
  urgency?: string;
  importance?: string;
  
  // Relationships
  project: number;
  project_key?: string;
  column: number;
  colId?: number; // Alias for backward compatibility
  assignees?: number[];
  assigneeIds?: number[]; // Alias for backward compatibility
  assignee_ids?: number[];
  reporter?: number;
  parent?: number;
  tags?: number[];
  tag_names?: string[];
  
  // Metadata
  following?: boolean;
  comments_count?: number;
  commentsCount?: number; // Alias for backward compatibility
  due_date?: string;
  dueDate?: string; // Alias for backward compatibility
  start_date?: string;
  startDate?: string; // Alias for backward compatibility
  created_at: string;
  createdAt?: string; // Alias for backward compatibility
  updated_at: string;
}

export interface TicketColumn {
  id: number;
  name: string;
  project: number;
  order: number;
}

export interface Project {
  id: number;
  key: string;
  name: string;
  description?: string;
  lead_username?: string;
  tickets_count?: number;
  columns_count?: number;
  created_at: string;
  updated_at: string;
}

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

export interface KanbanItems {
  [key: string]: string[];
}
