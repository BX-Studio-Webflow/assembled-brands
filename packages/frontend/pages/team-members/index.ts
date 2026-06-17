import type { AxiosError } from 'axios';
import { apiGetTeamInvitations, apiInviteTeamMember } from 'shared/services/TeamService';
import type { TeamInvitation } from 'shared/types/team';

import { processMiddleware } from '$utils/auth';
import {
  checkProgressUserAndTeams,
  constructNavBarClasses,
  initCollapsibleSidebar,
  isValidEmail,
} from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const populateInviteRow = (row: HTMLTableRowElement, invite: TeamInvitation) => {
  const usernameCell = queryElement<HTMLElement>('[dev-target="username"]', row);
  const emailCell = queryElement<HTMLElement>('[dev-target="email"]', row);
  const roleCell = queryElement<HTMLElement>('[dev-target="role"]', row);
  const statusCell = queryElement<HTMLElement>('[dev-target="status"]', row);

  if (!usernameCell || !emailCell || !roleCell || !statusCell) {
    console.error(
      'Invite row is missing cell targets. Expected [dev-target="username"], [dev-target="email"], [dev-target="role"], and [dev-target="status"] inside [dev-target="table-row"].'
    );
    return false;
  }

  usernameCell.textContent = invite.invitee_name?.trim() || 'Unknown';
  emailCell.textContent = invite.invitee_email?.trim() || 'Unknown';
  roleCell.textContent = invite.user_defined_role?.trim() || 'Unknown';
  statusCell.textContent = (invite.status ?? '').trim() || 'Unknown';
  return true;
};

const initTeamMembersPage = async () => {
  constructNavBarClasses();
  processMiddleware();
  initCollapsibleSidebar();

  // checkProgressUserAndTeams wires up the logout button and populates sidebar
  // user info (company name / email) from the host's financial progress via X-Team-Id.
  const progressData = await checkProgressUserAndTeams();
  const teams = progressData?.teams || [];

  let teamId: number | null = null;
  if (teams.length > 0) {
    teamId = teams[0].team_id;
  }

  const teamTableWrapper = document.querySelector('[dev-target="member-table-wrapper"]');
  const teamFormWrapper = document.querySelector('[dev-target="member-form-wrapper"]');
  if (!teamTableWrapper || !teamFormWrapper) {
    console.error(
      'Team members table or form wrapper not found. Elements: [dev-target="member-table-wrapper"] or [dev-target="member-form-wrapper"] not found'
    );
    return;
  }

  const table = teamTableWrapper.querySelector('[fs-table-element="table"]');
  const tableBody = table?.querySelector('.fs-table_body');
  const templateRow = tableBody?.querySelector(
    '[dev-target="table-row"]'
  ) as HTMLTableRowElement | null;
  const addAnotherMemberTableLink = queryElement<HTMLAnchorElement>(
    '[dev-target="invite-another-member"]',
    teamTableWrapper
  );
  const limitedPrivilegeWrapper = queryElement<HTMLDivElement>(
    '[dev-target="limited-priviledge-wrapper"]'
  );

  if (!tableBody || !templateRow) {
    console.error(
      'Invite table body or template row not found. Ensure [fs-table-element="table"], .fs-table_body, and [dev-target="table-row"] exist inside [dev-target="member-table-wrapper"].'
    );
    return;
  }

  const loadTeamInvitations = async () => {
    try {
      const invites = await apiGetTeamInvitations();
      const hasInvites = invites.length > 0;

      teamFormWrapper.classList.toggle('hide', hasInvites);
      teamTableWrapper.classList.toggle('hide', !hasInvites);

      const existingRows = Array.from(tableBody.querySelectorAll('[dev-target="table-row"]'));
      existingRows.slice(1).forEach((row) => row.remove());

      if (!hasInvites) {
        templateRow.style.display = 'none';
        return;
      }

      invites.forEach((invite, index) => {
        const row =
          index === 0 ? templateRow : (templateRow.cloneNode(true) as HTMLTableRowElement);

        populateInviteRow(row, invite);
        row.style.display = '';

        if (index > 0) {
          tableBody.appendChild(row);
        }
      });
    } catch (error) {
      console.error('Failed to load team members:', error);
      const { message } = error as AxiosError;
      if (message === 'You are not a host of any team') {
        limitedPrivilegeWrapper?.classList.remove('hide');
        teamFormWrapper.classList.add('hide');
        teamTableWrapper.classList.add('hide');
      }
    }
  };

  await loadTeamInvitations();

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
  const inviteMessageInput = queryElement<HTMLInputElement>('[dev-target="invite-message"]');
  const addAnotherMemberFormLink = queryElement<HTMLAnchorElement>(
    '[dev-target="add-another-member-form"]',
    teamFormWrapper
  );
  const submitButton = queryElement<HTMLInputElement>('[dev-target="submit-button"]');

  if (
    !nameInput ||
    !emailInput ||
    !roleInput ||
    !inviteMessageInput ||
    !submitButton ||
    !addAnotherMemberTableLink ||
    !addAnotherMemberFormLink
  ) {
    console.error('Invite team members form is missing required dev-target elements.');
    return;
  }

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

    if (!emailInput.value.trim()) {
      emailInput.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Email is required';
      return;
    }

    if (!isValidEmail(emailInput.value.trim())) {
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

    const inputGroupWrapper = queryElement<HTMLDivElement>('[dev-target="input-group-wrapper"]');
    const memberGroups = inputGroupWrapper
      ? Array.from(inputGroupWrapper.querySelectorAll('.flex-vertical_auth.gap-20'))
      : [];

    const emails: string[] = [];
    const errors: string[] = [];

    memberGroups.forEach((group) => {
      if (group instanceof HTMLElement) {
        const groupEmailInput = queryElement<HTMLInputElement>('[dev-target="email-input"]', group);
        if (groupEmailInput?.value.trim()) {
          const email = groupEmailInput.value.trim();
          if (isValidEmail(email)) {
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
      await Promise.all(
        emails.map((email) =>
          apiInviteTeamMember(
            nameInput.value.trim(),
            roleInput.value.trim(),
            email,
            teamId!,
            inviteMessageInput.value.trim()
          )
        )
      );

      submitButton.classList.add('is-success');
      submitButton.value = 'Invites sent successfully!';

      nameInput.value = '';
      emailInput.value = '';
      roleInput.value = '';
      inviteMessageInput.value = '';

      document.querySelectorAll('[dev-target="is-cloned"]').forEach((group) => group.remove());

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
    if (firstGroup instanceof HTMLElement) {
      const clonedGroup = firstGroup.cloneNode(true) as HTMLElement;
      clonedGroup.setAttribute('dev-target', 'is-cloned');
      clonedGroup.classList.add('is-cloned');
      clonedGroup.querySelectorAll('input').forEach((input) => {
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
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    initTeamMembersPage();
  } catch (error) {
    console.error(error);
  }
});
