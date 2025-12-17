import type { AxiosError } from 'axios';
import { apiSaveOnboardingStep1 } from 'shared/services/OnboardingService';
import type { OnboardingStep1Body } from 'shared/types/onboarding';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { queryElement } from '$utils/selectors';

const initOnboardingStep1Page = () => {
  processMiddleware();

  const form = document.querySelector('[dev-target="onboarding-step1-form"]');
  if (!form) {
    console.error(
      'Onboarding Step 1 form not found. Element: [dev-target="onboarding-step1-form"] not found'
    );
    return;
  }

  const legalName = queryElement<HTMLInputElement>('[dev-target="legal-name-input"]', form);
  const employeeCount = queryElement<HTMLSelectElement>('input[name="employee_options"]', form);
  const website = queryElement<HTMLInputElement>('[dev-target="website-input"]', form);
  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);
  const backButton = queryElement<HTMLButtonElement>('[dev-target="back-button"]', form);

  if (!legalName) {
    console.error('Ensure [dev-target="legal-name-input"] is present.');
    return;
  }
  if (!employeeCount) {
    console.error('Ensure [input name="employee_count"] is present.');
    return;
  }
  if (!submitButton) {
    console.error(
      'Required onboarding submit button not found. Ensure [dev-target="submit-button"] is present.'
    );
    return;
  }

  if (!backButton) {
    console.error(
      'Required onboarding back button not found. Ensure [dev-target="back-button"] is present.'
    );
    return;
  }

  if (!website) {
    console.error(
      'Required onboarding website input not found. Ensure [dev-target="website-input"] is present.'
    );
    return;
  }

  backButton.addEventListener('click', () => {
    navigateToPath('/login');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Basic UI reset on input
    const resetErrors = () => {
      legalName.classList.remove('is-error');
      employeeCount.classList.remove('is-error');
      website?.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'CONTINUE';
    };

    legalName.addEventListener('input', resetErrors, { once: true });
    employeeCount.addEventListener('change', resetErrors, { once: true });
    website?.addEventListener('input', resetErrors, { once: true });

    if (!legalName.value) {
      console.error('Legal name is required');
      console.log('legalName', legalName);
      legalName.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Legal name is required';
      return;
    }

    if (!employeeCount.value) {
      employeeCount.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Employee count is required';
      return;
    }

    if (!website?.value) {
      website.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Website is required';
      return;
    }

    const payload: OnboardingStep1Body = {
      legal_name: legalName.value,
      employee_count: employeeCount.value as OnboardingStep1Body['employee_count'],
      website: website.value,
    };

    try {
      await apiSaveOnboardingStep1(payload);

      submitButton.classList.add('is-success');
      submitButton.value = 'Saved. Continuing...';

      setTimeout(() => {
        navigateToPath('/onboarding-step-2');
      }, 500);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem saving your information';
    }
  });
};

initOnboardingStep1Page();
