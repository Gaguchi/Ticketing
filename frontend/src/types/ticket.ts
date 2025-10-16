export interface Ticket {
  id: number;
  colId: number;
  name: string;
  priorityId: number;
  following?: boolean;
  commentsCount?: number;
  assigneeIds: number[];
  customer?: string;
  status?: string;
  createdAt?: string;
  urgency?: string;
  importance?: string;
}

export interface TicketColumn {
  id: number;
  name: string;
  order: number;
}

export interface KanbanItems {
  [key: string]: string[];
}
