import { apiGetUserMe } from 'shared/services/AuthService';
import {
  apiAdminGetApplications,
  apiGetFinancialProgress,
} from 'shared/services/FinancialWizardService';
import { apiGetOnboardingProgress } from 'shared/services/OnboardingService';
import { apiGetMyTeams } from 'shared/services/TeamService';

import { isAdmin, logoutUser } from './auth';
import { queryAllElements, queryElement } from './selectors';

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
  '/invite-team-members': {
    nav_attr: 'nav-team-member-link',
    nav_class: 'is-active-financial',
  },
  '/dev/invite-team-members': {
    nav_attr: 'nav-team-member-link',
    nav_class: 'is-active-financial',
  },
};

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

export const fetchProgressData = async (userId?: string) => {
  const [financialProgress, user, teams, onboardingProgress] = await Promise.all([
    apiGetFinancialProgress(userId),
    apiGetUserMe(),
    apiGetMyTeams(),
    apiGetOnboardingProgress(),
  ]);

  return { financialProgress, user, teams, onboardingProgress };
};

export const checkProgressUserAndTeams = async (userId?: string) => {
  try {
    //get progress percentage
    const { financialProgress, user, teams, onboardingProgress } = await fetchProgressData(userId);

    const percentage = financialProgress?.percentage || 0;
    const progressFill = queryElement<HTMLDivElement>('[dev-target="progress-percentage-fill"]');
    const progressLabel = queryAllElements<HTMLDivElement>(
      '[dev-target="progress-percentage-label"]'
    );

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
    progressLabel[0].textContent = `Progress ${percentage}%`;
    progressLabel[1].textContent = `${percentage}%`;

    logout.addEventListener('click', () => {
      logoutUser();
    });

    companyUsername.innerText =
      financialProgress.business?.legal_name ||
      (user.first_name || 'Full') + ' ' + (user.last_name || 'Name');
    companyEmail.innerText = financialProgress.business?.email || user.email || 'hello@company.com';

    return { financialProgress, user, teams, onboardingProgress };
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

  const currentPath = window.location.pathname;
  const isWarmPath = currentPath.startsWith('/dev/warm/') || currentPath.startsWith('/warm/');

  const normalizeRoutePath = (path: string) =>
    path.replace(/^\/dev\/warm\//, '/dev/').replace(/^\/warm\//, '/');

  const activeTarget = routeMap[normalizeRoutePath(currentPath)];

  const allNavLinks = document.querySelectorAll<HTMLElement>('[dev-attr="nav"]');

  const warmNavConfig: Record<string, { href: string; isVisible: boolean }> = {
    'nav-company-profile-link': { href: '/dev/warm/onboarding-warm-lead', isVisible: true },
    'nav-financial-overview-link': {
      href: '/dev/warm/finance-financial-overview',
      isVisible: false,
    },
    'nav-financial-reports-link': {
      href: '/dev/warm/finance-docs-financial-report',
      isVisible: true,
    },
    'nav-accounts-inventory-link': {
      href: '/dev/warm/finance-docs-accounts-and-inventory',
      isVisible: true,
    },
    'nav-eccomerce-performance-link': {
      href: '/dev/warm/finance-docs-ecommerce-performance',
      isVisible: true,
    },
    'nav-team-ownership-link': {
      href: '/dev/warm/finance-docs-team-and-ownership',
      isVisible: true,
    },
    'nav-team-member-link': { href: '/dev/warm/invite-team-members', isVisible: true },
  };

  allNavLinks.forEach((link) => {
    const target = link.getAttribute('dev-target');
    if (!target) return;

    if (isWarmPath) {
      const warmEntry = warmNavConfig[target];
      if (warmEntry) {
        link.setAttribute('href', warmEntry.href);
        link.classList.toggle('hide', !warmEntry.isVisible);
      } else {
        const existingHref = link.getAttribute('href');
        if (existingHref?.startsWith('/dev/')) {
          link.setAttribute('href', existingHref.replace('/dev/', '/dev/warm/'));
        } else if (existingHref?.startsWith('/')) {
          link.setAttribute('href', `/dev/warm${existingHref}`);
        }
      }
      return;
    }

    // Restore visibility when not in warm-lead flow.
    link.classList.remove('hide');
  });

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

export const constructModalFunctionality = () => {
  const modalWrapper = queryElement<HTMLElement>('[dev-target="modal-wrapper"]');
  const modalImage = queryElement<HTMLImageElement>('[dev-target="modal-image"]');
  const modalClose = queryElement<HTMLElement>('[dev-target="close-button"]');
  const modalTitle = queryElement<HTMLElement>('[dev-target="modal-title"]');

  if (!modalClose) {
    console.error('Ensure [dev-target="close-button"] is present.');
    return;
  }
  if (!modalTitle) {
    console.error('Ensure [dev-target="modal-title"] is present.');
    return;
  }

  if (!modalWrapper) {
    console.error('Ensure [dev-target="modal-wrapper"] is present.');
    return;
  }
  if (!modalImage) {
    console.error('Ensure [dev-target="modal-image"] is present.');
    return;
  }

  const { pathname } = window.location;
  modalClose.addEventListener('click', () => {
    modalWrapper.classList.add('hide');
  });

  // Modal data configuration
  const modalData = {
    'monthly-balance-sheet': {
      title: 'Monthly Balance Sheets ** Last 2 years of monthly balance sheets',
      imageUrl:
        'https://cdn.prod.website-files.com/66624bc26087f29222853df8/6975e8a978e87571b90a51a0_image%204.png',
    },
    'monthly-income-statement': {
      title: 'Monthly Income Statements ** Last 2 years of monthly income statements',
      imageUrl:
        'https://cdn.prod.website-files.com/66624bc26087f29222853df8/6975e8a978e87571b90a51a0_image%204.png',
    },
    'monthly-income-forecast': {
      title: 'Monthly Income Forecast ** 12-month income forecast projection',
      imageUrl:
        'https://cdn.prod.website-files.com/66624bc26087f29222853df8/6975e8a978e87571b90a51a0_image%204.png',
    },
    'monthly-inventory-reports': {
      title:
        'Monthly Inventory Reports ** Please provide inventory reports for at least the last 24 months, or longer if possible',
      imageUrl:
        'https://cdn.prod.website-files.com/66624bc26087f29222853df8/6975e8a978e87571b90a51a0_image%204.png',
    },
    'ar-aging-reports': {
      title:
        'Accounts Receivable Aging Reports ** Please provide AR aging reports for the last 24 months, or longer if available',
      imageUrl:
        'https://cdn.prod.website-files.com/66624bc26087f29222853df8/6975e8a978e87571b90a51a0_image%204.png',
    },
    'ap-aging-reports': {
      title:
        'Accounts Payable Aging Report ** Please provide the accounts payable aging report for the next 24 months, or longer if possible',
      imageUrl:
        'https://cdn.prod.website-files.com/66624bc26087f29222853df8/6975e8a978e87571b90a51a0_image%204.png',
    },
    'repeat-customer-reports': {
      title:
        'Shopify Repeat Customer Reports ** Please provide reports on repeat customers for at least the last 24 months, or longer if possible',
      imageUrl:
        'https://cdn.prod.website-files.com/66624bc26087f29222853df8/6975e8a978e87571b90a51a0_image%204.png',
    },
    'monthly-sales-reports': {
      title:
        'Shopify Monthly Sales Reports ** Please provide monthly sales reports from Shopify for the last 24 months, or longer if available',
      imageUrl:
        'https://cdn.prod.website-files.com/66624bc26087f29222853df8/6975e8a978e87571b90a51a0_image%204.png',
    },
    'management-bios': {
      title: 'Management Bios ** Please upload the management bios for our team',
      imageUrl:
        'https://cdn.prod.website-files.com/66624bc26087f29222853df8/6975e8a978e87571b90a51a0_image%204.png',
    },
    'investor-deck': {
      title: 'Investor Deck ** Please provide the most recent investor deck',
      imageUrl:
        'https://cdn.prod.website-files.com/66624bc26087f29222853df8/6975e8a978e87571b90a51a0_image%204.png',
    },
    'cap-table': {
      title: 'Capitalization Table ** Please provide the most recent capitalization table',
      imageUrl:
        'https://cdn.prod.website-files.com/66624bc26087f29222853df8/6975e8a978e87571b90a51a0_image%204.png',
    },
  };

  // Helper function to show modal with data
  const showModal = (key: keyof typeof modalData) => {
    const data = modalData[key];
    modalWrapper.classList.toggle('hide');
    modalImage.src = data.imageUrl;
    modalTitle.textContent = data.title;
  };

  // Financial Reports Page
  if (
    pathname.includes('/dev/finance-docs-financial-reports') ||
    pathname.includes('/finance-docs-financial-reports')
  ) {
    const monthly_balance_sheet = queryElement<HTMLElement>('[dev-target="monthly-balance-sheet"]');
    const monthly_income_statement = queryElement<HTMLElement>(
      '[dev-target="monthly-income-statement"]'
    );
    const monthly_income_forecast = queryElement<HTMLElement>(
      '[dev-target="monthly-income-forecast"]'
    );

    monthly_balance_sheet?.addEventListener('click', () => showModal('monthly-balance-sheet'));
    monthly_income_statement?.addEventListener('click', () =>
      showModal('monthly-income-statement')
    );
    monthly_income_forecast?.addEventListener('click', () => showModal('monthly-income-forecast'));
  }

  // Accounts and Inventory Page
  if (
    pathname.includes('/dev/finance-docs-accounts-and-inventory') ||
    pathname.includes('/finance-docs-accounts-and-inventory')
  ) {
    const monthly_inventory_reports = queryElement<HTMLElement>(
      '[dev-target="monthly-inventory-reports"]'
    );
    const ar_aging_reports = queryElement<HTMLElement>('[dev-target="ar-aging-reports"]');
    const ap_aging_reports = queryElement<HTMLElement>('[dev-target="ap-aging-reports"]');

    monthly_inventory_reports?.addEventListener('click', () =>
      showModal('monthly-inventory-reports')
    );
    ar_aging_reports?.addEventListener('click', () => showModal('ar-aging-reports'));
    ap_aging_reports?.addEventListener('click', () => showModal('ap-aging-reports'));
  }

  // E-Commerce Performance Page
  if (
    pathname.includes('/dev/finance-docs-ecommerce-performance') ||
    pathname.includes('/finance-docs-ecommerce-performance')
  ) {
    const repeat_customer_reports = queryElement<HTMLElement>(
      '[dev-target="repeat-customer-reports"]'
    );
    const monthly_sales_reports = queryElement<HTMLElement>('[dev-target="monthly-sales-reports"]');

    repeat_customer_reports?.addEventListener('click', () => showModal('repeat-customer-reports'));
    monthly_sales_reports?.addEventListener('click', () => showModal('monthly-sales-reports'));
  }

  // Team & Ownership Page
  if (
    pathname.includes('/dev/finance-docs-team-and-ownership') ||
    pathname.includes('/finance-docs-team-and-ownership')
  ) {
    const management_bios = queryElement<HTMLElement>('[dev-target="management-bios"]');
    const investor_deck = queryElement<HTMLElement>('[dev-target="investor-deck"]');
    const cap_table = queryElement<HTMLElement>('[dev-target="cap-table"]');

    management_bios?.addEventListener('click', () => showModal('management-bios'));
    investor_deck?.addEventListener('click', () => showModal('investor-deck'));
    cap_table?.addEventListener('click', () => showModal('cap-table'));
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

/**
 * Initialize collapsible sidebar functionality
 * Handles sidebar collapse/expand with smooth transitions and content adjustment
 */
export const initCollapsibleSidebar = () => {
  const sidebar = queryElement<HTMLElement>('[dev-target="sidebar-menu"]');
  const sidebarInner = sidebar?.querySelector<HTMLElement>('.sidebar');
  const trigger = queryElement<HTMLElement>('[dev-target="collapsible-trigger"]');

  if (!sidebar || !sidebarInner || !trigger) {
    console.error(
      'Ensure [dev-target="sidebar-menu"] and [dev-target="collapsible-trigger"] and  [dev-target="sidebar-inner"] are present.'
    );
    return;
  }

  let isCollapsed = false;

  // Toggle sidebar collapse/expand
  const toggleSidebar = () => {
    isCollapsed = !isCollapsed;
    const collapsibleContent = document.querySelectorAll<HTMLElement>(
      '[sidebar="collapsible-content"], [dev-target="collapsible-content"]'
    );

    // Get sidebar-related elements for class toggling

    const sidebarlogoTextWrapper = queryElement<HTMLElement>(
      '[dev-target="sidebar-logo-text-wrapper"]'
    );
    const sidebarBottomCollapsed = sidebar.querySelector<HTMLElement>(
      '[dev-target="sidebar-bottom-collapsed"]'
    );
    const sideNavClose = sidebar.querySelector<HTMLElement>('[dev-target="sidenav-close"]');
    const sidebarBottom = sidebar.querySelector<HTMLElement>('[dev-target="sidebar-bottom"]');

    const userProfile = sidebar.querySelector<HTMLElement>('.user-profile_wrapper');
    const userProfileInner = userProfile?.querySelector<HTMLElement>(
      '.flex-horizontal_auth.gap-15'
    );

    if (isCollapsed) {
      sidebar.classList.add('collapsed');

      // Add collapsed classes
      sidebarInner?.classList.add('mobile');
      sidebarlogoTextWrapper?.classList.add('hide');

      userProfile?.classList.add('image-overlay');
      userProfileInner?.classList.add('overlay');

      sidebarBottom?.classList.add('hide');
      sidebarBottomCollapsed?.classList.remove('hide');

      sideNavClose?.classList.add('is-collapsed');

      // Hide collapsible content with fade out
      collapsibleContent.forEach((el) => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.2s ease';
        setTimeout(() => {
          el.classList.add('hide');
        }, 200);
      });

      // Adjust sidebar width
      sidebar.style.width = '80px';
      sidebar.style.width = 'auto';
    } else {
      sidebar.classList.remove('collapsed');

      // Remove collapsed classes
      sidebarInner?.classList.remove('mobile');
      sidebarlogoTextWrapper?.classList.remove('hide');

      userProfile?.classList.remove('image-overlay');
      userProfileInner?.classList.remove('overlay');

      sidebarBottom?.classList.remove('hide');
      sidebarBottomCollapsed?.classList.add('hide');

      sideNavClose?.classList.remove('is-collapsed');

      // Show collapsible content with fade in
      collapsibleContent.forEach((el) => {
        el.classList.remove('hide');
        setTimeout(() => {
          el.style.opacity = '1';
        }, 10);
      });
    }
  };

  // Add click event to trigger
  trigger.addEventListener('click', toggleSidebar);

  // Add transition styles to sidebar
  sidebar.style.transition = 'width 0.3s ease';
};
