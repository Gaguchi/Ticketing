/**
 * Dashboard Service
 * API calls for dashboard data
 */

import apiService from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type {
  CompanyHealth,
  AttentionNeeded,
  DashboardTicket,
  ActivityEntry,
  AgentWorkload,
  KanbanSummary,
} from '../types/dashboard';

interface DashboardQueryParams {
  project?: number;
  company?: number;
  limit?: number;
}

/**
 * Fetch company health data for dashboard cards
 */
export async function fetchCompanyHealth(params?: DashboardQueryParams): Promise<CompanyHealth[]> {
  const queryParams = new URLSearchParams();
  if (params?.project) queryParams.set('project', params.project.toString());
  
  const url = `${API_ENDPOINTS.DASHBOARD_COMPANY_HEALTH}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return apiService.get<CompanyHealth[]>(url);
}

/**
 * Fetch tickets that need attention (overdue, unassigned critical, stale)
 */
export async function fetchAttentionNeeded(params?: DashboardQueryParams): Promise<AttentionNeeded> {
  const queryParams = new URLSearchParams();
  if (params?.project) queryParams.set('project', params.project.toString());
  if (params?.company) queryParams.set('company', params.company.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  
  const url = `${API_ENDPOINTS.DASHBOARD_ATTENTION_NEEDED}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return apiService.get<AttentionNeeded>(url);
}

/**
 * Fetch newest tickets
 */
export async function fetchNewestTickets(params?: DashboardQueryParams): Promise<DashboardTicket[]> {
  const queryParams = new URLSearchParams();
  if (params?.project) queryParams.set('project', params.project.toString());
  if (params?.company) queryParams.set('company', params.company.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  
  const url = `${API_ENDPOINTS.DASHBOARD_NEWEST}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return apiService.get<DashboardTicket[]>(url);
}

/**
 * Fetch live activity feed
 */
export async function fetchLiveActivity(params?: DashboardQueryParams): Promise<ActivityEntry[]> {
  const queryParams = new URLSearchParams();
  if (params?.project) queryParams.set('project', params.project.toString());
  if (params?.company) queryParams.set('company', params.company.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  
  const url = `${API_ENDPOINTS.DASHBOARD_ACTIVITY}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return apiService.get<ActivityEntry[]>(url);
}

/**
 * Fetch agent workload distribution
 */
export async function fetchAgentWorkload(params?: DashboardQueryParams): Promise<AgentWorkload[]> {
  const queryParams = new URLSearchParams();
  if (params?.project) queryParams.set('project', params.project.toString());
  if (params?.company) queryParams.set('company', params.company.toString());
  
  const url = `${API_ENDPOINTS.DASHBOARD_WORKLOAD}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return apiService.get<AgentWorkload[]>(url);
}

/**
 * Fetch Kanban board summary
 */
export async function fetchKanbanSummary(projectId: number, companyId?: number): Promise<KanbanSummary> {
  const queryParams = new URLSearchParams();
  queryParams.set('project', projectId.toString());
  if (companyId) queryParams.set('company', companyId.toString());
  
  const url = `${API_ENDPOINTS.DASHBOARD_KANBAN_SUMMARY}?${queryParams.toString()}`;
  return apiService.get<KanbanSummary>(url);
}

export default {
  fetchCompanyHealth,
  fetchAttentionNeeded,
  fetchNewestTickets,
  fetchLiveActivity,
  fetchAgentWorkload,
  fetchKanbanSummary,
};
