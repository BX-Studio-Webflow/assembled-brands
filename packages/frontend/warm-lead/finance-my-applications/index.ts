import type { AxiosError } from 'axios';
import { apiGetMyDealApplications } from 'shared/services/DealApplicationService';
import { apiGetFinancialProgress } from 'shared/services/FinancialWizardService';
import { apiGetOnboardingProgress } from 'shared/services/OnboardingService';
import type { DealApplicationSummary } from 'shared/types/deal-application';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import {
  constructNavBarClasses,
  initCollapsibleSidebar,
  resolveWarmDealApplicationPath,
} from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const formatDealApplicationStatus = (status: DealApplicationSummary['status']) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'submitted':
      return 'Submitted';
    case 'archived':
      return 'Archived';
    case 'superseded':
      return 'Superseded';
    default:
      return status;
  }
};

const formatTimestamp = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const populateApplicationRow = (row: HTMLTableRowElement, application: DealApplicationSummary) => {
  const dealNameCell = queryElement<HTMLTableCellElement>('[dev-target="deal-name"]', row);
  const statusCell = queryElement<HTMLTableCellElement>('[dev-target="status"]', row);
  const createdAtCell = queryElement<HTMLTableCellElement>('[dev-target="created-at"]', row);
  const updatedAtCell = queryElement<HTMLTableCellElement>('[dev-target="updated-at"]', row);

  if (dealNameCell) {
    dealNameCell.textContent = application.legal_name?.trim() || `Application ${application.id}`;
  }
  if (statusCell) {
    statusCell.textContent = formatDealApplicationStatus(application.status);
  }
  if (createdAtCell) {
    createdAtCell.textContent = formatTimestamp(application.created_at);
  }
  if (updatedAtCell) {
    updatedAtCell.textContent = formatTimestamp(application.updated_at);
  }

  row.dataset.dealId = String(application.deal_id);
  row.style.cursor = 'pointer';

  row.querySelectorAll('a[href]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
    });
  });
};

const openApplication = async (dealId: number) => {
  // Team members keep their own session + X-Team-Id; the deal scope travels via the X-Deal-Id header.
  // No session/token swap — the member acts as themselves while the backend authorizes access to the
  // host's deal application.
  localStorage.setItem('x-deal-id', String(dealId));

  const [onboardingResult, financialResult] = await Promise.allSettled([
    apiGetOnboardingProgress(),
    apiGetFinancialProgress(),
  ]);

  const onboardingProgress =
    onboardingResult.status === 'fulfilled' ? onboardingResult.value.progress : null;
  const financialWizardProgress =
    financialResult.status === 'fulfilled' ? financialResult.value : null;

  const legalName =
    onboardingProgress?.progress_data?.legal_name ?? onboardingProgress?.step1?.legal_name ?? null;

  navigateToPath(
    resolveWarmDealApplicationPath(dealId, { legal_name: legalName }, financialWizardProgress)
  );
};

const initFinanceMyApplicationsPage = async () => {
  constructNavBarClasses();
  processMiddleware();
  initCollapsibleSidebar();

  const tableWrapper = document.querySelector('[dev-target="member-table-wrapper"]');
  if (!tableWrapper) {
    console.error('Applications table wrapper not found: [dev-target="member-table-wrapper"]');
    return;
  }

  const table = tableWrapper.querySelector('[fs-table-element="table"]');
  const tableBody = table?.querySelector('.fs-table_body');
  const templateRow = tableBody?.querySelector(
    '[dev-target="table-row"]'
  ) as HTMLTableRowElement | null;
  const newApplicationLink = queryElement<HTMLAnchorElement>(
    '[dev-target="invite-another-member"]',
    tableWrapper
  );

  if (!tableBody || !templateRow) {
    console.error('Applications table body or template row not found');
    return;
  }

  if (newApplicationLink) {
    newApplicationLink.closest('.flex-horizontal')?.classList.add('hide');
  }

  const bindRowClick = (row: HTMLTableRowElement) => {
    row.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const dealId = Number.parseInt(row.dataset.dealId || '', 10);
      if (!Number.isFinite(dealId)) return;

      try {
        await openApplication(dealId);
      } catch (error) {
        console.error('Failed to open application:', error);
        const { message } = error as AxiosError;
        window.alert(message || 'Unable to open this application. Please try again.');
      }
    });
  };

  const renderApplications = (applications: DealApplicationSummary[]) => {
    const existingRows = Array.from(tableBody.querySelectorAll('[dev-target="table-row"]'));
    existingRows.slice(1).forEach((row) => row.remove());

    if (applications.length === 0) {
      templateRow.style.display = '';
      populateApplicationRow(templateRow, {
        id: 0,
        deal_id: 0,
        legal_name: 'No applications yet',
        application_link: null,
        status: 'active',
        created_at: null,
        updated_at: null,
      });
      templateRow.style.cursor = 'default';
      delete templateRow.dataset.dealId;
      return;
    }

    applications.forEach((application, index) => {
      const row = index === 0 ? templateRow : (templateRow.cloneNode(true) as HTMLTableRowElement);

      populateApplicationRow(row, application);
      bindRowClick(row);
      row.style.display = '';

      if (index > 0) {
        tableBody.appendChild(row);
      }
    });
  };

  try {
    const { applications } = await apiGetMyDealApplications();
    renderApplications(applications);
  } catch (error) {
    console.error('Failed to load deal applications:', error);
    templateRow.style.display = '';
    populateApplicationRow(templateRow, {
      id: 0,
      deal_id: 0,
      legal_name: 'Unable to load applications',
      application_link: null,
      status: 'active',
      created_at: null,
      updated_at: null,
    });
  }
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    void initFinanceMyApplicationsPage();
  } catch (error) {
    console.error(error);
  }
});
