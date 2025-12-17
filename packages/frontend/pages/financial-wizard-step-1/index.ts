import type { AxiosError } from 'axios';
import { apiSaveFinancialStep1 } from 'shared/services/FinancialWizardService';
import type { FinancialStep1Body } from 'shared/types/financial-wizard';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { queryElement } from '$utils/selectors';

const initFinancialWizardStep1Page = () => {
  processMiddleware();

  const form = document.querySelector('[dev-target="financial-wizard-step1-form"]');
  if (!form) {
    console.error(
      'Financial Wizard Step 1 form not found. Element: [dev-target="financial-wizard-step1-form"] not found'
    );
    return;
  }

  const revenueLast12Months = queryElement<HTMLInputElement>(
    '[dev-target="revenue-last-12-months-input"]',
    form
  );
  const netIncomeLast12Months = queryElement<HTMLInputElement>(
    '[dev-target="net-income-last-12-months-input"]',
    form
  );
  const projectedRevenueNext12Months = queryElement<HTMLInputElement>(
    '[dev-target="projected-revenue-next-12-months-input"]',
    form
  );
  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);
  const backButton = queryElement<HTMLButtonElement>('[dev-target="back-button"]', form);

  if (!revenueLast12Months) {
    console.error('Ensure [dev-target="revenue-last-12-months-input"] is present.');
    return;
  }
  if (!netIncomeLast12Months) {
    console.error('Ensure [dev-target="net-income-last-12-months-input"] is present.');
    return;
  }
  if (!projectedRevenueNext12Months) {
    console.error('Ensure [dev-target="projected-revenue-next-12-months-input"] is present.');
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

  backButton.addEventListener('click', () => {
    navigateToPath('/dashboard');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      revenueLast12Months.classList.remove('is-error');
      netIncomeLast12Months.classList.remove('is-error');
      projectedRevenueNext12Months.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'CONTINUE';
    };

    revenueLast12Months.addEventListener('input', resetErrors, { once: true });
    netIncomeLast12Months.addEventListener('input', resetErrors, { once: true });
    projectedRevenueNext12Months.addEventListener('input', resetErrors, { once: true });

    if (!revenueLast12Months.value) {
      revenueLast12Months.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Revenue for last 12 months is required';
      return;
    }

    if (!netIncomeLast12Months.value) {
      netIncomeLast12Months.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Net income for last 12 months is required';
      return;
    }

    if (!projectedRevenueNext12Months.value) {
      projectedRevenueNext12Months.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Projected revenue for next 12 months is required';
      return;
    }

    const payload: FinancialStep1Body = {
      revenue_last_12_months: revenueLast12Months.value,
      net_income_last_12_months: netIncomeLast12Months.value,
      projected_revenue_next_12_months: projectedRevenueNext12Months.value,
    };

    try {
      await apiSaveFinancialStep1(payload);

      submitButton.classList.add('is-success');
      submitButton.value = 'Saved. Continuing...';

      setTimeout(() => {
        navigateToPath('/financial-wizard-step-2');
      }, 500);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem saving your information';
    }
  });
};

initFinancialWizardStep1Page();
