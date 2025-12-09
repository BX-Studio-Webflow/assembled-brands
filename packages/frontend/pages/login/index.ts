import type { AxiosError } from 'axios';
import { apiColdLeadRegister } from 'shared/services/AuthService';

import { isValidEmail } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const initLoginPage = () => {
  console.log('Log page');
  const form = document.querySelector('[dev-target="login-form"]');
  if (!form) {
    console.error('Login form not found');
    return;
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const email = queryElement<HTMLInputElement>('[dev-target="email-input"]', form);
    const password = queryElement<HTMLInputElement>('[dev-target="password-input"]', form);
    if (!email || !password) {
      console.error('Email or password input not found');
      return;
    }
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
      apiColdLeadRegister({
        work_email: email.value,
      });
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
    }
  });
};

initLoginPage();
