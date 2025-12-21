import type { AxiosError } from 'axios';
import { apiSaveOnboardingStep3 } from 'shared/services/OnboardingService';
import type { OnboardingStep3Body } from 'shared/types/onboarding';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { queryAllElements, queryElement } from '$utils/selectors';

const initOnboardingStep3Page = () => {
  processMiddleware();

  const form = document.querySelector('[dev-target="onboarding-step3-form"]');
  if (!form) {
    console.error(
      'Onboarding Step 3 form not found. Element: [dev-target="onboarding-step3-form"] not found'
    );
    return;
  }

  const companyTypeRadios = queryAllElements<HTMLInputElement>('input[name="company_type"]', form);
  const companyTypeOther = queryElement<HTMLInputElement>(
    '[dev-target="company-type-other-input"]',
    form
  );
  const companyTypeOtherInputWrapper = queryElement<HTMLDivElement>(
    '[dev-target="company-type-other-input-wrapper"]',
    form
  );
  const revenueQualification = queryElement<HTMLInputElement>(
    '[dev-target="revenue-qualification-input"]',
    form
  );
  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);
  const backButton = queryElement<HTMLButtonElement>('[dev-target="back-button"]', form);

  if (!companyTypeRadios.length) {
    console.error(
      'Ensure [input[name="company_type"]] is present. Found ' +
        companyTypeRadios.length +
        ' elements.'
    );
    return;
  }
  if (!revenueQualification) {
    console.error('Ensure [dev-target="revenue-qualification-input"] is present.');
    return;
  }
  if (!submitButton) {
    console.error('Ensure [dev-target="submit-button"] is present.');
    return;
  }
  if (!backButton) {
    console.error('Ensure [dev-target="back-button"] is present.');
    return;
  }
  if (!companyTypeOtherInputWrapper) {
    console.error('Ensure [dev-target="company-type-other-input-wrapper"] is present.');
    return;
  }

  backButton.addEventListener('click', () => {
    navigateToPath('/onboarding-step-2');
  });

  //set change listener for company type
  companyTypeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      console.log('companyType', radio.value);
      if (radio.value === 'other') {
        companyTypeOtherInputWrapper.classList.remove('hide');
      } else {
        companyTypeOtherInputWrapper.classList.add('hide');
      }
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      companyTypeOther?.classList.remove('is-error');
      revenueQualification.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'CONTINUE';
    };

    companyTypeOther?.addEventListener('input', resetErrors, { once: true });
    revenueQualification.addEventListener('change', resetErrors, { once: true });

    const selectedCompanyType = companyTypeRadios.find((radio) => radio.checked);

    if (!selectedCompanyType) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Company type is required';
      return;
    }

    // If "other" is selected, require the free-text field
    if (selectedCompanyType.value === 'other' && !companyTypeOther?.value) {
      companyTypeOther?.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Please specify the company type';
      return;
    }

    if (!revenueQualification.value) {
      revenueQualification.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Revenue qualification is required';
      return;
    }

    if (revenueQualification.value === 'no') {
      navigateToPath('/onboarding-step-not-fit');
      return;
    }

    const payload: OnboardingStep3Body = {
      company_type: selectedCompanyType.value as OnboardingStep3Body['company_type'],
      revenue_qualification:
        revenueQualification.value as OnboardingStep3Body['revenue_qualification'],
      ...(selectedCompanyType.value === 'other' && companyTypeOther?.value
        ? { company_type_other: companyTypeOther.value }
        : {}),
    };

    try {
      await apiSaveOnboardingStep3(payload);

      submitButton.classList.add('is-success');
      submitButton.value = 'Saved. Finishing up...';

      setTimeout(() => {
        navigateToPath('/finance-company-profile');
      }, 500);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem saving your information';
    }
  });
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    initOnboardingStep3Page();
  } catch (error) {
    console.error(error);
  }
});
