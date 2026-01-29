/**
 * KPI (Key Performance Indicators) Types
 * Type definitions for KPI endpoints and User Reviews
 */

// ============================================================================
// User KPI Metrics
// ============================================================================

/**
 * Metrics for a single user's performance
 */
export interface UserMetrics {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;

  /** Total tickets created by user */
  tickets_created: number;

  /** Tickets moved to Done (by assignee) */
  tickets_resolved: number;

  /** Average time from created → done (hours) */
  avg_resolution_hours: number | null;

  /** Average customer satisfaction rating (1-5) */
  avg_customer_rating: number | null;

  /** Average time to first assignee response (hours) */
  avg_first_response_hours: number | null;

  /** % of resolved tickets completed before due date */
  sla_compliance_rate: number | null;

  /** % of resolved tickets that were reopened */
  reopen_rate: number | null;

  // Additional fields for my-metrics endpoint
  project_id?: number;
  project_name?: string;
  project_key?: string;
  role?: 'superadmin' | 'admin' | 'user' | 'manager';
}

// ============================================================================
// Project KPI Summary
// ============================================================================

export interface TicketsByCategory {
  todo: number;
  in_progress: number;
  done: number;
}

export interface TicketsByPriority {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface TopPerformer {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  tickets_resolved: number;
}

/**
 * Aggregate project KPI summary
 */
export interface ProjectKPISummary {
  project_id: number;
  project_name: string;
  project_key: string;

  total_tickets: number;
  tickets_by_category: TicketsByCategory;
  tickets_by_priority: TicketsByPriority;

  /** Average resolution time in hours */
  avg_resolution_hours: number | null;

  /** Tickets past due date */
  overdue_count: number;

  /** Tickets with no assignees */
  unassigned_count: number;

  /** Average customer satisfaction rating */
  avg_customer_rating: number | null;

  /** Top 5 performers by resolved tickets */
  top_performers: TopPerformer[];
}

// ============================================================================
// User Reviews (Admin reviews of users)
// ============================================================================

export interface UserReviewUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * Admin review of a user's work performance
 * Hidden from the reviewed user - only visible to superadmins/managers
 */
export interface UserReview {
  id: number;
  user: number;
  user_detail: UserReviewUser;
  reviewer: UserReviewUser;
  project: number;
  project_name: string;
  project_key: string;
  ticket: number | null;
  ticket_key: string | null;

  /** Rating 1-5 stars */
  rating: number;

  /** Private feedback notes */
  feedback: string;

