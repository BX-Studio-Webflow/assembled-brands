import ApiService from './ApiService'
import type { GetTeamsResponse } from '@/@types/team'

export async function apiGetTeamDashboard() {
    return ApiService.fetchDataWithAxios<GetTeamsResponse>({
        url: '/team/dashboard',
        method: 'get',
    })
}

export async function apiAcceptTeamInvitation(invitationId: number) {
    return ApiService.fetchDataWithAxios<void>({
        url: `/team/invitations/${invitationId}/accept`,
        method: 'post',
    })
}

export async function apiRejectTeamInvitation(invitationId: number) {
    return ApiService.fetchDataWithAxios<void>({
        url: `/team/invitations/${invitationId}/reject`,
        method: 'post',
    })
}

export const apiRevokeTeamMember = (teamId: number, memberId: number) => {
    return ApiService.fetchDataWithAxios<void>({
        url: `/team/revoke-access`,
        method: 'post',
        data: {
            team_id: teamId,
            member_id: memberId,
        },
    })
}

export const apiDeleteTeamInvitation = (invitationId: number) => {
    return ApiService.fetchDataWithAxios<void>({
        url: `/team/invitations/${invitationId}`,
        method: 'delete',
    })
}

export const apiInviteTeamMember = (email: string, teamId: number) => {
    return ApiService.fetchDataWithAxios<void>({
        url: '/team/invite',
        method: 'post',
        data: {
            invitee_email: email,
            team_id: teamId,
        },
    })
}
