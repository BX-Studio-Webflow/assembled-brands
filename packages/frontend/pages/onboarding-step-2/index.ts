import type { AxiosError } from 'axios';
import { apiSaveOnboardingStep2 } from 'shared/services/OnboardingService';
import type { OnboardingStep2Body } from 'shared/types/onboarding';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { queryElement } from '$utils/selectors';

const initOnboardingStep2Page = () => {
  processMiddleware();

  const form = document.querySelector('[dev-target="onboarding-step2-form"]');
  if (!form) {
    console.error(
      'Onboarding Step 2 form not found. Element: [dev-target="onboarding-step2-form"] not found'
    );
    return;
  }

  const yearsInBusiness = queryElement<HTMLInputElement>(
    '[dev-target="years-in-business-input"]',
    form
  );
  const assetType = queryElement<HTMLInputElement>('input[name="asset_type"]', form);
  const desiredLoanAmount = queryElement<HTMLInputElement>(
    '[dev-target="desired-loan-amount-input"]',
    form
  );
  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);
  const backButton = queryElement<HTMLButtonElement>('[dev-target="back-button"]', form);

  if (!yearsInBusiness) {
    console.error('Ensure [dev-target="years-in-business-input"] is present.');
    return;
  }
  if (!assetType) {
    console.error('Ensure [input name="asset_type"] is present.');
    return;
  }
  if (!desiredLoanAmount) {
    console.error('Ensure [dev-target="desired-loan-amount-input"] is present.');
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

  backButton.addEventListener('click', () => {
    navigateToPath('/onboarding-step-1');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      yearsInBusiness.classList.remove('is-error');
      assetType.classList.remove('is-error');
      desiredLoanAmount.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'CONTINUE';
    };

    yearsInBusiness.addEventListener('input', resetErrors, { once: true });
    assetType.addEventListener('change', resetErrors, { once: true });
    desiredLoanAmount.addEventListener('input', resetErrors, { once: true });

    if (!yearsInBusiness.value) {
      yearsInBusiness.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Years in business is required';
      return;
    }

    if (!assetType.value) {
      assetType.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Asset type is required';
      return;
    }

    if (!desiredLoanAmount.value) {
      desiredLoanAmount.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Desired loan amount is required';
      return;
    }

    const payload: OnboardingStep2Body = {
      years_in_business: yearsInBusiness.value,
      asset_type: assetType.value as OnboardingStep2Body['asset_type'],
      desired_loan_amount: desiredLoanAmount.value,
    };

    try {
      await apiSaveOnboardingStep2(payload);

      submitButton.classList.add('is-success');
      submitButton.value = 'Saved. Continuing...';

      setTimeout(() => {
        navigateToPath('/onboarding-step-3');
      }, 500);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem saving your information';
    }
  });
};

initOnboardingStep2Page();