  created_at: string;
  updated_at: string;
}

/**
 * Data for creating a new user review
 */
export interface CreateUserReviewData {
  user: number;
  project: number;
  ticket?: number | null;
  rating: number;
  feedback?: string;
}

/**
 * Data for updating an existing review
 */
export interface UpdateUserReviewData {
  rating?: number;
  feedback?: string;
}

/**
 * Summary of reviews for a user
 */
export interface UserReviewSummary {
  reviews: UserReview[];
  summary: {
    total_reviews: number;
    avg_rating: number | null;
  };
}

/**
 * Prompt to review a user after ticket resolution
 */
export interface ReviewPrompt {
  ticket_id: number;
  ticket_key: string;
  ticket_name: string;
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  resolved_at: string | null;
}

// ============================================================================
// KPI Query Parameters
// ============================================================================

export interface KPIQueryParams {
  project?: number;
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  user_id?: number;
}

// ============================================================================
// KPI Page State
// ============================================================================

export type KPIViewMode = 'personal' | 'team' | 'project';

export interface KPIPageFilters {
  projectId: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  viewMode: KPIViewMode;
}

// ============================================================================
// My Resolved Tickets (for personal KPI view)
// ============================================================================

export interface TicketPriority {
  id: number;
  name: string;
  color: string;
}

export interface TicketStatus {
  id: number;
  name: string;
  color: string;
  category?: string;
}

/**
 * A ticket resolved by the current user with timing details
 */
export interface MyResolvedTicket {
  ticket_id: number;
  key: string;
  name: string;
  priority: TicketPriority | null;
  status: TicketStatus | null;
  created_at: string | null;
  done_at: string | null;
  due_date: string | null;
  /** Time from created → done in hours */
  resolution_hours: number | null;
  /** Customer satisfaction rating (1-5) */
  customer_rating: number | null;
  /** accepted, rejected, pending */
  resolution_status: string | null;
  /** Whether ticket was done before due date */
  sla_met: boolean | null;
  /** Whether ticket was reopened after being marked done */
  was_reopened: boolean;
  /** Time from creation to first assignee comment in hours */
  first_response_hours: number | null;
}

export interface MyResolvedTicketsResponse {
  count: number;
  results: MyResolvedTicket[];
}

// ============================================================================
// My Active Tickets (for personal KPI view)
// ============================================================================

/**
 * An active ticket assigned to the current user
 */
export interface MyActiveTicket {
  ticket_id: number;
  key: string;
  name: string;
  priority: TicketPriority | null;
  status: TicketStatus | null;
  created_at: string | null;
  due_date: string | null;
  /** Number of days since ticket was created */
  days_open: number | null;
  /** Number of days until due (negative if overdue) */
  days_until_due: number | null;
  /** Whether ticket is past due date */
  is_overdue: boolean;
  /** Hours since last activity on ticket */
  stale_hours: number | null;
}

export interface MyActiveTicketsResponse {
  count: number;
  results: MyActiveTicket[];
}

// ============================================================================
// Project Trends (for charts)
// ============================================================================

export interface ProjectTrendPoint {
  date: string;
  created: number;
  resolved: number;
  avg_resolution_hours: number;
}

export type ProjectTrends = ProjectTrendPoint[];

// ============================================================================
// KPI Builder Types
// ============================================================================

export interface IndicatorConfigMeta {
  type: 'target' | 'sla' | 'min_rating' | 'min_percent' | 'max_count' | 'max_capacity' | 'max_percent';
  label: string;
  input_label: string;
  question: string;
  default_value: number;
  min: number;
  max?: number;
  step: number;
  presets?: number[];
}

export interface AvailableIndicator {
  key: string;
  name: string;
  description: string;
  formula: string;
  higher_is_better: boolean;
  unit: string;
  config: IndicatorConfigMeta;
}

export interface KPIIndicatorConfig {
  id?: number;
  metric_key: string;
  metric_name?: string;
  metric_description?: string;
  weight: number;
  is_active: boolean;
  order: number;
  threshold_green: number | null;
  threshold_red: number | null;
}

export interface KPIConfig {
  id: number;
  project: number;
  project_name: string;
  name: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  indicators: KPIIndicatorConfig[];
}

export interface KPIConfigSavePayload {
  name: string;
  project: number;
  indicators: {
    metric_key: string;
    weight: number;
    is_active: boolean;
    threshold_green: number | null;
    threshold_red: number | null;
  }[];
}

export interface IndicatorScore {
  metric_key: string;
  raw_value: number | null;
  normalized: number;
  weight: number;
  weighted_score: number;
}

export interface UserKPIScore {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  total_score: number;
  score_percentage: number;
  rank: number;
  indicators: IndicatorScore[];
}

export interface ScoreboardResponse {
  config_name: string;
  total_weight: number;
  team_size: number;
  active_indicators: {
    metric_key: string;
    name: string;
    weight: number;
    higher_is_better: boolean;
  }[];
  scores: UserKPIScore[];
}

// ============================================================================
// Personal Score (donut chart data)
// ============================================================================

export interface PersonalIndicatorScore {
  metric_key: string;
  name: string;
  description: string;
  formula: string;
  higher_is_better: boolean;
  unit: string;
  weight: number;
  raw_value: number | null;
  normalized: number;
  weighted_score: number;
  color: string;
}

export interface PersonalScoreResponse {
  total_score: number;
  total_weight: number;
  score_percentage: number;
  indicators: PersonalIndicatorScore[];
}
