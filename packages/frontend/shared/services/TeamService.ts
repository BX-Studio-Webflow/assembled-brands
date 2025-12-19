import type {
  AcceptInvitationResponse,
  CreateTeamBody,
  CreateTeamResponse,
  GetInvitationResponse,
  GetMyInvitationsResponse,
  GetMyTeamMembersResponse,
  GetMyTeamsResponse,
  GetTeamInvitationsResponse,
  GetTeamsResponse,
  RejectInvitationResponse,
  TeamQuery,
} from '../types/team';
import ApiService from './ApiService';

export async function apiGetTeamDashboard() {
  return ApiService.fetchDataWithAxios<GetTeamsResponse>({
    url: '/team/dashboard',
    method: 'get',
  });
}

export const apiCreateTeam = (data: CreateTeamBody) => {
  return ApiService.fetchDataWithAxios<CreateTeamResponse>({
    url: '/team/create',
    method: 'post',
    data,
  });
};

export const apiGetTeamInvitations = (params?: TeamQuery) => {
  return ApiService.fetchDataWithAxios<GetTeamInvitationsResponse>({
    url: '/team/invitations',
    method: 'get',
    params,
  });
};

export const apiGetMyInvitations = (params?: TeamQuery) => {
  return ApiService.fetchDataWithAxios<GetMyInvitationsResponse>({
    url: '/team/my-invitations',
    method: 'get',
    params,
  });
};

export const apiGetMyTeamMembers = (params?: TeamQuery) => {
  return ApiService.fetchDataWithAxios<GetMyTeamMembersResponse>({
    url: '/team/my-team/members',
    method: 'get',
    params,
  });
};

export const apiGetMyTeams = () => {
  return ApiService.fetchDataWithAxios<GetMyTeamsResponse>({
    url: '/team/my-teams',
    method: 'get',
  });
};

export const apiGetInvitation = (invitationId: number) => {
  return ApiService.fetchDataWithAxios<GetInvitationResponse>({
    url: `/team/invitations/${invitationId}`,
    method: 'get',
  });
};

export async function apiAcceptTeamInvitation(invitationId: number) {
  return ApiService.fetchDataWithAxios<AcceptInvitationResponse>({
    url: `/team/invitations/${invitationId}/accept`,
    method: 'post',
  });
}

export async function apiRejectTeamInvitation(invitationId: number) {
  return ApiService.fetchDataWithAxios<RejectInvitationResponse>({
    url: `/team/invitations/${invitationId}/reject`,
    method: 'post',
  });
}

export const apiRevokeTeamMember = (teamId: number, memberId: number) => {
  return ApiService.fetchDataWithAxios<void>({
    url: `/team/revoke-access`,
    method: 'post',
    data: {
      team_id: teamId,
      member_id: memberId,
    },
  });
};

export const apiDeleteTeamInvitation = (invitationId: number) => {
  return ApiService.fetchDataWithAxios<void>({
    url: `/team/invitations/${invitationId}`,
    method: 'delete',
  });
};

export const apiInviteTeamMember = (
  name: string,
  user_defined_role: string,
  email: string,
  teamId: number,
  message: string
) => {
  return ApiService.fetchDataWithAxios<void>({
    url: '/team/invite',
    method: 'post',
    data: {
      invitee_name: name,
      invitee_email: email,
      team_id: teamId,
      user_defined_role: user_defined_role,
      message: message,
    },
  });
};
