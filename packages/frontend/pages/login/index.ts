import type { AxiosError } from 'axios';
import { apiSignIn } from 'shared/services/AuthService';
import type { FinancialWizardProgressResponse } from 'shared/types/financial-wizard';

import { setCookie } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { isValidEmail } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

/**
 * Financial wizard page order
 */
const FINANCIAL_WIZARD_PAGES = [
  'company-profile',
  'financial-overview',
  'financial-reports',
  'accounts-inventory',
  'ecommerce-performance',
  'team-ownership',
] as const;

/**
 * Maps financial wizard page names to their route paths
 */
const FINANCIAL_WIZARD_PAGE_TO_ROUTE: Record<(typeof FINANCIAL_WIZARD_PAGES)[number], string> = {
  'company-profile': '/finance-company-profile',
  'financial-overview': '/finance-financial-overview',
  'financial-reports': '/finance-docs-financial-reports',
  'accounts-inventory': '/finance-docs-accounts-and-inventory',
  'ecommerce-performance': '/finance-docs-ecommerce-performance',
  'team-ownership': '/finance-docs-team-and-ownership',
};

/**
 * Determines if a financial wizard step is complete based on the progress data
 * @param page - The financial wizard page to check
 * @param progress - The financial wizard progress response
 * @returns True if the step is complete, false otherwise.
 */
const isFinancialWizardStepComplete = (
  page: (typeof FINANCIAL_WIZARD_PAGES)[number],
  progress: FinancialWizardProgressResponse | null | undefined
): boolean => {
  if (!progress) return false;

  switch (page) {
    case 'company-profile':
      return progress.company_profile !== null;
    case 'financial-overview':
      return progress.financial_overview !== null;
    case 'financial-reports':
      return progress.financial_reports.length > 0;
    case 'accounts-inventory':
      return progress.accounts_inventory.length > 0;
    case 'ecommerce-performance':
      return progress.ecommerce_performance.length > 0;
    case 'team-ownership':
      return progress.team_ownership.length > 0;
    default:
      return false;
  }
};

/**
 * Finds the next incomplete step in the financial wizard, or returns the current step if incomplete.
 * @param progress - The financial wizard progress response
 * @returns The next incomplete step in the financial wizard, or the null if all steps are complete.
 */
const getNextFinancialWizardStep = (
  progress: FinancialWizardProgressResponse | null | undefined
): string | null => {
  if (!progress) {
    return '/finance-company-profile';
  }

  const currentPage = progress.current_page as (typeof FINANCIAL_WIZARD_PAGES)[number];
  const currentPageIndex = FINANCIAL_WIZARD_PAGES.indexOf(currentPage);

  // If current page is not found in the page order, default to first page
  if (currentPageIndex === -1) {
    return '/finance-company-profile';
  }

  // Check if current step is complete
  const isCurrentStepComplete = isFinancialWizardStepComplete(currentPage, progress);

  // If current step is not complete, return current step route
  if (!isCurrentStepComplete) {
    return FINANCIAL_WIZARD_PAGE_TO_ROUTE[currentPage] || '/finance-company-profile';
  }

  // Current step is complete, find the next incomplete step
  for (let i = currentPageIndex + 1; i < FINANCIAL_WIZARD_PAGES.length; i++) {
    const page = FINANCIAL_WIZARD_PAGES[i];
    if (!isFinancialWizardStepComplete(page, progress)) {
      return FINANCIAL_WIZARD_PAGE_TO_ROUTE[page];
    }
  }

  // All steps are complete
  return null;
};

