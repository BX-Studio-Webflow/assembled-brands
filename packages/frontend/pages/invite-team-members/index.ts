import type { AxiosError } from 'axios';
import { apiGetMyTeams, apiInviteTeamMember } from 'shared/services/TeamService';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { checkProgressUserAndTeams, initCollapsibleSidebar } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const initInviteTeamMembersPage = async () => {
  processMiddleware();
  checkProgressUserAndTeams();
  initCollapsibleSidebar();

  const form = document.querySelector('[dev-target="add-team-member-form"]');
  if (!form) {
    console.error(
      'Add team member form not found. Element: [dev-target="add-team-member-form"] not found'
    );
    return;
  }

  let teamId: number | null = null;
  const teams = await apiGetMyTeams();
  if (teams && teams.length > 0) {
    teamId = teams[0].team_id;
  }

  const nameInput = queryElement<HTMLInputElement>('[dev-target="name"]', form);
  const emailInput = queryElement<HTMLInputElement>('[dev-target="email"]', form);
  const roleInput = queryElement<HTMLInputElement>('[dev-target="role"]', form);
  const inviteMessageInput = queryElement<HTMLInputElement>('[dev-target="invite-message"]', form);
  const addAnotherMemberLink = queryElement<HTMLAnchorElement>(
    '[dev-target="add-another-member"]',
    form
  );
  const submitButton = queryElement<HTMLInputElement>('[dev-target="back-button"]', form);

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
    console.error('Ensure [dev-target="back-button"] is present.');
    return;
  }

  // Add another member functionality
  if (addAnotherMemberLink) {
    addAnotherMemberLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const inputGroupWrapper = queryElement<HTMLDivElement>(
        '[dev-target="input-group-wrapper"]',
        form
      );
      if (!inputGroupWrapper) {
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
        const groupEmailInput = queryElement<HTMLInputElement>('[dev-target="email"]', group);
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
      submitButton.value = 'Please provide at least one valid member email';
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

      navigateToPath('/team-members');
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'Failed to send invites. Please try again.';
    }
  });
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    initInviteTeamMembersPage();
  } catch (error) {
    console.error(error);
  }
});
