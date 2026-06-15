import type { AxiosError } from 'axios';
import {
  apiExchangeWarmLeadSession,
  apiGetMyDealApplications,
} from 'shared/services/DealApplicationService';
import type { DealApplicationSummary } from 'shared/types/deal-application';

import { processMiddleware, setCookie } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { constructNavBarClasses, initCollapsibleSidebar } from '$utils/helpers';
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
};

const openApplication = async (dealId: number) => {
  const response = await apiExchangeWarmLeadSession(dealId);
  setCookie('accessToken', response.token, 10);
  localStorage.setItem('user', JSON.stringify(response.user));
  localStorage.removeItem('x-team-id');
  navigateToPath('/warm/finance-company-profile');
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
    row.addEventListener('click', async () => {
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
