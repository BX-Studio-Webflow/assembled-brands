import { apiGetUserMe } from 'shared/services/AuthService';
import {
  apiAdminGetApplications,
  apiGetFinancialProgress,
} from 'shared/services/FinancialWizardService';
import { apiGetMyTeams } from 'shared/services/TeamService';

import { isAdmin, logoutUser } from './auth';
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

export const checkProgressUserAndTeams = async (userId?: string) => {
  try {
    //get progress percentage
    const [financialProgress, user, teams] = await Promise.all([
      apiGetFinancialProgress(userId),
      apiGetUserMe(),
      apiGetMyTeams(),
    ]);

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
      (user.first_name || 'Full') + ' ' + (user.last_name || 'Name');
    companyEmail.innerText = financialProgress.business?.email || user.email || 'hello@company.com';

    return { financialProgress, user, teams };
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
    '/team-members': {
      nav_attr: 'nav-team-ownership-link',
      nav_class: 'is-active-financial',
    },
  };

  // Find the matching dev-target for current route
  const activeTarget = routeMap[currentPath];
  const allNavLinks = document.querySelectorAll('[dev-attr="nav"]');

  if (activeTarget) {
    allNavLinks.forEach((link) => {
      link.classList.remove('is-active');
      link.classList.remove('is-active-financial');
    });

    // Add is-active class to the current route's link
    const activeLink = queryElement<HTMLElement>(`[dev-target="${activeTarget.nav_attr}"]`);
    if (activeLink) {
      activeLink.classList.add(activeTarget.nav_class);
    }
  } else {
    allNavLinks.forEach((link) => {
      link.classList.remove('is-active');
      link.classList.remove('is-active-financial');
    });
  }
};

export const constructAdminSelect = async (
  onChangeCallback?: (userId: string) => void | Promise<void>
) => {
  const admin = isAdmin();

  if (admin) {
    const selectWrapper = queryElement<HTMLElement>('[dev-target="admin-select-wrapper"]');
    const select = queryElement<HTMLElement>('[dev-target="admin-select"]');
    selectWrapper?.classList.remove('hide');

    if (!selectWrapper || !select) {
      console.error(
        'Ensure [dev-target="admin-select"] and  [dev-target="admin-select-wrapper"] is present.'
      );
      return;
    }

    const applications = await apiAdminGetApplications();
    select.innerHTML = '';
    // Render options
    applications.forEach((app) => {
      const name = app.first_name || '' + app.last_name || '';
      const option = document.createElement('option');
      option.value = app.id.toString();
      option.textContent = `${name || app.email}`;
      select.appendChild(option);
    });

    select.addEventListener('change', async (e) => {
      const target = e.target as HTMLSelectElement;
      const { value } = target;
      console.log(value);

      if (onChangeCallback) {
        await onChangeCallback(value);
      }
    });
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
