import { apiGetFinancialProgress } from 'shared/services/FinancialWizardService';

import { logoutUser } from './auth';
import { queryElement } from './selectors';

export const isValidEmail = (email: string) => {
  if (!email) {
    return false;
  }
  //check if email is valid regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }
  return true;
};

export const progressFinancialWizardPercentage = async () => {
  try {
    //get progress percentage
    const response = await apiGetFinancialProgress();

    const percentage = response?.percentage || 0;
    const progressFill = queryElement<HTMLDivElement>('[dev-target="progress-percentage-fill"]');
    const progressLabel = queryElement<HTMLDivElement>('[dev-target="progress-percentage-label"]');
    const logout = queryElement<HTMLButtonElement>('[dev-target="logout"]');
    if (!progressFill || !progressLabel || !logout) {
      console.error(
        'Ensure [dev-target="progress-percentage-fill"], [dev-target="progress-percentage-label"], and [dev-target="logout"] are present.'
      );
      return;
    }
    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `Progress ${percentage}%`;
    logout.addEventListener('click', () => {
      logoutUser();
    });
    return response;
  } catch (error) {
    console.error('Failed to load financial wizard progress:', error);
  }
};

export const constructNavBarClasses = () => {
  const sidebarMenu = queryElement<HTMLElement>('[dev-target="sidebar-menu"]');
  if (!sidebarMenu) {
    console.error('Ensure [dev-target="sidebar-menu"] is present.');
    return;
  }

  // Get current route
  const currentPath = window.location.pathname;

  // Map routes to dev-target attributes
  const routeMap: Record<string, string> = {
    '/dev/finance-company-profile': 'nav-company-profile-link',
    '/finance-company-profile': 'nav-company-profile-link',
    '/dev/finance-financial-overview': 'nav-financial-overview-link',
    '/finance-financial-overview': 'nav-financial-overview-link',
    '/dev/finance-docs-financial-reports': 'nav-financial-reports-link',
    '/finance-docs-financial-reports': 'nav-financial-reports-link',
    '/dev/finance-docs-accounts-and-inventory': 'nav-accounts-inventory-link',
    '/finance-docs-accounts-and-inventory': 'nav-accounts-inventory-link',
    '/dev/finance-docs-ecommerce-performance': 'nav-eccomerce-performance-link',
    '/finance-docs-ecommerce-performance': 'nav-eccomerce-performance-link',
    '/dev/finance-docs-team-and-ownership': 'nav-team-ownership-link',
    '/finance-docs-team-and-ownership': 'nav-team-ownership-link',
  };

  // Find the matching dev-target for current route
  const activeTarget = routeMap[currentPath];
  console.log('activeTarget', activeTarget);

  if (activeTarget) {
    // Remove is-active class from all nav links
    const allNavLinks = document.querySelectorAll('[dev-attr="nav"]');
    allNavLinks.forEach((link) => {
      link.classList.remove('is-active');
    });

    // Add is-active class to the current route's link
    const activeLink = queryElement<HTMLElement>(`[dev-target="${activeTarget}"]`);
    if (activeLink) {
      activeLink.classList.add('is-active');
    }
  }
};
