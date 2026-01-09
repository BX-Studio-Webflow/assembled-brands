import type { AxiosError } from 'axios';
import { apiGetTeamInvitations, apiInviteTeamMember } from 'shared/services/TeamService';

import { processMiddleware } from '$utils/auth';
import {
  checkProgressUserAndTeams,
  constructNavBarClasses,
  initCollapsibleSidebar,
} from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const TeamMembersPage = async () => {
  constructNavBarClasses();
  processMiddleware();
  initCollapsibleSidebar();

  const progressData = await checkProgressUserAndTeams();
  const teams = progressData?.teams || [];

  let teamId: number | null = null;
  if (teams && teams.length > 0) {
    teamId = teams[0].team_id;
  }

  // Find the table and template row
  const teamTableWrapper = document.querySelector('[dev-target="member-table-wrapper"]');
  const teamFormWrapper = document.querySelector('[dev-target="member-form-wrapper"]');
  if (!teamTableWrapper || !teamFormWrapper) {
    console.error(
      'Team members table or form wrapper not found. Elements: [dev-target="member-table-wrapper"] or [dev-target="member-form-wrapper"] not found'
    );
    return;
  }
  const table = document.querySelector('[fs-table-element="table"]');
  const tableBody = table?.querySelector('.fs-table_body');
  const templateRow = tableBody?.querySelector('[dev-target="table-row"]') as HTMLTableRowElement;
  const addAnotherMemberTableLink = queryElement<HTMLAnchorElement>(
    '[dev-target="invite-another-member"]'
  );
  const form = document.querySelector('[dev-target="add-team-member-form"]');
  if (!form) {
    console.error(
      'Add team member form not found. Element: [dev-target="add-team-member-form"] not found'
    );
    return;
  }

  const nameInput = queryElement<HTMLInputElement>('[dev-target="name-input"]');
  const emailInput = queryElement<HTMLInputElement>('[dev-target="email-input"]');
  const roleInput = queryElement<HTMLInputElement>('[dev-target="role-input"]');
  const limitedPrivilegeWrapper = queryElement<HTMLDivElement>(
    '[dev-target="limited-priviledge-wrapper"]'
  );
  const inviteMessageInput = queryElement<HTMLInputElement>('[dev-target="invite-message"]');
  const addAnotherMemberFormLink = queryElement<HTMLAnchorElement>(
    '[dev-target="add-another-member-form"]'
  );
  const submitButton = queryElement<HTMLInputElement>('[dev-target="submit-button"]');

  if (!nameInput) {
    console.error('Ensure [dev-target="name"] is present.');
    return;
  }
  if (!emailInput) {
    console.error('Ensure [dev-target="email"] is present.');
    return;
  }
  if (!roleInput) {
    console.error('Ensure [dev-target="role"] is present.');
    return;
  }
  if (!inviteMessageInput) {
    console.error('Ensure [dev-target="invite-message"] is present.');
    return;
  }
  if (!submitButton) {
    console.error('Ensure [dev-target="submit-button"] is present.');
    return;
  }

  if (!addAnotherMemberTableLink) {
    console.error(
      'Add another member link not found. Ensure [dev-target="invite-another-member"] is present.'
    );
    return;
  }

  if (!addAnotherMemberFormLink) {
    console.error(
      'Add another member form link not found. Ensure [dev-target="add-another-member-form"] is present.'
    );
    return;
  }

  if (!limitedPrivilegeWrapper) {
    console.error(
      'Limited privilege wrapper not found. Ensure [dev-target="limited-priviledge-wrapper"] is present.'
    );
    return;
  }

  if (!tableBody) {
    console.error('Table body not found. Ensure .fs-table_body is present.');
    return;
  }
  if (!templateRow) {
    console.error('Template row not found. Ensure [dev-target="table-row"] is present.');
    return;
  }

  // Function to load and render team invitations
  const loadTeamInvitations = async () => {
    try {
      const invites = await apiGetTeamInvitations();
      const hasInvites = invites && invites.length > 0;
      teamFormWrapper.classList.toggle('hide', hasInvites);
      teamTableWrapper.classList.toggle('hide', !hasInvites);

      // Clear existing rows (except template) to avoid duplicates on reload
      const existingRows = Array.from(tableBody.children).slice(1);
      existingRows.forEach((row) => row.remove());

      // If no invites, hide template row
      if (!invites || invites.length === 0) {
        templateRow.style.display = 'none';
        return;
      }

      // Show and populate template row with first invite
      templateRow.style.display = '';
      const usernameCell = queryElement<HTMLTableCellElement>(
        '[dev-target="username"]',
        templateRow
      );
      const emailCell = queryElement<HTMLTableCellElement>('[dev-target="email"]', templateRow);
      const roleCell = queryElement<HTMLTableCellElement>('[dev-target="role"]', templateRow);
      const statusCell = queryElement<HTMLTableCellElement>('[dev-target="status"]', templateRow);

      if (usernameCell && emailCell && roleCell && statusCell) {
        usernameCell.textContent = invites[0].invitee_name || 'Unknown';
        emailCell.textContent = invites[0].invitee_email || 'Unknown';
        roleCell.textContent = invites[0].user_defined_role || 'Unknown';
        statusCell.textContent = invites[0].status.trim() || 'Unknown';
      }

      // Use DocumentFragment for better performance when adding multiple rows
      const fragment = document.createDocumentFragment();

      // Clone template row for remaining members
      for (let i = 1; i < invites.length; i++) {
        const clonedRow = templateRow.cloneNode(true) as HTMLTableRowElement;
        const clonedUsernameCell = queryElement<HTMLTableCellElement>(
          '[dev-target="username"]',
          clonedRow
        );
        const clonedEmailCell = queryElement<HTMLTableCellElement>(
          '[dev-target="email"]',
          clonedRow
        );
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

        fragment.appendChild(clonedRow);
      }

      // Append all rows at once for better performance
      tableBody.appendChild(fragment);
    } catch (error) {
      console.error('Failed to load team members:', error);
      const { message } = error as AxiosError;
      if (message === 'You are not a host of any team') {
        limitedPrivilegeWrapper.classList.remove('hide');
        teamFormWrapper.classList.add('hide');
        teamTableWrapper.classList.add('hide');
      }
    }
  };

  // Add another member functionality
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      nameInput.classList.remove('is-error');
      emailInput.classList.remove('is-error');
      roleInput.classList.remove('is-error');
      inviteMessageInput.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'SEND INVITE';
    };

    nameInput.addEventListener('input', resetErrors, { once: true });
    emailInput.addEventListener('input', resetErrors, { once: true });
    roleInput.addEventListener('input', resetErrors, { once: true });
    inviteMessageInput.addEventListener('input', resetErrors, { once: true });

    if (!emailInput.value || !emailInput.value.trim()) {
      emailInput.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Email is required';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
      emailInput.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Please enter a valid email address';
      return;
    }

    if (!teamId) {
      submitButton.classList.add('is-error');
      submitButton.value = 'No team found. Please create a team first.';
      return;
    }

    // Collect all member emails from all input groups
    const inputGroupWrapper = queryElement<HTMLDivElement>(
      '[dev-target="input-group-wrapper"]',
      form
    );
    const memberGroups = inputGroupWrapper
      ? Array.from(inputGroupWrapper.querySelectorAll('.flex-vertical_auth.gap-20'))
      : [];

    const emails: string[] = [];
    const errors: string[] = [];

    memberGroups.forEach((group) => {
      if (group instanceof HTMLElement) {
        const groupEmailInput = queryElement<HTMLInputElement>('[dev-target="email-input"]', group);
        if (groupEmailInput && groupEmailInput.value.trim()) {
          const email = groupEmailInput.value.trim();
          if (emailRegex.test(email)) {
            emails.push(email);
          } else {
            errors.push('Please enter a valid email address');
            groupEmailInput.classList.add('is-error');
          }
        }
      }
    });

    if (errors.length > 0) {
      submitButton.classList.add('is-error');
      const [error] = errors;
      submitButton.value = error;
      return;
    }

    if (emails.length === 0) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Please provide at least one email';
      return;
    }

    submitButton.classList.remove('is-error');
    submitButton.value = 'Sending invites...';

    try {
      const invitePromises = emails.map((email) =>
        apiInviteTeamMember(
          nameInput.value.trim(),
          roleInput.value.trim(),
          email,
          teamId!,
          inviteMessageInput.value.trim()
        )
      );
      await Promise.all(invitePromises);

      submitButton.classList.add('is-success');
      submitButton.value = 'Invites sent successfully!';

      // Clear form inputs
      nameInput.value = '';
      emailInput.value = '';
      roleInput.value = '';
      inviteMessageInput.value = '';

      // Clear cloned input groups
      const clonedGroups = document.querySelectorAll('[dev-target="is-cloned"]');
      clonedGroups.forEach((group) => group.remove());

      // Reload invitations to show new data
      await loadTeamInvitations();

      setTimeout(() => {
        submitButton.classList.remove('is-success');
        submitButton.value = 'SEND INVITE';
      }, 2000);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'Failed to send invites. Please try again.';
    }
  });

  addAnotherMemberFormLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const inputGroupWrapper = queryElement<HTMLDivElement>('[dev-target="input-group-wrapper"]');
    if (!inputGroupWrapper) {
      console.error('Input group wrapper not found');
      return;
    }

    const firstGroup = inputGroupWrapper.querySelector('[dev-target="clone-template"]');
    if (firstGroup && firstGroup instanceof HTMLElement) {
      const clonedGroup = firstGroup.cloneNode(true) as HTMLElement;
      clonedGroup.setAttribute('dev-target', 'is-cloned');
      clonedGroup.classList.add('is-cloned');
      const inputs = clonedGroup.querySelectorAll('input');
      inputs.forEach((input) => {
        input.value = '';
      });
      inputGroupWrapper.appendChild(clonedGroup);
    }
  });

  addAnotherMemberTableLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    teamTableWrapper.classList.add('hide');
    teamFormWrapper.classList.remove('hide');
  });

  // Initial load
  await loadTeamInvitations();
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    TeamMembersPage();
  } catch (error) {
    console.error(error);
  }
});
