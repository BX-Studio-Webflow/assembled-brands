import type { AxiosError } from 'axios';
import { apiForgotPassword } from 'shared/services/AuthService';

import { isValidEmail } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const initAccountRecoveryInitiatePage = () => {
  const form = document.querySelector('[dev-target="reset-form"]');
  if (!form) {
    console.error('Login form not found. Element: [dev-target="reset-form"] not found');
    return;
  }

  const email = queryElement<HTMLInputElement>('[dev-target="email-input"]', form);

  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);

  if (!email || !submitButton) {
    console.error(
      'Email input or submit button not found. Elements: [dev-target="email-input"] or [dev-target="submit-button"] not found'
    );
    return;
  }

  // Real-time validation on input change
  email.addEventListener('change', () => {
    email.classList.remove('is-error');
    submitButton.classList.remove('is-error');
    submitButton.value = 'SUBMIT';

    // Validate email on change
    if (email.value && !isValidEmail(email.value)) {
      email.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Please enter a valid email';
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    //validate email
    if (!email.value) {
      console.error('Email is required');
      submitButton.value = 'Email is required';
      email.classList.add('is-error');
      return;
    }

    //validate email format
    if (!isValidEmail(email.value)) {
      console.error('Invalid email format');
      return;
    }
    try {
      await apiForgotPassword({
        email: email.value,
      });

      submitButton.classList.add('is-success');
      submitButton.value = 'Please check your email for your verification';
    } catch (error) {
      const { message } = error as AxiosError;
      const { code } = (error as AxiosError).response?.data as { code: string };
      console.error(message);
      if (['INVALID_EMAIL', 'USER_EXISTS', 'USER_NOT_FOUND'].includes(code)) {
        submitButton.classList.add('is-error');
        submitButton.value = message;
      }
    }
  });
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    initAccountRecoveryInitiatePage();
  } catch (error) {
    console.error(error);
  }
});
