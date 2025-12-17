import type { AxiosError } from 'axios';
import { apiHotLeadRegister } from 'shared/services/AuthService';
import type { ClaimYourAccountBody } from 'shared/types/auth';

import { processMiddleware, setCookie } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { isValidEmail } from '$utils/helpers';
import { queryAllElements, queryElement } from '$utils/selectors';

const initClaimAccountPage = () => {
  processMiddleware();
  const form = document.querySelector('[dev-target="claim-account-form"]');
  if (!form) {
    console.error(
      'Claim account form not found. Element: [dev-target="claim-account-form"] not found'
    );
    return;
  }

  const workEmail = queryElement<HTMLInputElement>('[dev-target="work-email-input"]', form);
  const firstName = queryElement<HTMLInputElement>('[dev-target="first-name-input"]', form);
  const lastName = queryElement<HTMLInputElement>('[dev-target="last-name-input"]', form);
  const password = queryElement<HTMLInputElement>('[dev-target="password-input"]', form);
  const loanUrgencyRadios = queryAllElements<HTMLInputElement>('input[name="loan_urgency"]', form);
  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);

  if (!workEmail) {
    console.error('Ensure [dev-target="work-email-input"] is present.');
    return;
  }
  if (!firstName) {
    console.error('Ensure [dev-target="first-name-input"] is present.');
    return;
  }
  if (!lastName) {
    console.error('Ensure [dev-target="last-name-input"] is present.');
    return;
  }
  if (!password) {
    console.error('Ensure [dev-target="password-input"] is present.');
    return;
  }
  if (!loanUrgencyRadios.length) {
    console.error(
      'Ensure [input[name="loan_urgency"]] is present. Found ' +
        loanUrgencyRadios.length +
        ' elements.'
    );
    return;
  }
  if (!submitButton) {
    console.error('Ensure [dev-target="submit-button"] is present.');
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      workEmail.classList.remove('is-error');
      firstName.classList.remove('is-error');
      lastName.classList.remove('is-error');
      password.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'CLAIM ACCOUNT';
    };

    workEmail.addEventListener('input', resetErrors, { once: true });
    firstName.addEventListener('input', resetErrors, { once: true });
    lastName.addEventListener('input', resetErrors, { once: true });
    password.addEventListener('input', resetErrors, { once: true });
    loanUrgencyRadios.forEach((radio) => {
      radio.addEventListener('change', resetErrors, { once: true });
    });

    if (!workEmail.value) {
      workEmail.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Work email is required';
      return;
    }

    if (!isValidEmail(workEmail.value)) {
      workEmail.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Invalid email format';
      return;
    }

    if (!firstName.value) {
      firstName.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'First name is required';
      return;
    }

    if (firstName.value.length < 2 || firstName.value.length > 40) {
      firstName.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'First name must be between 2 and 40 characters';
      return;
    }

    if (!lastName.value) {
      lastName.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Last name is required';
      return;
    }

    if (lastName.value.length < 2 || lastName.value.length > 40) {
      lastName.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Last name must be between 2 and 40 characters';
      return;
    }

    if (!password.value) {
      password.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Password is required';
      return;
    }

    if (password.value.length < 8 || password.value.length > 40) {
      password.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Password must be between 8 and 40 characters';
      return;
    }

    const selectedLoanUrgency = loanUrgencyRadios.find((radio) => radio.checked);
    if (!selectedLoanUrgency) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Loan urgency is required';
      return;
    }

    const payload: ClaimYourAccountBody = {
      work_email: workEmail.value,
      first_name: firstName.value,
      last_name: lastName.value,
      password: password.value,
      loan_urgency: selectedLoanUrgency.value as ClaimYourAccountBody['loan_urgency'],
    };

    try {
      const response = await apiHotLeadRegister(payload);

      setCookie('accessToken', response.token, 10);

      submitButton.classList.add('is-success');
      submitButton.value = 'Account claimed successfully!';

      setTimeout(() => {
        navigateToPath('/claim-account-get-started');
      }, 500);
    } catch (error) {
      const { message } = error as AxiosError;
      const { code } = (error as AxiosError).response?.data as { code: string };
      console.error(message);
      submitButton.classList.add('is-error');
      if (code === 'USER_EXISTS') {
        submitButton.value = 'User already exists. Please try logging in.';
      } else if (code === 'INVALID_EMAIL') {
        submitButton.value = 'We are not accepting personal emails at the moment';
      } else {
        submitButton.value = message || 'There was a problem claiming your account';
      }
    }
  });
};

initClaimAccountPage();