const initLoginPage = () => {
  const form = document.querySelector('[dev-target="login-form"]');
  if (!form) {
    console.error('Login form not found. Element: [dev-target="login-form"] not found');
    return;
  }

  const email = queryElement<HTMLInputElement>('[dev-target="email-input"]', form);
  const password = queryElement<HTMLInputElement>('[dev-target="password-input"]', form);
  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);

  if (!email || !password || !submitButton) {
    console.error(
      'Email or password input or submit button not found. Elements: [dev-target="email-input"] or [dev-target="password-input"] or [dev-target="submit-button"] not found'
    );
    return;
  }

  const eyeIcon = queryElement<HTMLButtonElement>('[dev-target="eye-icon"]', form);
  const EYE_OPEN_SVG = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="black"/>
    </svg>
    `;
  const EYE_CLOSED_SVG = `<svg width="20" height="17" viewBox="0 0 20 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.26704 8.7829L7.03749 8.01245C6.89235 7.16774 7.13175 6.43647 7.7557 5.81866C8.37964 5.20085 9.10783 4.96451 9.94029 5.10965L10.7107 4.3392C10.5482 4.27228 10.3785 4.22204 10.2018 4.1885C10.025 4.15511 9.82499 4.13842 9.60163 4.13842C8.61549 4.13842 7.77972 4.48111 7.09434 5.1665C6.40896 5.85188 6.06627 6.68765 6.06627 7.67379C6.06627 7.89715 6.08296 8.1034 6.11634 8.29257C6.14988 8.48174 6.20012 8.64518 6.26704 8.7829ZM3.20798 11.7563L3.94118 11.1088C3.32836 10.6411 2.78409 10.1291 2.30835 9.57271C1.83261 9.01634 1.42542 8.38336 1.08676 7.67379C1.89309 6.045 3.05018 4.75083 4.55802 3.7913C6.06586 2.83176 7.74707 2.35199 9.60163 2.35199C10.0693 2.35199 10.5289 2.38425 10.9805 2.44875C11.432 2.51326 11.8755 2.61002 12.3109 2.73903L13.0664 1.98358C12.5044 1.77151 11.9325 1.61863 11.3508 1.52494C10.769 1.43124 10.1859 1.38439 9.60163 1.38439C7.50146 1.38439 5.58053 1.96157 3.83885 3.11591C2.09717 4.2701 0.817604 5.78939 0.000143051 7.67379C0.34622 8.45158 0.78438 9.18252 1.31462 9.86661C1.84503 10.5509 2.47615 11.1808 3.20798 11.7563ZM2.12886 17L5.895 13.245C6.323 13.4348 6.85421 13.602 7.48864 13.7464C8.12322 13.8909 8.82755 13.9632 9.60163 13.9632C11.7142 13.9632 13.6352 13.386 15.3644 12.2317C17.0937 11.0775 18.3732 9.55819 19.2031 7.67379C18.8274 6.81908 18.3318 6.01863 17.7164 5.27245C17.1012 4.52627 16.4443 3.90015 15.7459 3.3941L18.444 0.684819L17.7592 0L1.44404 16.3152L2.12886 17ZM15.0611 4.07867C15.6157 4.47329 16.1826 4.99185 16.7619 5.63433C17.3411 6.27698 17.7927 6.9568 18.1165 7.67379C17.3102 9.30258 16.1531 10.5967 14.6452 11.5563C13.1374 12.5158 11.4562 12.9956 9.60163 12.9956C9.04333 12.9956 8.48075 12.9413 7.9139 12.8328C7.34704 12.7243 6.9209 12.6148 6.63546 12.5043L8.21361 10.9152C8.36617 11.0009 8.57888 11.0713 8.85174 11.1264C9.12461 11.1816 9.37457 11.2092 9.60163 11.2092C10.5878 11.2092 11.4235 10.8665 12.1089 10.1811C12.7943 9.4957 13.137 8.65994 13.137 7.67379C13.137 7.45915 13.1094 7.21846 13.0543 6.95172C12.9991 6.68515 12.9287 6.46316 12.8431 6.28577L15.0611 4.07867Z" fill="#262626"/>
</svg>`;

  if (eyeIcon) {
    eyeIcon.addEventListener('click', () => {
      password.type = password.type === 'password' ? 'text' : 'password';
      eyeIcon.innerHTML = password.type === 'password' ? EYE_OPEN_SVG : EYE_CLOSED_SVG;
    });
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

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
      localStorage.setItem('user', JSON.stringify(response.user));

      const currentOnboardingStep = response.onboardingProgress?.current_step;
      const onboardingIsComplete = response.onboardingProgress?.is_complete;

      // Handle onboarding flow
      if (!response.onboardingProgress) {
        navigateToPath('/onboarding-step-1');
        return;
      }
      if (!onboardingIsComplete && currentOnboardingStep === 1) {
        navigateToPath('/onboarding-step-1');
        return;
      }
      if (!onboardingIsComplete && currentOnboardingStep === 2) {
        navigateToPath('/onboarding-step-2');
        return;
      }
      if (!onboardingIsComplete && currentOnboardingStep === 3) {
        navigateToPath('/onboarding-step-3');
        return;
      }

      const nextFinancialWizardStep = getNextFinancialWizardStep(response.financialWizardProgress);
      if (nextFinancialWizardStep) {
        navigateToPath(nextFinancialWizardStep);
      } else {
        navigateToPath('/team-members');
        return;
      }
    } catch (error) {
      const { message } = error as AxiosError;
      const { code } = (error as AxiosError).response?.data as { code: string };

      if (code === 'AUTH_INVALID_CREDENTIALS') {
        submitButton.classList.add('is-error');
        submitButton.value = message;

        const recoverAccountDiv = queryElement<HTMLDivElement>(
          '[dev-target="recover-account"]',
          form
        );
        if (!recoverAccountDiv) {
          console.error(
            'Recover account div not found. Element: [dev-target="recover-account"] not found'
          );
          return;
        }
        recoverAccountDiv.classList.remove('hide');
      }
    }
  });
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    initLoginPage();
  } catch (error) {
    console.error(error);
  }
});
