import type { AxiosError } from 'axios';
import { apiCreateAssetPresignedUrl } from 'shared/services/AssetService';
import {
  apiDeleteFinancialDocument,
  apiUploadFinancialDocument,
} from 'shared/services/FinancialWizardService';
import type { CreateAssetBody } from 'shared/types/asset';
import type {
  FinancialDocumentBody,
  FinancialWizardProgressResponse,
} from 'shared/types/financial-wizard';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import {
  checkProgressUserAndTeams,
  constructNavBarClasses,
  fileToBase64,
  initCollapsibleSidebar,
} from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const ALLOWED_FILE_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const initFinanceForecastsPage = async () => {
  constructNavBarClasses();
  processMiddleware();
  initCollapsibleSidebar();

  const form = document.querySelector('[dev-target="finance-reports-form"]');
  if (!form) {
    console.error('Forecasts form not found: [dev-target="finance-reports-form"]');
    return;
  }

  const incomeForecastBox = queryElement<HTMLElement>(
    '[dev-target="income-forecast-upload-box"]',
    form
  );
  const incomeForecastInput = queryElement<HTMLInputElement>(
    '[dev-target="file-input"]',
    incomeForecastBox ?? form
  );
  const incomeForecastHelpText = queryElement<HTMLElement>(
    '[dev-target="income-forecast-helper"]',
    form
  );

  const balanceForecastBox = queryElement<HTMLElement>(
    '[dev-target="balance-forecast-upload-box"]',
    form
  );
  const balanceForecastInput = queryElement<HTMLInputElement>(
    '[dev-target="file-input"]',
    balanceForecastBox ?? form
  );
  const balanceForecastHelpText = queryElement<HTMLElement>(
    '[dev-target="balance-forecast-helper"]',
    form
  );

  const submitButton = queryElement<HTMLInputElement>('[dev-target="submit-button"]', form);

  const requiredElements: [string, unknown][] = [
    ['[dev-target="income-forecast-upload-box"]', incomeForecastBox],
    ['[dev-target="file-input"] inside income-forecast-upload-box', incomeForecastInput],
    ['[dev-target="income-forecast-helper"]', incomeForecastHelpText],
    ['[dev-target="balance-forecast-upload-box"]', balanceForecastBox],
    ['[dev-target="file-input"] inside balance-forecast-upload-box', balanceForecastInput],
    ['[dev-target="balance-forecast-helper"]', balanceForecastHelpText],
    ['[dev-target="submit-button"]', submitButton],
  ];
  let missingElements = false;
  for (const [selector, el] of requiredElements) {
    if (!el) {
      console.error(`Missing required element: ${selector}`);
      missingElements = true;
    }
  }
  if (
    missingElements ||
    !incomeForecastBox ||
    !incomeForecastInput ||
    !incomeForecastHelpText ||
    !balanceForecastBox ||
    !balanceForecastInput ||
    !balanceForecastHelpText ||
    !submitButton
  ) {
    return;
  }

  // --- Progress helpers ---

  const updateHelperTexts = (progress: FinancialWizardProgressResponse | undefined) => {
    const placeholder = 'Supported formats: sheets, excel';
    const incomeForecast = progress?.financial_reports?.find(
      (d) => d.document_type === 'income_statement_forecast'
    );
    incomeForecastHelpText.textContent = incomeForecast?.asset_name || placeholder;

    const balanceForecast = progress?.financial_reports?.find(
      (d) => d.document_type === 'balance_sheet_full_year_forecast'
    );
    balanceForecastHelpText.textContent = balanceForecast?.asset_name || placeholder;
  };

  let financialProgress: FinancialWizardProgressResponse | undefined;
  const loadFinancialProgress = async () => {
    const result = await checkProgressUserAndTeams();
    financialProgress = result?.financialProgress;
    updateHelperTexts(financialProgress);
  };

  const getFinancialReportDoc = (documentType: FinancialDocumentBody['document_type']) =>
    financialProgress?.financial_reports?.find((doc) => doc.document_type === documentType);

  await loadFinancialProgress();

  // --- File helper text ---

  const updateHelperText = (input: HTMLInputElement, helperText: HTMLElement) => {
    const file = input.files?.[0];
    if (!file) return;
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      helperText.textContent = 'Invalid file type. Please upload Excel (.xls or .xlsx) files only';
      helperText.classList.add('is-error');
    } else {
      helperText.textContent = file.name;
      helperText.classList.remove('is-error');
    }
  };

  // --- Drag-and-drop: Income Forecast ---

  incomeForecastBox.addEventListener('click', () => incomeForecastInput.click());
  incomeForecastBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    incomeForecastBox.classList.add('drag');
  });
  incomeForecastBox.addEventListener('dragleave', () => incomeForecastBox.classList.remove('drag'));
  incomeForecastBox.addEventListener('drop', (e) => {
    e.preventDefault();
    incomeForecastBox.classList.remove('drag');
    if (e.dataTransfer?.files.length) {
      incomeForecastInput.files = e.dataTransfer.files;
      updateHelperText(incomeForecastInput, incomeForecastHelpText);
      incomeForecastInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  incomeForecastInput.addEventListener('change', () =>
    updateHelperText(incomeForecastInput, incomeForecastHelpText)
  );

  // --- Drag-and-drop: Balance Sheet Forecast ---

  balanceForecastBox.addEventListener('click', () => balanceForecastInput.click());
  balanceForecastBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    balanceForecastBox.classList.add('drag');
  });
  balanceForecastBox.addEventListener('dragleave', () =>
    balanceForecastBox.classList.remove('drag')
  );
  balanceForecastBox.addEventListener('drop', (e) => {
    e.preventDefault();
    balanceForecastBox.classList.remove('drag');
    if (e.dataTransfer?.files.length) {
      balanceForecastInput.files = e.dataTransfer.files;
      updateHelperText(balanceForecastInput, balanceForecastHelpText);
      balanceForecastInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  balanceForecastInput.addEventListener('change', () =>
    updateHelperText(balanceForecastInput, balanceForecastHelpText)
  );

  // --- Delete handlers ---

  const handleDeleteDocument = async (
    documentType: FinancialDocumentBody['document_type'],
    helperText: HTMLElement
  ) => {
    const doc = getFinancialReportDoc(documentType);
    if (!doc) {
      helperText.textContent = 'Supported formats: sheets, excel';
      helperText.classList.remove('is-error');
      return;
    }
    helperText.classList.remove('is-error');
    helperText.textContent = 'Deleting…';
    try {
      await apiDeleteFinancialDocument(doc.id);
      await loadFinancialProgress();
    } catch (error) {
      console.error(error);
      helperText.classList.add('is-error');
      helperText.textContent = 'Failed to delete file. Please try again.';
    }
  };

  const trashHandlers: [HTMLElement, FinancialDocumentBody['document_type'], HTMLElement][] = [
    [incomeForecastBox, 'income_statement_forecast', incomeForecastHelpText],
    [balanceForecastBox, 'balance_sheet_full_year_forecast', balanceForecastHelpText],
  ];
  for (const [box, documentType, helperText] of trashHandlers) {
    const trash = queryElement<HTMLElement>('[dev-target="trash-icon"]', box);
    if (trash) {
      trash.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleDeleteDocument(documentType, helperText);
      });
    }
  }

  // --- Upload helper ---

  const uploadFile = async (
    file: File,
    documentType: FinancialDocumentBody['document_type']
  ): Promise<void> => {
    const assetPayload: CreateAssetBody = {
      fileName: file.name,
      contentType: file.type,
      assetType: 'document',
      fileSize: file.size,
      duration: 0,
    };

    const assetResponse = await apiCreateAssetPresignedUrl(assetPayload);
    const { presignedUrl, asset } = assetResponse;

    if (!presignedUrl) throw new Error('Presigned URL not received from server');

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error('Failed to upload file to S3'));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });

    const base64Data = await fileToBase64(file);
    const documentPayload: FinancialDocumentBody = {
      page: 'financial-reports',
      document_type: documentType,
      asset_id: asset.id,
      file_name: file.name,
      file_mime_type: file.type,
      file_data: base64Data,
    };
    await apiUploadFinancialDocument(documentPayload);
  };

  // --- Submit ---

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    submitButton.classList.remove('is-error', 'is-success');
    submitButton.value = 'UPLOAD DOCUMENTS';

    const filesToUpload: Array<{
      file: File;
      documentType: FinancialDocumentBody['document_type'];
    }> = [];

    if (incomeForecastInput.files?.[0]) {
      filesToUpload.push({
        file: incomeForecastInput.files[0],
        documentType: 'income_statement_forecast',
      });
    }
    if (balanceForecastInput.files?.[0]) {
      filesToUpload.push({
        file: balanceForecastInput.files[0],
        documentType: 'balance_sheet_full_year_forecast',
      });
    }

    if (filesToUpload.length === 0) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Please select at least one file to upload';
      return;
    }

    try {
      submitButton.disabled = true;
      submitButton.value = 'Uploading…';

      await Promise.all(
        filesToUpload.map(({ file, documentType }) => uploadFile(file, documentType))
      );

      submitButton.classList.add('is-success');
      submitButton.value = 'Documents uploaded successfully!';

      incomeForecastInput.value = '';
      balanceForecastInput.value = '';
      incomeForecastHelpText.textContent = '';
      balanceForecastHelpText.textContent = '';

      setTimeout(() => {
        navigateToPath('/warm/finance-docs-accounts-and-inventory');
      }, 900);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(error);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem uploading the documents';
      submitButton.disabled = false;
    }
  });
};

window.Webflow ||= [];
window.Webflow.push(() => {
  initFinanceForecastsPage().catch(console.error);
});
