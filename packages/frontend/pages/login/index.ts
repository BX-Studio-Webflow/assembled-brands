import type { AxiosError } from 'axios';
import { apiGetUserMe, apiSignIn } from 'shared/services/AuthService';

import { setCookie } from '$utils/cookies';
import { isValidEmail } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const initLoginPage = () => {
  const form = document.querySelector('[dev-target="login-form"]');
  if (!form) {
    console.error('Login form not found. Element: [dev-target="login-form"] not found');
    return;
  }

  const getUserMe = async () => {
    try {
      const response = await apiGetUserMe();
      console.log(response);
    } catch (error) {
      console.error(error);
    }
  };

  getUserMe();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const email = queryElement<HTMLInputElement>('[dev-target="email-input"]', form);
    const password = queryElement<HTMLInputElement>('[dev-target="password-input"]', form);
    const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);

    if (!email || !password || !submitButton) {
      console.error(
        'Email or password input or submit button not found. Elements: [dev-target="email-input"] or [dev-target="password-input"] or [dev-target="submit-button"] not found'
      );
      return;
    }

    email.addEventListener('input', () => {
      email.classList.remove('is-error');
      password.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'CONTINUE';
    });
    password.addEventListener('input', () => {
      password.classList.remove('is-error');
      email.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'CONTINUE';
    });

    //validate email
    if (!email.value) {
      console.error('Invalid email');
      return;
    }

    //validate password
    if (!password.value) {
      console.error('Invalid password');
      return;
    }

    //validate password length
    if (password.value.length < 8) {
      console.error('Password must be at least 8 characters long');
      return;
    }

    //validate email format
    if (!isValidEmail(email.value)) {
      console.error('Invalid email format');
      return;
    }
    try {
      const response = await apiSignIn({
        email: email.value,
        password: password.value,
      });
      setCookie('accessToken', response.token, 10);
    } catch (error) {
      const { message } = error as AxiosError;
      const { code } = (error as AxiosError).response?.data as { code: string };
      console.error(message, code);
      if (code === 'AUTH_INVALID_CREDENTIALS') {
        submitButton.classList.add('is-error');
        submitButton.value = message;
        return;
      }
    }
  });
};

initLoginPage();
