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

const initFinanceReportsPage = async () => {
  constructNavBarClasses();
  processMiddleware();
  initCollapsibleSidebar();

  const form = document.querySelector('[dev-target="finance-reports-form"]');
  if (!form) {
    console.error('Finance Reports form not found: [dev-target="finance-reports-form"]');
    return;
  }

  const balanceSheetBox = queryElement<HTMLElement>(
    '[dev-target="balance-sheet-upload-box"]',
    form
  );
  const balanceSheetInput = queryElement<HTMLInputElement>(
    '[dev-target="file-input"]',
    balanceSheetBox ?? form
  );
  const balanceSheetHelpText = queryElement<HTMLElement>(
    '[dev-target="balance-sheet-helper"]',
    form
  );

  const incomeStatementBox = queryElement<HTMLElement>(
    '[dev-target="income-statement-upload-box"]',
    form
  );
  const incomeStatementInput = queryElement<HTMLInputElement>(
    '[dev-target="file-input"]',
    incomeStatementBox ?? form
  );
  const incomeStatementHelpText = queryElement<HTMLElement>(
    '[dev-target="income-statement-helper"]',
    form
  );

  const submitButton = queryElement<HTMLInputElement>('[dev-target="submit-button"]', form);

  const requiredElements: [string, unknown][] = [
    ['[dev-target="balance-sheet-upload-box"]', balanceSheetBox],
    ['[dev-target="file-input"] inside balance-sheet-upload-box', balanceSheetInput],
    ['[dev-target="balance-sheet-helper"]', balanceSheetHelpText],
    ['[dev-target="income-statement-upload-box"]', incomeStatementBox],
    ['[dev-target="file-input"] inside income-statement-upload-box', incomeStatementInput],
    ['[dev-target="income-statement-helper"]', incomeStatementHelpText],
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
    !balanceSheetBox ||
    !balanceSheetInput ||
    !balanceSheetHelpText ||
    !incomeStatementBox ||
    !incomeStatementInput ||
    !incomeStatementHelpText ||
    !submitButton
  ) {
    return;
  }

  // --- Progress helpers ---

  const updateHelperTexts = (progress: FinancialWizardProgressResponse | undefined) => {
    const placeholder = 'Supported formats: sheets, excel';
    const balanceSheet = progress?.financial_reports?.find(
      (d) => d.document_type === 'monthly_balance_sheet'
    );
    balanceSheetHelpText.textContent = balanceSheet?.asset_name || placeholder;

    const incomeStatement = progress?.financial_reports?.find(
      (d) => d.document_type === 'monthly_income_statement'
    );
    incomeStatementHelpText.textContent = incomeStatement?.asset_name || placeholder;
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

  // --- Drag-and-drop: Balance Sheet ---

  balanceSheetBox.addEventListener('click', () => balanceSheetInput.click());
  balanceSheetBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    balanceSheetBox.classList.add('drag');
  });
  balanceSheetBox.addEventListener('dragleave', () => balanceSheetBox.classList.remove('drag'));
  balanceSheetBox.addEventListener('drop', (e) => {
    e.preventDefault();
    balanceSheetBox.classList.remove('drag');
    if (e.dataTransfer?.files.length) {
      balanceSheetInput.files = e.dataTransfer.files;
      updateHelperText(balanceSheetInput, balanceSheetHelpText);
      balanceSheetInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  balanceSheetInput.addEventListener('change', () =>
    updateHelperText(balanceSheetInput, balanceSheetHelpText)
  );

  // --- Drag-and-drop: Income Statement ---

  incomeStatementBox.addEventListener('click', () => incomeStatementInput.click());
  incomeStatementBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    incomeStatementBox.classList.add('drag');
  });
  incomeStatementBox.addEventListener('dragleave', () =>
    incomeStatementBox.classList.remove('drag')
  );
  incomeStatementBox.addEventListener('drop', (e) => {
    e.preventDefault();
    incomeStatementBox.classList.remove('drag');
    if (e.dataTransfer?.files.length) {
      incomeStatementInput.files = e.dataTransfer.files;
      updateHelperText(incomeStatementInput, incomeStatementHelpText);
      incomeStatementInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  incomeStatementInput.addEventListener('change', () =>
    updateHelperText(incomeStatementInput, incomeStatementHelpText)
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

  const balanceSheetTrash = queryElement<HTMLElement>('[dev-target="balance_trash-icon"]', form);
  if (balanceSheetTrash) {
    balanceSheetTrash.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void handleDeleteDocument('monthly_balance_sheet', balanceSheetHelpText);
    });
  }

  const incomeStatementTrash = queryElement<HTMLElement>(
    '[dev-target="income-statement-trash-icon"]',
    form
  );
  if (incomeStatementTrash) {
    incomeStatementTrash.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void handleDeleteDocument('monthly_income_statement', incomeStatementHelpText);
    });
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

    if (balanceSheetInput.files?.[0]) {
      filesToUpload.push({
        file: balanceSheetInput.files[0],
        documentType: 'monthly_balance_sheet',
      });
    }
    if (incomeStatementInput.files?.[0]) {
      filesToUpload.push({
        file: incomeStatementInput.files[0],
        documentType: 'monthly_income_statement',
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

      balanceSheetInput.value = '';
      incomeStatementInput.value = '';
      balanceSheetHelpText.textContent = '';
      incomeStatementHelpText.textContent = '';

      setTimeout(() => {
        navigateToPath('/dev/warm/finance-docs-forecasts');
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
  initFinanceReportsPage().catch(console.error);
});
