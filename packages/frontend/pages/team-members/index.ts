import { apiGetMyTeamMembers } from 'shared/services/TeamService';

import { processMiddleware } from '$utils/auth';
import { queryElement } from '$utils/selectors';

const TeamMembersPage = async () => {
  processMiddleware();

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
  try {
    const teamMembersData = await apiGetMyTeamMembers();
    const members = teamMembersData.members || [];

    // Remove all existing data rows (keep header and template)
    const existingRows = tableBody.querySelectorAll('[dev-target="table-row"]:not(:first-of-type)');
    existingRows.forEach((row) => row.remove());

    // If no members, hide template row
    if (members.length === 0) {
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
      usernameCell.textContent = members[0].name || '';
      emailCell.textContent = members[0].email || '';
      roleCell.textContent = members[0].role || '';
      statusCell.textContent = 'Active';
    }

    // Clone template row for remaining members
    for (let i = 1; i < members.length; i++) {
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
        clonedUsernameCell.textContent = members[i].name || '';
        clonedEmailCell.textContent = members[i].email || '';
        clonedRoleCell.textContent = members[i].role || '';
        clonedStatusCell.textContent = 'Active';
      }

      tableBody.appendChild(clonedRow);
    }
  } catch (error) {
    console.error('Failed to load team members:', error);
  }
};

TeamMembersPage();
