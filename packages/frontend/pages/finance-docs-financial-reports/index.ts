import type { AxiosError } from 'axios';
import { apiCreateAssetPresignedUrl } from 'shared/services/AssetService';
import { apiUploadFinancialDocument } from 'shared/services/FinancialWizardService';
import type { CreateAssetBody } from 'shared/types/asset';
import type { FinancialDocumentBody } from 'shared/types/financial-wizard';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { constructNavBarClasses, progressFinancialWizardPercentage } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const initFinanceReportsPage = async () => {
  constructNavBarClasses();
  processMiddleware();
  const result = await progressFinancialWizardPercentage();
  //ONLY SHEET AND XLSX ALLOWED
  const ALLOWED_FILE_TYPES = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const form = document.querySelector('[dev-target="finance-reports-form"]');
  if (!form) {
    console.error(
      'Finance Reports form not found. Element: [dev-target="finance-reports-form"] not found'
    );
    return;
  }

  // Get the three upload boxes and file inputs
  const balanceSheetBox = queryElement<HTMLElement>(
    '[dev-target="balance-sheet-upload-box"]',
    form
  );
  const balanceSheetInput = queryElement<HTMLInputElement>(
    '[dev-target="balance-sheet-input"]',
    form
  );
  const balaceSheetHelpText = queryElement<HTMLElement>(
    '[dev-target="balance-sheet-helper"]',
    form
  );

  const incomeStatementBox = queryElement<HTMLElement>(
    '[dev-target="income-statement-upload-box"]',
    form
  );
  const incomeStatementInput = queryElement<HTMLInputElement>(
    '[dev-target="income-statement-input"]',
    form
  );
  const incomeStatementHelpText = queryElement<HTMLElement>(
    '[dev-target="income-statement-helper"]',
    form
  );

  const incomeForecastBox = queryElement<HTMLElement>(
    '[dev-target="income-forecast-upload-box"]',
    form
  );
  const incomeForecastInput = queryElement<HTMLInputElement>(
    '[dev-target="income-forecast-input"]',
    form
  );
  const incomeForecastHelpText = queryElement<HTMLElement>(
    '[dev-target="income-forecast-helper"]',
    form
  );

  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);

  if (!balanceSheetBox || !balanceSheetInput || !balaceSheetHelpText) {
    console.error(
      'Ensure [dev-target="balance-sheet-upload-box"] and [dev-target="balance-sheet-input"] and [dev-target="balance-sheet-helper"] are present.'
    );
    return;
  }
  if (!incomeStatementBox || !incomeStatementInput || !incomeStatementHelpText) {
    console.error(
      'Ensure [dev-target="income-statement-upload-box"] and [dev-target="income-statement-input"] and [dev-target="income-statement-helper"] are present.'
    );
    return;
  }
  if (!incomeForecastBox || !incomeForecastInput || !incomeForecastHelpText) {
    console.error(
      'Ensure [dev-target="income-forecast-upload-box"] and [dev-target="income-forecast-input"] and [dev-target="income-forecast-helper"] are present.'
    );
    return;
  }
  if (!submitButton) {
    console.error('Ensure [dev-target="submit-button"] is present.');
    return;
  }

  // Helper function to update helper text with file name
  const updateHelperText = (input: HTMLInputElement, helperText: HTMLElement) => {
    if (input.files && input.files.length > 0) {
      helperText.textContent = input.files[0].name;
      //check if the file is allowed
      if (!ALLOWED_FILE_TYPES.includes(input.files[0].type)) {
        helperText.textContent =
          'Invalid file type. Please upload Excel (.xls or .xlsx) files only';
        helperText.classList.add('is-error');
      } else {
        helperText.textContent = input.files[0].name;
        helperText.classList.remove('is-error');
      }
    }
  };

  // Setup drag-and-drop for Balance Sheet
  if (balanceSheetBox && balanceSheetInput && balaceSheetHelpText) {
    balanceSheetBox.addEventListener('click', () => balanceSheetInput.click());

    balanceSheetBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      balanceSheetBox.classList.add('drag');
    });

    balanceSheetBox.addEventListener('dragleave', () => {
      balanceSheetBox.classList.remove('drag');
    });

    balanceSheetBox.addEventListener('drop', (e) => {
      e.preventDefault();
      balanceSheetBox.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        balanceSheetInput.files = e.dataTransfer.files;
        updateHelperText(balanceSheetInput, balaceSheetHelpText);
        balanceSheetInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Update helper text when file is selected via file picker
    balanceSheetInput.addEventListener('change', () => {
      updateHelperText(balanceSheetInput, balaceSheetHelpText);
    });
  }

  // Setup drag-and-drop for Income Statement
  if (incomeStatementBox && incomeStatementInput && incomeStatementHelpText) {
    incomeStatementBox.addEventListener('click', () => incomeStatementInput.click());

    incomeStatementBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      incomeStatementBox.classList.add('drag');
    });

    incomeStatementBox.addEventListener('dragleave', () => {
      incomeStatementBox.classList.remove('drag');
    });

    incomeStatementBox.addEventListener('drop', (e) => {
      e.preventDefault();
      incomeStatementBox.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        incomeStatementInput.files = e.dataTransfer.files;
        updateHelperText(incomeStatementInput, incomeStatementHelpText);
        incomeStatementInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Update helper text when file is selected via file picker
    incomeStatementInput.addEventListener('change', () => {
      updateHelperText(incomeStatementInput, incomeStatementHelpText);
    });
  }

  // Setup drag-and-drop for Income Forecast
  if (incomeForecastBox && incomeForecastInput && incomeForecastHelpText) {
    incomeForecastBox.addEventListener('click', () => incomeForecastInput.click());

    incomeForecastBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      incomeForecastBox.classList.add('drag');
    });

    incomeForecastBox.addEventListener('dragleave', () => {
      incomeForecastBox.classList.remove('drag');
    });

    incomeForecastBox.addEventListener('drop', (e) => {
      e.preventDefault();
      incomeForecastBox.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        incomeForecastInput.files = e.dataTransfer.files;
        updateHelperText(incomeForecastInput, incomeForecastHelpText);
        incomeForecastInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Update helper text when file is selected via file picker
    incomeForecastInput.addEventListener('change', () => {
      updateHelperText(incomeForecastInput, incomeForecastHelpText);
    });
  }

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ];

  const uploadFile = async (
    file: File,
    documentType: FinancialDocumentBody['document_type']
  ): Promise<void> => {
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload PDF, Word, Excel, or CSV files');
    }

    // Step 1: Create asset
    const assetPayload: CreateAssetBody = {
      fileName: file.name,
      contentType: file.type,
      assetType: 'document',
      fileSize: file.size,
      duration: 0,
    };

    const assetResponse = await apiCreateAssetPresignedUrl(assetPayload);
    const assetId = assetResponse.asset.id;

    const { presignedUrl } = assetResponse;

    if (!presignedUrl) {
      throw new Error('Presigned URL not received from server');
    }

    //upload the file to the presigned url
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          console.log(`Upload progress: ${percent}%`);
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error('Failed to upload file to S3'));
        }
      });
      xhr.addEventListener('error', (error) => {
        console.error(error);
        reject(new Error('Network error during upload'));
      });
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });

    // Step 3: Create financial document record
    const documentPayload: FinancialDocumentBody = {
      page: 'financial-reports',
      document_type: documentType,
      asset_id: assetId,
    };

    await apiUploadFinancialDocument(documentPayload);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      balanceSheetBox?.classList.remove('is-error');
      incomeStatementBox?.classList.remove('is-error');
      incomeForecastBox?.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'UPLOAD DOCUMENTS';
    };

    // Reset errors on file change
    balanceSheetInput?.addEventListener('change', resetErrors, { once: true });
    incomeStatementInput?.addEventListener('change', resetErrors, { once: true });
    incomeForecastInput?.addEventListener('change', resetErrors, { once: true });

    const filesToUpload: Array<{
      file: File;
      documentType: FinancialDocumentBody['document_type'];
    }> = [];

    // Collect all files
    if (balanceSheetInput?.files && balanceSheetInput.files[0]) {
      filesToUpload.push({
        file: balanceSheetInput.files[0],
        documentType: 'monthly_balance_sheet',
      });
    }

    if (incomeStatementInput?.files && incomeStatementInput.files[0]) {
      filesToUpload.push({
        file: incomeStatementInput.files[0],
        documentType: 'monthly_income_statement',
      });
    }

    if (incomeForecastInput?.files && incomeForecastInput.files[0]) {
      filesToUpload.push({
        file: incomeForecastInput.files[0],
        documentType: 'monthly_income_forecast',
      });
    }

    if (filesToUpload.length === 0) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Please select at least one file to upload';
      return;
    }

    try {
      submitButton.disabled = true;
      submitButton.value = 'Uploading...';

      // Upload all files
      await Promise.all(
        filesToUpload.map(({ file, documentType }) => uploadFile(file, documentType))
      );

      submitButton.classList.add('is-success');
      submitButton.value = 'Documents uploaded successfully!';

      // Reset form
      if (balanceSheetInput) balanceSheetInput.value = '';
      if (incomeStatementInput) incomeStatementInput.value = '';
      if (incomeForecastInput) incomeForecastInput.value = '';

      // Reset helper text
      if (balaceSheetHelpText) balaceSheetHelpText.textContent = '';
      if (incomeStatementHelpText) incomeStatementHelpText.textContent = '';
      if (incomeForecastHelpText) incomeForecastHelpText.textContent = '';

      setTimeout(() => {
        submitButton.classList.remove('is-success');
        submitButton.value = 'UPLOAD DOCUMENTS';
        submitButton.disabled = false;
        navigateToPath('/finance-docs-accounts-and-inventory');
      }, 900);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem uploading the documents';
      submitButton.disabled = false;
    }
  });

  //prefill helper text if documents are already uploaded
  if (result?.financial_reports) {
    const balanceSheet = result.financial_reports.find(
      (document) => document.document_type === 'monthly_balance_sheet'
    );
    if (balanceSheet) {
      balaceSheetHelpText.textContent = balanceSheet.asset_name || '';
    }
    const incomeStatement = result.financial_reports.find(
      (document) => document.document_type === 'monthly_income_statement'
    );
    if (incomeStatement) {
      incomeStatementHelpText.textContent = incomeStatement.asset_name || '';
    }
    const incomeForecast = result.financial_reports.find(
      (document) => document.document_type === 'monthly_income_forecast'
    );
    if (incomeForecast) {
      incomeForecastHelpText.textContent = incomeForecast.asset_name || '';
    }
  }
};

window.Webflow ||= [];
window.Webflow.push(() => {
  initFinanceReportsPage();
});
