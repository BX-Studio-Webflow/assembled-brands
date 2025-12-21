import type { AxiosError } from 'axios';
import { apiUpdateBusiness } from 'shared/services/BusinessService';
import type { UpdateBusinessRequest } from 'shared/types/business';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { constructNavBarClasses, progressFinancialWizardPercentage } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const initFinancialCompanyProfilePage = async () => {
  constructNavBarClasses();
  processMiddleware();
  const result = await progressFinancialWizardPercentage();
  const form = document.querySelector('[dev-target="finance-company-profile"]');
  if (!form) {
    console.error(
      'Financial Company Profile form not found. Element: [dev-target="finance-company-profile"] not found'
    );
    return;
  }

  const companyLegalNameInput = queryElement<HTMLInputElement>(
    '[dev-target="company-legal-name"]',
    form
  );
  const companyHeadquartersInput = queryElement<HTMLSelectElement>(
    '[dev-target="company-hq"]',
    form
  );
  const companyYear = queryElement<HTMLInputElement>('[dev-target="company-year"]', form);
  const accountingSoftwareInput = queryElement<HTMLSelectElement>(
    '[dev-target="accounting-software"]',
    form
  );
  const accountingSoftwareOther = queryElement<HTMLInputElement>(
    '[dev-target="other-accounting-software"]',
    form
  );
  const accountingSoftwareOtherWrapper = queryElement<HTMLDivElement>(
    '[dev-target="other-accounting-software-wrapper"]',
    form
  );

  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);
  const backButton = queryElement<HTMLButtonElement>('[dev-target="back-button"]', form);

  if (!companyLegalNameInput) {
    console.error('Ensure [dev-target="company-legal-name"] is present.');
    return;
  }
  if (!companyHeadquartersInput) {
    console.error('Ensure [dev-target="company-hq"] is present.');
    return;
  }
  if (!companyYear) {
    console.error('Ensure [dev-target="company-year"] is present.');
    return;
  }
  if (!accountingSoftwareInput) {
    console.error('Ensure [dev-target="accounting-software"] is present.');
    return;
  }
  if (!accountingSoftwareOther) {
    console.error('Ensure [dev-target="other-accounting-software"] is present.');
    return;
  }
  if (!accountingSoftwareOtherWrapper) {
    console.error('Ensure [dev-target="other-accounting-software-wrapper"] is present.');
    return;
  }
  if (!backButton) {
    console.error('Ensure [dev-target="back-button"] is present.');
    return;
  }
  if (!submitButton) {
    console.error('Ensure [dev-target="submit-button"] is present.');
    return;
  }

  // Handle accounting software change event
  const handleAccountingSoftwareChange = () => {
    const { value } = accountingSoftwareInput;

    if (value === 'other') {
      accountingSoftwareOtherWrapper.classList.remove('hide');
    } else {
      accountingSoftwareOtherWrapper.classList.add('hide');
    }
  };

  accountingSoftwareInput.addEventListener('change', handleAccountingSoftwareChange);

  //Preset the values if they are available
  if (result?.company_profile) {
    if (result.company_profile.legal_name) {
      companyLegalNameInput.value = result.company_profile.legal_name;
    }
    if (result.company_profile.headquarters) {
      companyHeadquartersInput.value = result.company_profile.headquarters;
      // Trigger change event to ensure select is properly updated
      companyHeadquartersInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (result.company_profile.year_formed) {
      companyYear.value = result.company_profile.year_formed;
    }
    if (result.company_profile.accounting_software) {
      accountingSoftwareInput.value = result.company_profile.accounting_software;
      // Trigger change event to ensure select is properly updated and wrapper visibility is set
      accountingSoftwareInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (result.company_profile.other_accounting_software) {
      accountingSoftwareOther.value = result.company_profile.other_accounting_software;
    }
  }

  backButton.addEventListener('click', () => {
    navigateToPath('/dashboard');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      companyLegalNameInput.classList.remove('is-error');
      companyHeadquartersInput.classList.remove('is-error');
      companyYear.classList.remove('is-error');
      accountingSoftwareInput.classList.remove('is-error');
      accountingSoftwareOther.classList.remove('is-error');
      accountingSoftwareOtherWrapper.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'CONTINUE';
    };

    companyLegalNameInput.addEventListener('input', resetErrors, { once: true });
    companyHeadquartersInput.addEventListener('input', resetErrors, { once: true });
    companyYear.addEventListener('input', resetErrors, { once: true });
    accountingSoftwareInput.addEventListener('input', resetErrors, { once: true });
    accountingSoftwareOther.addEventListener('input', resetErrors, { once: true });
    accountingSoftwareOtherWrapper.addEventListener('input', resetErrors, { once: true });

    if (!companyLegalNameInput.value) {
      companyLegalNameInput.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Company legal name is required';
      return;
    }

    const payload: UpdateBusinessRequest = {
      legal_name: companyLegalNameInput.value,
      headquarters: companyHeadquartersInput.value,
      description: '',
      year_formed: companyYear.value,
      accounting_software: accountingSoftwareInput.value,
      other_accounting_software: accountingSoftwareOther.value || '',
    };

    try {
      await apiUpdateBusiness(payload);

      submitButton.classList.add('is-success');
      submitButton.value = 'Continuing...';

      setTimeout(() => {
        navigateToPath('/finance-financial-overview');
      }, 200);
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
  initFinancialCompanyProfilePage();
});
