import type { AxiosError } from 'axios';
import { apiSaveFinancialOverview } from 'shared/services/FinancialWizardService';
import type {
  FinancialOverviewBody,
  FinancialWizardProgressResponse,
} from 'shared/types/financial-wizard';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import {
  checkProgressUserAndTeams,
  constructAdminSelect,
  constructNavBarClasses,
  initCollapsibleSidebar,
} from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const initFinancialOverviewPage = async () => {
  constructNavBarClasses();
  processMiddleware();
  initCollapsibleSidebar();

  const form = document.querySelector('[dev-target="financial-overview-form"]');
  if (!form) {
    console.error(
      'Financial Overview form not found. Element: [dev-target="financial-overview-form"] not found'
    );
    return;
  }

  const companyRevenue = queryElement<HTMLInputElement>('[dev-target="company-revenue"]', form);
  const companyNetIncome = queryElement<HTMLTextAreaElement>(
    '[dev-target="company-net-income"]',
    form
  );
  const companyProjectedRevenue = queryElement<HTMLTextAreaElement>(
    '[dev-target="company-projected-revenue"]',
    form
  );

  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);
  const backButton = queryElement<HTMLButtonElement>('[dev-target="back-button"]', form);

  if (!companyRevenue) {
    console.error('Ensure [dev-target="company-revenue"] is present.');
    return;
  }
  if (!companyNetIncome) {
    console.error('Ensure [dev-target="company-net-income"] is present.');
    return;
  }
  if (!companyProjectedRevenue) {
    console.error('Ensure [dev-target="company-projected-revenue"] is present.');
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

  // Function to update form fields based on financial progress
  const updateFormFields = (progress: FinancialWizardProgressResponse | undefined) => {
    if (progress?.financial_overview) {
      companyRevenue.value = progress.financial_overview.revenue_last_12_months || '';
      companyNetIncome.value = progress.financial_overview.net_income_last_12_months || '';
      companyProjectedRevenue.value =
        progress.financial_overview.projected_revenue_next_12_months || '';
    }
  };

  let financialProgress: FinancialWizardProgressResponse | undefined;
  const loadFinancialProgress = async (userId?: string) => {
    const result = await checkProgressUserAndTeams(userId);
    financialProgress = result?.financialProgress;
    updateFormFields(financialProgress);
  };

  await loadFinancialProgress();
  constructAdminSelect(loadFinancialProgress);

  backButton.addEventListener('click', () => {
    navigateToPath('/finance-company-profile');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      companyRevenue.classList.remove('is-error');
      companyNetIncome.classList.remove('is-error');
      companyProjectedRevenue.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'CONTINUE';
    };

    companyRevenue.addEventListener('input', resetErrors, { once: true });
    companyNetIncome.addEventListener('input', resetErrors, { once: true });
    companyProjectedRevenue.addEventListener('input', resetErrors, { once: true });

    if (!companyRevenue.value) {
      companyRevenue.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Company legal name is required';
      return;
    }

    const payload: FinancialOverviewBody = {
      revenue_last_12_months: companyRevenue.value,
      net_income_last_12_months: companyNetIncome.value,
      projected_revenue_next_12_months: companyProjectedRevenue.value,
    };

    try {
      await apiSaveFinancialOverview(payload);

      submitButton.classList.add('is-success');
      submitButton.value = 'Saved. Continuing...';

      setTimeout(() => {
        navigateToPath('/finance-docs-financial-reports');
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
    initFinancialOverviewPage();
  } catch (error) {
    console.error(error);
  }
});
