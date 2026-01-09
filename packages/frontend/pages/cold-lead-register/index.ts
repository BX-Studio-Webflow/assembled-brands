import type { AxiosError } from 'axios';
import { apiColdLeadRegister } from 'shared/services/AuthService';

import { isValidEmail } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const initColdLeadRegisterPage = () => {
  const form = document.querySelector('[dev-target="signup-form"]');
  if (!form) {
    console.error('Login form not found. Element: [dev-target="signup-form"] not found');
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
    submitButton.value = 'CONTINUE';

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
      await apiColdLeadRegister({
        work_email: email.value,
      });

      submitButton.classList.add('is-success');
      submitButton.value = 'Please check your email for your verification';
    } catch (error) {
      const { message } = error as AxiosError;
      const { code } = (error as AxiosError).response?.data as { code: string };
      console.error(message);
      if (['AUTH_INVALID_CREDENTIALS', 'USER_NOT_FOUND', 'USER_EXISTS'].includes(code)) {
        submitButton.classList.add('is-error');
        submitButton.value = message;
      }
      if (code === 'USER_EXISTS') {
        const recoverAccountDiv = queryElement<HTMLDivElement>(
          '[dev-target="recover-account"]',
          form
        );
        if (!recoverAccountDiv) {
          console.error(
            'Recover account div not found. Element: [dev-target="recover-account"] not found'
          );
          return;
        }
        recoverAccountDiv.classList.remove('hide');
      }
    }
  });
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    initColdLeadRegisterPage();
  } catch (error) {
    console.error(error);
  }
});
