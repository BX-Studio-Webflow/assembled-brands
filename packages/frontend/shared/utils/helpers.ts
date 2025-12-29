import { apiGetUserMe } from 'shared/services/AuthService';
import { apiGetFinancialProgress } from 'shared/services/FinancialWizardService';
import { apiGetMyTeams } from 'shared/services/TeamService';

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
    const [financialProgress, person, teams] = await Promise.all([
      apiGetFinancialProgress(),
      apiGetUserMe(),
      apiGetMyTeams(),
    ]);

    console.table(teams);

    const percentage = financialProgress?.percentage || 0;
    const progressFill = queryElement<HTMLDivElement>('[dev-target="progress-percentage-fill"]');
    const progressLabel = queryElement<HTMLDivElement>('[dev-target="progress-percentage-label"]');

    const companyUsername = queryElement<HTMLDivElement>('[dev-target="user-name"]');
    const companyEmail = queryElement<HTMLDivElement>('[dev-target="user-email"]');

    const logout = queryElement<HTMLButtonElement>('[dev-target="logout"]');
    if (!progressFill || !progressLabel || !logout || !companyUsername || !companyEmail) {
      console.error(
        'Ensure [dev-target="progress-percentage-fill"], [dev-target="progress-percentage-label"], [dev-target="user-name"], [dev-target="user-email"], and [dev-target="logout"] are present.'
      );
      return;
    }

    progressFill.style.width = `${percentage}%`;
    progressLabel.textContent = `Progress ${percentage}%`;

    logout.addEventListener('click', () => {
      logoutUser();
    });

    companyUsername.innerText =
      financialProgress.business?.legal_name ||
      (person.first_name || 'Full') + ' ' + (person.last_name || 'Name');
    companyEmail.innerText =
      financialProgress.business?.email || person.email || 'hello@company.com';

    return financialProgress;
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
  type RouteMap = {
    [key: string]: {
      nav_attr: string;
      nav_class: string;
    };
  };
  const routeMap: RouteMap = {
    '/dev/finance-company-profile': {
      nav_attr: 'nav-company-profile-link',
      nav_class: 'is-active',
    },
    '/finance-company-profile': {
      nav_attr: 'nav-company-profile-link',
      nav_class: 'is-active',
    },
    '/dev/finance-financial-overview': {
      nav_attr: 'nav-financial-overview-link',
      nav_class: 'is-active',
    },
    '/finance-financial-overview': {
      nav_attr: 'nav-financial-overview-link',
      nav_class: 'is-active',
    },
    '/dev/finance-docs-financial-reports': {
      nav_attr: 'nav-financial-reports-link',
      nav_class: 'is-active-financial',
    },
    '/finance-docs-financial-reports': {
      nav_attr: 'nav-financial-reports-link',
      nav_class: 'is-active-financial',
    },
    '/dev/finance-docs-accounts-and-inventory': {
      nav_attr: 'nav-accounts-inventory-link',
      nav_class: 'is-active-financial',
    },
    '/finance-docs-accounts-and-inventory': {
      nav_attr: 'nav-accounts-inventory-link',
      nav_class: 'is-active-financial',
    },
    '/dev/finance-docs-ecommerce-performance': {
      nav_attr: 'nav-eccomerce-performance-link',
      nav_class: 'is-active-financial',
    },
    '/finance-docs-ecommerce-performance': {
      nav_attr: 'nav-eccomerce-performance-link',
      nav_class: 'is-active-financial',
    },
    '/dev/finance-docs-team-and-ownership': {
      nav_attr: 'nav-team-ownership-link',
      nav_class: 'is-active-financial',
    },
    '/finance-docs-team-and-ownership': {
      nav_attr: 'nav-team-ownership-link',
      nav_class: 'is-active-financial',
    },
  };

  // Find the matching dev-target for current route
  const activeTarget = routeMap[currentPath];

  if (activeTarget) {
    // Remove is-active class from all nav links
    const allNavLinks = document.querySelectorAll('[dev-attr="nav"]');
    allNavLinks.forEach((link) => {
      link.classList.remove('is-active');
      link.classList.remove('is-active-financial');
    });

    // Add is-active class to the current route's link
    const activeLink = queryElement<HTMLElement>(`[dev-target="${activeTarget.nav_attr}"]`);
    if (activeLink) {
      activeLink.classList.add(activeTarget.nav_class);
    }
  }
};

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const parts = result.split(',');
      resolve(parts.length > 1 ? parts[1] : parts[0]);
    };
    reader.onerror = () => reject(new Error('Failed to read file as base64'));
    reader.readAsDataURL(file);
  });
