import type { AxiosError } from 'axios';
import {
  apiSaveOnboardingStep1,
  apiSaveOnboardingStep2,
  apiSaveOnboardingStep3,
} from 'shared/services/OnboardingService';
import type {
  OnboardingStep1Body,
  OnboardingStep2Body,
  OnboardingStep3Body,
} from 'shared/types/onboarding';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { queryAllElements, queryElement } from '$utils/selectors';

const initOnboardingStep1Page = () => {
  processMiddleware();

  const form = document.querySelector('[dev-target="onboarding-step1-form"]');
  if (!form) {
    console.error(
      'Onboarding Step 1 form not found. Element: [dev-target="onboarding-step1-form"] not found'
    );
    return;
  }

  let currentStep = 1;

  // Step containers
  const step1Wrapper = queryElement<HTMLElement>('[dev-target="step-1"]', form);
  const step2Wrapper = queryElement<HTMLElement>('[dev-target="step-2"]', form);
  const step3Wrapper = queryElement<HTMLElement>('[dev-target="step-3"]', form);
  const progressBar = queryElement<HTMLElement>('[dev-target="step-indicator"]');
  const stepText = queryElement<HTMLElement>('[dev-target="step-text"]');

  // Buttons
  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);
  const backButton = queryElement<HTMLButtonElement>('[dev-target="back-button"]', form);
  // Step 1 elements
  const legalName = queryElement<HTMLInputElement>('[dev-target="legal-name-input"]', form);
  const employeeCountInputs = queryAllElements<HTMLInputElement>(
    'input[name="employee_options"]',
    form
  );
  const website = queryElement<HTMLInputElement>('[dev-target="website-input"]', form);

  // Step 2 elements
  const yearsInBusiness = queryElement<HTMLInputElement>(
    '[dev-target="years-in-business-input"]',
    form
  );
  const assetTypeInputs = queryAllElements<HTMLInputElement>('input[name="asset_type"]', form);
  const desiredLoanAmount = queryElement<HTMLInputElement>(
    '[dev-target="desired-loan-amount-input"]',
    form
  );

  // Step 3 elements
  const companyTypeInputs = queryAllElements<HTMLInputElement>('input[name="company_type"]', form);
  const companyTypeOther = queryElement<HTMLInputElement>(
    '[dev-target="company-type-other-input"]',
    form
  );
  const companyTypeOtherWrapper = queryElement<HTMLDivElement>(
    '[dev-target="company-type-other-input-wrapper"]',
    form
  );
  const revenueQualification = queryElement<HTMLSelectElement>(
    '[dev-target="revenue-qualification-input"]',
    form
  );

  // Validation
  if (!step1Wrapper || !step2Wrapper || !step3Wrapper) {
    console.error('Step wrappers not found');
    return;
  }
  if (!submitButton || !backButton) {
    console.error('Navigation buttons not found');
    return;
  }
  if (!stepText) {
    console.error('Step text element not found');
    return;
  }

  // Show/hide company type other field
  companyTypeInputs.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.value === 'other') {
        companyTypeOtherWrapper?.classList.remove('hide');
      } else {
        companyTypeOtherWrapper?.classList.add('hide');
      }
    });
  });

  // Show specific step
  const showStep = (step: number) => {
    step1Wrapper.classList.remove('is-active');
    step2Wrapper.classList.remove('is-active');
    step3Wrapper.classList.remove('is-active');

    if (step === 1) step1Wrapper.classList.add('is-active');
    if (step === 2) step2Wrapper.classList.add('is-active');
    if (step === 3) step3Wrapper.classList.add('is-active');

    // Update progress bar
    if (progressBar) {
      const percentage = (step / 3) * 100;
      progressBar.style.width = `${percentage}%`;
    }

    // Update step text
    if (stepText) {
      stepText.textContent = `Step ${step} of 3`;
    }

    // Update button text
    submitButton.value = step === 3 ? 'FINISH' : 'NEXT';

    currentStep = step;
  };

  // Initialize on step 1
  showStep(1);

  // Back button handler
  backButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (currentStep === 1) {
      navigateToPath('/login');
    } else {
      showStep(currentStep - 1);
    }
  });

  // Form submit handler
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (currentStep === 1) {
      await handleStep1Submit();
    } else if (currentStep === 2) {
      await handleStep2Submit();
    } else if (currentStep === 3) {
      await handleStep3Submit();
    }
  });

  // Step 1 submit handler
  const handleStep1Submit = async () => {
    const resetErrors = () => {
      legalName?.classList.remove('is-error');
      employeeCountInputs.forEach((input) => input.classList.remove('is-error'));
      website?.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'NEXT';
    };

    legalName?.addEventListener('input', resetErrors, { once: true });
    employeeCountInputs.forEach((input) =>
      input.addEventListener('change', resetErrors, { once: true })
    );
    website?.addEventListener('input', resetErrors, { once: true });

    if (!legalName?.value) {
      legalName?.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Legal name is required';
      return;
    }

    const selectedEmployeeCount = employeeCountInputs.find((input) => input.checked);
    if (!selectedEmployeeCount) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Employee count is required';
      return;
    }

    if (!website?.value) {
      website?.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Website is required';
      return;
    }

    const payload: OnboardingStep1Body = {
      legal_name: legalName.value,
      employee_count: selectedEmployeeCount.value as OnboardingStep1Body['employee_count'],
      website: website.value,
    };

    try {
      await apiSaveOnboardingStep1(payload);
      submitButton.classList.add('is-success');
      submitButton.value = 'Saved!';

      setTimeout(() => {
        submitButton.classList.remove('is-success');
        showStep(2);
      }, 300);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem saving your information';
    }
  };

  // Step 2 submit handler
  const handleStep2Submit = async () => {
    const resetErrors = () => {
      yearsInBusiness?.classList.remove('is-error');
      assetTypeInputs.forEach((input) => input.classList.remove('is-error'));
      desiredLoanAmount?.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'NEXT';
    };

    yearsInBusiness?.addEventListener('input', resetErrors, { once: true });
    assetTypeInputs.forEach((input) =>
      input.addEventListener('change', resetErrors, { once: true })
    );
    desiredLoanAmount?.addEventListener('input', resetErrors, { once: true });

    if (!yearsInBusiness?.value) {
      yearsInBusiness?.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Years in business is required';
      return;
    }

    const selectedAssetType = assetTypeInputs.find((input) => input.checked);
    if (!selectedAssetType) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Asset type is required';
      return;
    }

    if (!desiredLoanAmount?.value) {
      desiredLoanAmount?.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Desired loan amount is required';
      return;
    }

    const payload: OnboardingStep2Body = {
      years_in_business: yearsInBusiness.value,
      asset_type: selectedAssetType.value as OnboardingStep2Body['asset_type'],
      desired_loan_amount: desiredLoanAmount.value,
    };

    try {
      await apiSaveOnboardingStep2(payload);
      submitButton.classList.add('is-success');
      submitButton.value = 'Saved!';

      setTimeout(() => {
        submitButton.classList.remove('is-success');
        showStep(3);
      }, 300);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem saving your information';
    }
  };

  // Step 3 submit handler
  const handleStep3Submit = async () => {
    const resetErrors = () => {
      companyTypeInputs.forEach((input) => input.classList.remove('is-error'));
      companyTypeOther?.classList.remove('is-error');
      revenueQualification?.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'FINISH';
    };

    companyTypeInputs.forEach((input) =>
      input.addEventListener('change', resetErrors, { once: true })
    );
    companyTypeOther?.addEventListener('input', resetErrors, { once: true });
    revenueQualification?.addEventListener('change', resetErrors, { once: true });

    const selectedCompanyType = companyTypeInputs.find((input) => input.checked);
    if (!selectedCompanyType) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Company type is required';
      return;
    }

    if (selectedCompanyType.value === 'other' && !companyTypeOther?.value) {
      companyTypeOther?.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Please specify the company type';
      return;
    }

    if (!revenueQualification?.value) {
      revenueQualification?.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Revenue qualification is required';
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
      submitButton.value = 'Complete!';

      if (revenueQualification.value === 'no') {
        navigateToPath('/onboarding-step-not-fit');
        return;
      }

      setTimeout(() => {
        navigateToPath('/finance-company-profile');
      }, 500);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem saving your information';
    }
  };
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    initOnboardingStep1Page();
  } catch (error) {
    console.error(error);
  }
});
