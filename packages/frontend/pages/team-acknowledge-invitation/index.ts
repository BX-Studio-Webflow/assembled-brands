import type { AxiosError } from 'axios';
import {
  apiAcceptTeamInvitation,
  apiGetInvitation,
  apiRejectTeamInvitation,
} from 'shared/services/TeamService';

import { processMiddleware } from '$utils/auth';

const TeamMembersPage = async () => {
  processMiddleware();
  //get  /accept-team-invitation?invitation_id=6&team_id=2&team_name=BX
  const invitationId = new URLSearchParams(window.location.search).get('invitation_id');
  const teamName = new URLSearchParams(window.location.search).get('team_name');
  const inviterName = new URLSearchParams(window.location.search).get('inviter_name');

  //get the invitation from the server
  const invitation = await apiGetInvitation(Number(invitationId));
  if (!invitation) {
    console.error('Invitation not found');
    return;
  }
  const inviter_name = invitation.inviter
    ? `${invitation.inviter.first_name || ''} ${invitation.inviter.last_name || ''}`.trim()
    : inviterName || 'The admin';
  const team_name = invitation.team?.name || teamName || 'Unknown';
  const text = `${inviter_name} has invited you to join the ${team_name} team. Click the button below to accept or reject the invitation.`;
  const message = document.querySelector('[dev-target="team-message"]');
  const acceptButton = document.querySelector('[dev-target="accept"]');
  const rejectButton = document.querySelector('[dev-target="reject"]');
  const adminMessage = document.querySelector('[dev-target="admin-message"]');

  if (!message || !acceptButton || !rejectButton || !adminMessage) {
    console.error('Message or accept/reject buttons not found');
    return;
  }

  message.textContent = text;
  adminMessage.textContent = invitation.message || 'Come work with us!';
  try {
    acceptButton.addEventListener('click', async () => {
      await apiAcceptTeamInvitation(Number(invitationId));
    });
    rejectButton.addEventListener('click', async () => {
      await apiRejectTeamInvitation(Number(invitationId));
    });
  } catch (error) {
    const { message } = error as AxiosError;
    console.error(message);
  }
};

TeamMembersPage();
