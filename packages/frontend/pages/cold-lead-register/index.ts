import type { AxiosError } from 'axios';
import { apiColdLeadRegister } from 'shared/services/AuthService';

import { isValidEmail } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const initLoginPage = () => {
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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    email.addEventListener('input', () => {
      email.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'CONTINUE';
    });

    //validate email
    if (!email.value) {
      console.error('Invalid email');
      return;
    }

    //validate email format
    if (!isValidEmail(email.value)) {
      console.error('Invalid email format');
      return;
    }
    try {
      const response = await apiColdLeadRegister({
        work_email: email.value,
      });

      console.log(response);
    } catch (error) {
      const { message } = error as AxiosError;
      const { code } = (error as AxiosError).response?.data as { code: string };
      console.error(message);
      if (['INVALID_EMAIL', 'USER_EXISTS', 'USER_NOT_FOUND'].includes(code)) {
        submitButton.classList.add('is-error');
        submitButton.value = message;
        return;
      }
    }
  });
};

initLoginPage();
