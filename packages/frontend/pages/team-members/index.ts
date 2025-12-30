import { apiGetTeamInvitations } from 'shared/services/TeamService';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { checkProgressUserAndTeams } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const TeamMembersPage = async () => {
  processMiddleware();
  checkProgressUserAndTeams();

  // Find the table and template row
  const table = document.querySelector('[fs-table-element="table"]');
  const tableBody = table?.querySelector('.fs-table_body');
  const templateRow = tableBody?.querySelector('[dev-target="table-row"]') as HTMLTableRowElement;
  const addAnotherMemberLink = queryElement<HTMLAnchorElement>(
    '[dev-target="invite-another-member"]'
  );
  if (!addAnotherMemberLink) {
    console.error('Add another member link not found');
    return;
  }
  if (!tableBody) {
    console.error('Table body not found');
    return;
  }
  if (!templateRow) {
    console.error('Template row not found');
    return;
  }

  addAnotherMemberLink.addEventListener('click', () => {
    navigateToPath('/invite-team-members');
  });

  try {
    //const teamMembersData = await apiGetMyTeamMembers();
    const invites = await apiGetTeamInvitations();

    // If no members, hide template row
    if (invites?.length === 0) {
      templateRow.style.display = 'none';
      return;
    }

    // Show template row and use it as first data row
    templateRow.style.display = '';
    const usernameCell = queryElement<HTMLTableCellElement>('[dev-target="username"]', templateRow);
    const emailCell = queryElement<HTMLTableCellElement>('[dev-target="email"]', templateRow);
    const roleCell = queryElement<HTMLTableCellElement>('[dev-target="role"]', templateRow);
    const statusCell = queryElement<HTMLTableCellElement>('[dev-target="status"]', templateRow);

    if (usernameCell && emailCell && roleCell && statusCell) {
      usernameCell.textContent = invites[0].invitee_name || 'Unknown';
      emailCell.textContent = invites[0].invitee_email || 'Unknown';
      roleCell.textContent = invites[0].user_defined_role || 'Unknown';
      statusCell.textContent = invites[0].status.trim() || 'Unknown';
    }

    // Clone template row for remaining members
    for (let i = 1; i < invites.length; i++) {
      const clonedRow = templateRow.cloneNode(true) as HTMLTableRowElement;
      const clonedUsernameCell = queryElement<HTMLTableCellElement>(
        '[dev-target="username"]',
        clonedRow
      );
      const clonedEmailCell = queryElement<HTMLTableCellElement>('[dev-target="email"]', clonedRow);
      const clonedRoleCell = queryElement<HTMLTableCellElement>('[dev-target="role"]', clonedRow);
      const clonedStatusCell = queryElement<HTMLTableCellElement>(
        '[dev-target="status"]',
        clonedRow
      );

      if (clonedUsernameCell && clonedEmailCell && clonedRoleCell && clonedStatusCell) {
        clonedUsernameCell.textContent = invites[i].invitee_name.trim() || 'Unknown';
        clonedEmailCell.textContent = invites[i].invitee_email.trim() || 'Unknown';
        clonedRoleCell.textContent = invites[i].user_defined_role.trim() || 'Unknown';
        clonedStatusCell.textContent = invites[i].status.trim() || 'Unknown';
      }

      tableBody.appendChild(clonedRow);
    }
  } catch (error) {
    console.error('Failed to load team members:', error);
  }
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    TeamMembersPage();
  } catch (error) {
    console.error(error);
  }
});
