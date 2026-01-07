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

  //collapsible navbar functionality
  const collapsileTrigger = queryElement<HTMLElement>('[dev-target="collapsible-trigger"]');
  if (!collapsileTrigger) {
    console.error('Ensure [dev-target="collapsible-trigger"] is present.');
    return;
  }
  collapsileTrigger.addEventListener('click', () => {
    sidebarMenu.classList.toggle('is-collapsed');
    Object.assign(sidebarMenu.style, {
      width: sidebarMenu.classList.contains('is-collapsed') ? '60px' : 'auto',
    });
    //hide all elements with sidebar="collapsible-content"
    const collapsibleContents = document.querySelectorAll('[sidebar="collapsible-content"]');
    collapsibleContents.forEach((element) => {
      (element as HTMLElement).style.display = 'none';
    });
  });
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

/**
 * Initialize collapsible sidebar functionality
 * Handles sidebar collapse/expand with smooth transitions and content adjustment
 */
export const initCollapsibleSidebar = () => {
  const sidebar = queryElement<HTMLElement>('[dev-target="sidebar-menu"]');
  const trigger = queryElement<HTMLElement>('[dev-target="collapsible-trigger"]');
  const mainContent = document.querySelector<HTMLElement>('.main-content');

  if (!sidebar || !trigger) {
    console.error(
      'Ensure [dev-target="sidebar-menu"] and [dev-target="collapsible-trigger"] are present.'
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
    const sidebarInner = sidebar.querySelector<HTMLElement>('.sidebar');
    const sidebarLogo = queryElement<HTMLElement>('[dev-target="sidebar-logo"]');
    const sidebarlogoTextWrapper = queryElement<HTMLElement>(
      '[dev-target="sidebar-logo-text-wrapper"]'
    );
    const sidebarBottomCollapsed = sidebar.querySelector<HTMLElement>(
      '[dev-target="sidebar-bottom-collapsed"]'
    );
    const sidebarBottom = sidebar.querySelector<HTMLElement>('[dev-target="sidebar-bottom"]');

    const sidenavClose = sidebar.querySelector<HTMLElement>('.sidenav-close');
    const userProfile = sidebar.querySelector<HTMLElement>('.user-profile_wrapper');
    const userProfileInner = userProfile?.querySelector<HTMLElement>(
      '.flex-horizontal_auth.gap-15'
    );

    if (isCollapsed) {
      sidebar.classList.add('collapsed');

      // Add collapsed classes
      sidebarInner?.classList.add('mobile');
      sidebarLogo?.classList.add('is-collapse');
      sidebarlogoTextWrapper?.classList.add('is-collapse');
      sidenavClose?.classList.add('is-collapse');
      userProfile?.classList.add('image-overlay');
      userProfileInner?.classList.add('overlay');

      sidebarBottom?.classList.add('hide');
      sidebarBottomCollapsed?.classList.remove('hide');

      // Hide collapsible content with fade out
      collapsibleContent.forEach((el) => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.2s ease';
        setTimeout(() => {
          el.style.display = 'none';
        }, 200);
      });

      // Adjust sidebar width
      sidebar.style.width = '80px';

      // Adjust main content margin if it exists
      if (mainContent) {
        mainContent.style.marginLeft = '80px';
        mainContent.style.width = 'calc(100% - 80px)';
      }
    } else {
      sidebar.classList.remove('collapsed');

      // Remove collapsed classes
      sidebarInner?.classList.remove('mobile');
      sidebarLogo?.classList.remove('is-collapse');
      sidebarlogoTextWrapper?.classList.remove('is-collapse');
      sidenavClose?.classList.remove('is-collapse');
      userProfile?.classList.remove('image-overlay');
      userProfileInner?.classList.remove('overlay');

      sidebarBottom?.classList.remove('hide');
      sidebarBottomCollapsed?.classList.add('hide');

      // Show collapsible content with fade in
      collapsibleContent.forEach((el) => {
        el.style.display = '';
        setTimeout(() => {
          el.style.opacity = '1';
        }, 10);
      });

      // Adjust sidebar width
      //sidebar.style.width = '280px';

      // Adjust main content margin if it exists
      if (mainContent) {
        mainContent.style.marginLeft = '280px';
        mainContent.style.width = 'calc(100% - 280px)';
      }
    }
  };

  // Add click event to trigger
  trigger.addEventListener('click', toggleSidebar);

  // Handle accordion submenu toggles
  const navItems = document.querySelectorAll('[dev-target="sidebar-nav"]');
  navItems.forEach((nav) => {
    const header = nav.querySelector<HTMLElement>('.is-sidebar-nav');
    const submenu = nav.querySelector<HTMLElement>('.is-submenu');
    const arrowWrapper = nav.querySelector<HTMLElement>('.sidebar-accordion_icon_wrapper');

    if (header && submenu) {
      header.style.cursor = 'pointer';

      header.addEventListener('click', () => {
        // Only allow accordion when sidebar is expanded
        if (!isCollapsed) {
          const isOpen = submenu.classList.contains('open');

          // Close all other submenus
          navItems.forEach((otherNav) => {
            const otherSubmenu = otherNav.querySelector<HTMLElement>('.is-submenu');
            const otherArrow = otherNav.querySelector<HTMLElement>(
              '.sidebar-accordion_icon_wrapper'
            );
            if (otherSubmenu && otherSubmenu !== submenu) {
              otherSubmenu.classList.remove('open');
              //otherSubmenu.style.maxHeight = '0';
              if (otherArrow) {
                otherArrow.style.transform = 'rotate(0deg)';
              }
            }
          });

          // Toggle current submenu
          if (isOpen) {
            submenu.classList.remove('open');
            //submenu.style.maxHeight = '0';
            if (arrowWrapper) {
              arrowWrapper.style.transform = 'rotate(0deg)';
            }
          } else {
            submenu.classList.add('open');
            submenu.style.maxHeight = '500px';
            if (arrowWrapper) {
              arrowWrapper.style.transform = 'rotate(180deg)';
            }
          }
        }
      });

      // Initialize styles
      //submenu.style.maxHeight = '0';
      submenu.style.overflow = 'hidden';
      submenu.style.transition = 'max-height 0.3s ease';

      if (arrowWrapper) {
        arrowWrapper.style.transition = 'transform 0.3s ease';
      }
    }
  });

  // Add transition styles to sidebar
  sidebar.style.transition = 'width 0.3s ease';

  if (mainContent) {
    mainContent.style.transition = 'margin-left 0.3s ease, width 0.3s ease';
  }
};
