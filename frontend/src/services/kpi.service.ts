/**
 * KPI Service
 * API calls for KPI data and User Reviews
 */

import apiService from './api.service';
import { API_ENDPOINTS } from '../config/api';
import type { PaginatedResponse } from '../types/api';
import type {
  UserMetrics,
  ProjectKPISummary,
  UserReview,
  CreateUserReviewData,
  UpdateUserReviewData,
  UserReviewSummary,
  ReviewPrompt,
  KPIQueryParams,
  MyResolvedTicketsResponse,
  MyActiveTicketsResponse,
} from '../types/kpi';

// ============================================================================
// Query Parameter Builder
// ============================================================================

function buildQueryString(params?: KPIQueryParams): string {
  if (!params) return '';
  
  const queryParams = new URLSearchParams();
  if (params.project) queryParams.set('project', params.project.toString());
  if (params.date_from) queryParams.set('date_from', params.date_from);
  if (params.date_to) queryParams.set('date_to', params.date_to);
  if (params.user_id) queryParams.set('user_id', params.user_id.toString());
  
  return queryParams.toString() ? '?' + queryParams.toString() : '';
}

// ============================================================================
// KPI Metrics Endpoints
// ============================================================================

/**
 * Fetch user metrics for all users in a project
 * - Superadmin/Manager: See all users
 * - Admin/User: Only see their own metrics
 */
export async function fetchUserMetrics(params: KPIQueryParams): Promise<UserMetrics[]> {
  const url = `${API_ENDPOINTS.KPI_USER_METRICS}${buildQueryString(params)}`;
  return apiService.get<UserMetrics[]>(url);
}

/**
 * Fetch current user's own metrics
 * Admin review data is NOT included (hidden from users)
 */
export async function fetchMyMetrics(params?: KPIQueryParams): Promise<UserMetrics | UserMetrics[]> {
  const url = `${API_ENDPOINTS.KPI_MY_METRICS}${buildQueryString(params)}`;
  return apiService.get<UserMetrics | UserMetrics[]>(url);
}

/**
 * Fetch project-level KPI summary
 * Only accessible by superadmin/admin/manager
 */
export async function fetchProjectSummary(params: KPIQueryParams): Promise<ProjectKPISummary> {
  const url = `${API_ENDPOINTS.KPI_PROJECT_SUMMARY}${buildQueryString(params)}`;
  return apiService.get<ProjectKPISummary>(url);
}

/**
 * Fetch resolved tickets for the current user with timing details
 * For the personal KPI dashboard
 */
export async function fetchMyResolvedTickets(
  projectId: number,
  dateFrom?: string,
  dateTo?: string,
  limit?: number
): Promise<MyResolvedTicketsResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set('project', projectId.toString());
  if (dateFrom) queryParams.set('date_from', dateFrom);
  if (dateTo) queryParams.set('date_to', dateTo);
  if (limit) queryParams.set('limit', limit.toString());
  
  const url = `${API_ENDPOINTS.KPI_MY_TICKETS}?${queryParams.toString()}`;
  return apiService.get<MyResolvedTicketsResponse>(url);
}

/**
 * Fetch active tickets assigned to the current user
 * For the personal KPI dashboard
 */
export async function fetchMyActiveTickets(
  projectId: number,
  limit?: number
): Promise<MyActiveTicketsResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set('project', projectId.toString());
  if (limit) queryParams.set('limit', limit.toString());
  
  const url = `${API_ENDPOINTS.KPI_MY_ACTIVE}?${queryParams.toString()}`;
  return apiService.get<MyActiveTicketsResponse>(url);
}

// ============================================================================
// User Reviews Endpoints
// ============================================================================

/**
 * Fetch all user reviews visible to the current user
 * - Users CANNOT see reviews about themselves
 * - Superadmin/Manager can see all reviews in their projects
 * - Admin can see reviews they created
 */
export async function fetchUserReviews(projectId?: number): Promise<PaginatedResponse<UserReview>> {
  const queryParams = projectId ? `?project=${projectId}` : '';
  const url = `${API_ENDPOINTS.USER_REVIEWS}${queryParams}`;
  return apiService.get<PaginatedResponse<UserReview>>(url);
}

/**
 * Fetch reviews for a specific user
 * - Users CANNOT access their own reviews
 * - Returns reviews + summary stats
 */
export async function fetchReviewsForUser(userId: number, projectId?: number): Promise<UserReviewSummary> {
  const queryParams = projectId ? `?project=${projectId}` : '';
  const url = `${API_ENDPOINTS.USER_REVIEWS_FOR_USER(userId)}${queryParams}`;
  return apiService.get<UserReviewSummary>(url);
}

/**
 * Create a new user review
 * Only admin/superadmin can create reviews
 */
export async function createUserReview(data: CreateUserReviewData): Promise<UserReview> {
  return apiService.post<UserReview>(API_ENDPOINTS.USER_REVIEWS, data);
}

/**
 * Update an existing review
 * Only reviewer or superadmin can update
 */
export async function updateUserReview(reviewId: number, data: UpdateUserReviewData): Promise<UserReview> {
  return apiService.patch<UserReview>(API_ENDPOINTS.USER_REVIEW_DETAIL(reviewId), data);
}

/**
 * Delete a review
 * Only reviewer or superadmin can delete
 */
export async function deleteUserReview(reviewId: number): Promise<void> {
  return apiService.delete(API_ENDPOINTS.USER_REVIEW_DETAIL(reviewId));
}

/**
 * Fetch pending review prompts
 * Shows recently resolved tickets that haven't been reviewed yet
 * Helps prompt admins to review users after ticket resolution
 */
export async function fetchPendingReviewPrompts(projectId: number): Promise<ReviewPrompt[]> {
  const url = `${API_ENDPOINTS.USER_REVIEWS_PENDING_PROMPTS}?project=${projectId}`;
  return apiService.get<ReviewPrompt[]>(url);
}

// ============================================================================
// Export all as default object for convenient importing
// ============================================================================

const kpiService = {
  // KPI Metrics
  fetchUserMetrics,
  fetchMyMetrics,
  fetchProjectSummary,
  fetchMyResolvedTickets,
  fetchMyActiveTickets,
  
  // User Reviews
  fetchUserReviews,
  fetchReviewsForUser,
  createUserReview,
  updateUserReview,
  deleteUserReview,
  fetchPendingReviewPrompts,
};

export default kpiService;
