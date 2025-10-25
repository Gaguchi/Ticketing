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
  column: number;
  colId?: number; // Alias for backward compatibility
  customer?: number;
  customer_name?: string;
  assignees?: number[];
  assigneeIds?: number[]; // Alias for backward compatibility
  assignee_ids?: number[];
  reporter?: number;
  parent?: number;
  tags?: number[];
  
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
  order: number;
}

export interface KanbanItems {
  [key: string]: string[];
}
