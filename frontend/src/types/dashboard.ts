/**
 * Dashboard Types
 * TypeScript interfaces for dashboard data structures
 */

// Company health data for dashboard cards
export interface CompanyHealth {
  id: number;
  name: string;
  logo_url: string | null;
  logo_thumbnail_url: string | null;
  total_tickets: number;
  tickets_by_status: Record<string, number>;
  tickets_by_priority: Record<string, number>;
  overdue_count: number;
  unassigned_count: number;
}

// Compact user reference
export interface DashboardUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

// Compact company reference
export interface DashboardCompany {
  id: number;
  name: string;
  logo_url?: string | null;
}

// Ticket data for dashboard panels
export interface DashboardTicket {
  id: number;
  title: string;
  key: string;
  status: string | null;
  priority: string | null;
  type?: string | null;
  assignee: DashboardUser | null;
  reporter?: DashboardUser | null;
  company: DashboardCompany | null;
  due_date?: string | null;
  updated_at?: string;
  created_at: string;
}

// Attention needed response
export interface AttentionNeeded {
  overdue: DashboardTicket[];
  unassigned_critical: DashboardTicket[];
  stale: DashboardTicket[];
}

// Activity feed entry
export interface ActivityEntry {
  id: number;
  ticket: {
    id: number;
    key: string;
    title: string;
    company: DashboardCompany | null;
  };
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: DashboardUser | null;
  changed_at: string;
}

// Agent workload
export interface AgentWorkload {
  user: DashboardUser;
  total_active: number;
  by_status: Record<string, number>;
  overdue: number;
}

// Kanban column summary
export interface KanbanColumnSummary {
  id: number;
  name: string;
  color: string;
  position: number;
  ticket_count: number;
}

// Kanban summary response
export interface KanbanSummary {
  project: {
    id: number;
    name: string;
    key: string;
  };
  columns: KanbanColumnSummary[];
  total_tickets: number;
}
