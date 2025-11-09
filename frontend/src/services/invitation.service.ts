/**
 * Project Invitation Service
 * Handles API calls for project invitations
 */

import { apiService } from './api.service';

export interface ProjectInvitation {
  id: number;
  project: number;
  project_name: string;
  project_key: string;
  email: string;
  token: string;
  role: 'superadmin' | 'admin' | 'user' | 'manager';
  invited_by: number;
  invited_by_username: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  accepted_at: string | null;
  accepted_by: number | null;
  created_at: string;
  is_valid: boolean;
}

export interface SendInvitationRequest {
  project_id: number;
  email: string;
  role?: 'superadmin' | 'admin' | 'user' | 'manager';
}

export interface SendInvitationResponse {
  success: boolean;
  email_sent: boolean;
  invitation: ProjectInvitation;
  message: string;
}

export interface AcceptInvitationRequest {
  token: string;
}

export interface AcceptInvitationResponse {
  success: boolean;
  message: string;
  project: {
    id: number;
    name: string;
    key: string;
  };
  role: string;
}

export interface CheckInvitationResponse {
  valid: boolean;
  status: string;
  project_name: string;
  project_key: string;
  role: string;
  email: string;
  expires_at: string;
  invited_by: string | null;
}

class InvitationService {
  /**
   * Send a project invitation to an email address
   */
  async sendInvitation(data: SendInvitationRequest): Promise<SendInvitationResponse> {
    return apiService.post<SendInvitationResponse>('/api/tickets/invitations/send/', data);
  }

  /**
   * Get all invitations for projects user has access to
   */
  async getInvitations(): Promise<ProjectInvitation[]> {
    return apiService.get<ProjectInvitation[]>('/api/tickets/invitations/');
  }

  /**
   * Get a specific invitation
   */
  async getInvitation(id: number): Promise<ProjectInvitation> {
    return apiService.get<ProjectInvitation>(`/api/tickets/invitations/${id}/`);
  }

  /**
   * Accept a project invitation
   */
  async acceptInvitation(data: AcceptInvitationRequest): Promise<AcceptInvitationResponse> {
    return apiService.post<AcceptInvitationResponse>('/api/tickets/invitations/accept/', data);
  }

  /**
   * Check if an invitation is valid (public endpoint)
   */
  async checkInvitation(token: string): Promise<CheckInvitationResponse> {
    return apiService.get<CheckInvitationResponse>(`/api/tickets/invitations/check/?token=${token}`);
  }

  /**
   * Revoke a pending invitation
   */
  async revokeInvitation(id: number): Promise<{ success: boolean; message: string }> {
    return apiService.post<{ success: boolean; message: string }>(`/api/tickets/invitations/${id}/revoke/`, {});
  }

  /**
   * Get pending invitations for a specific project
   */
  async getProjectInvitations(projectId: number): Promise<ProjectInvitation[]> {
    const allInvitations = await this.getInvitations();
    return allInvitations.filter(
      inv => inv.project === projectId && inv.status === 'pending'
    );
  }
}

export const invitationService = new InvitationService();
export default invitationService;
