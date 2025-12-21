import type { AxiosError } from 'axios';
import { apiCreateAssetPresignedUrl } from 'shared/services/AssetService';
import { apiUploadFinancialDocument } from 'shared/services/FinancialWizardService';
import type { CreateAssetBody } from 'shared/types/asset';
import type { FinancialDocumentBody } from 'shared/types/financial-wizard';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { constructNavBarClasses, progressFinancialWizardPercentage } from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const initFinanceDocsAccountsInventoryPage = async () => {
  constructNavBarClasses();
  processMiddleware();
  const result = await progressFinancialWizardPercentage();

  //ONLY SHEET AND XLSX ALLOWED
  const ALLOWED_FILE_TYPES = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const form = document.querySelector('[dev-target="accounts-inventory-reports-form"]');
  if (!form) {
    console.error(
      'Accounts & Inventory form not found. Element: [dev-target="accounts-inventory-reports-form"] not found'
    );
    return;
  }

  // Get the three upload boxes and file inputs
  const monthlyInventoryBox = queryElement<HTMLElement>(
    '[dev-target="monthly-inventory-upload-box"]',
    form
  );
  const monthlyInventoryInput = queryElement<HTMLInputElement>(
    '[dev-target="monthly-inventory-input"]',
    form
  );
  const monthlyInventoryHelpText = queryElement<HTMLElement>(
    '[dev-target="balance-sheet-helper"]',
    form
  );

  const accountsReceivableBox = queryElement<HTMLElement>(
    '[dev-target="accounts-receivable-upload-box"]',
    form
  );
  const accountsReceivableInput = queryElement<HTMLInputElement>(
    '[dev-target="accounts-receivable-input"]',
    form
  );
  const accountsReceivableHelpText = queryElement<HTMLElement>(
    '[dev-target="income-statement-helper"]',
    form
  );

  const accountsPayableBox = queryElement<HTMLElement>(
    '[dev-target="accounts-payable-upload-box"]',
    form
  );
  const accountsPayableInput = queryElement<HTMLInputElement>(
    '[dev-target="accounts-payable-input"]',
    form
  );
  const accountsPayableHelpText = queryElement<HTMLElement>(
    '[dev-target="income-forecast-helper"]',
    form
  );

  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);

  if (!monthlyInventoryBox || !monthlyInventoryInput || !monthlyInventoryHelpText) {
    console.error(
      'Ensure [dev-target="monthly-inventory-upload-box"] and [dev-target="monthly-inventory-input"] and [dev-target="balance-sheet-helper"] are present.'
    );
    return;
  }
  if (!accountsReceivableBox || !accountsReceivableInput || !accountsReceivableHelpText) {
    console.error(
      'Ensure [dev-target="accounts-receivable-upload-box"] and [dev-target="accounts-receivable-input"] and [dev-target="income-statement-helper"] are present.'
    );
    return;
  }
  if (!accountsPayableBox || !accountsPayableInput || !accountsPayableHelpText) {
    console.error(
      'Ensure [dev-target="accounts-payable-upload-box"] and [dev-target="accounts-payable-input"] and [dev-target="income-forecast-helper"] are present.'
    );
    return;
  }
  if (!submitButton) {
    console.error('Ensure [dev-target="submit-button"] is present.');
    return;
  }

  // Helper function to update helper text with file name and validate file type
  const updateHelperText = (input: HTMLInputElement, helperText: HTMLElement) => {
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type - fail first
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        // Invalid file - clear input and show error
        input.value = '';
        helperText.textContent =
          'Invalid file type. Please upload Excel (.xls or .xlsx) files only';
        helperText.classList.add('is-error');
        return;
      }

      // Valid file - show file name
      helperText.textContent = file.name;
      helperText.classList.remove('is-error');
    } else {
      helperText.textContent = '';
      helperText.classList.remove('is-error');
    }
  };

  // Setup drag-and-drop for Monthly Inventory
  if (monthlyInventoryBox && monthlyInventoryInput && monthlyInventoryHelpText) {
    monthlyInventoryBox.addEventListener('click', () => monthlyInventoryInput.click());

    monthlyInventoryBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      monthlyInventoryBox.classList.add('drag');
    });

    monthlyInventoryBox.addEventListener('dragleave', () => {
      monthlyInventoryBox.classList.remove('drag');
    });

    monthlyInventoryBox.addEventListener('drop', (e) => {
      e.preventDefault();
      monthlyInventoryBox.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        monthlyInventoryInput.files = e.dataTransfer.files;
        updateHelperText(monthlyInventoryInput, monthlyInventoryHelpText);
        monthlyInventoryInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Update helper text when file is selected via file picker
    monthlyInventoryInput.addEventListener('change', () => {
      updateHelperText(monthlyInventoryInput, monthlyInventoryHelpText);
    });
  }

  // Setup drag-and-drop for Accounts Receivable
  if (accountsReceivableBox && accountsReceivableInput && accountsReceivableHelpText) {
    accountsReceivableBox.addEventListener('click', () => accountsReceivableInput.click());

    accountsReceivableBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      accountsReceivableBox.classList.add('drag');
    });

    accountsReceivableBox.addEventListener('dragleave', () => {
      accountsReceivableBox.classList.remove('drag');
    });

    accountsReceivableBox.addEventListener('drop', (e) => {
      e.preventDefault();
      accountsReceivableBox.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        accountsReceivableInput.files = e.dataTransfer.files;
        updateHelperText(accountsReceivableInput, accountsReceivableHelpText);
        accountsReceivableInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Update helper text when file is selected via file picker
    accountsReceivableInput.addEventListener('change', () => {
      updateHelperText(accountsReceivableInput, accountsReceivableHelpText);
    });
  }

  // Setup drag-and-drop for Accounts Payable
  if (accountsPayableBox && accountsPayableInput && accountsPayableHelpText) {
    accountsPayableBox.addEventListener('click', () => accountsPayableInput.click());

    accountsPayableBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      accountsPayableBox.classList.add('drag');
    });

    accountsPayableBox.addEventListener('dragleave', () => {
      accountsPayableBox.classList.remove('drag');
    });

    accountsPayableBox.addEventListener('drop', (e) => {
      e.preventDefault();
      accountsPayableBox.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        accountsPayableInput.files = e.dataTransfer.files;
        updateHelperText(accountsPayableInput, accountsPayableHelpText);
        accountsPayableInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Update helper text when file is selected via file picker
    accountsPayableInput.addEventListener('change', () => {
      updateHelperText(accountsPayableInput, accountsPayableHelpText);
    });
  }

  const uploadFile = async (
    file: File,
    documentType: FinancialDocumentBody['document_type']
  ): Promise<void> => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Please upload Excel (.xls or .xlsx) files only');
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

    // Step 2: Upload file to the presigned URL
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
      page: 'accounts-inventory',
      document_type: documentType,
      asset_id: assetId,
    };

    await apiUploadFinancialDocument(documentPayload);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      monthlyInventoryBox?.classList.remove('is-error');
      accountsReceivableBox?.classList.remove('is-error');
      accountsPayableBox?.classList.remove('is-error');
      monthlyInventoryHelpText?.classList.remove('is-error');
      accountsReceivableHelpText?.classList.remove('is-error');
      accountsPayableHelpText?.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'UPLOAD DOCUMENTS';
    };

    // Reset errors on file change
    monthlyInventoryInput?.addEventListener('change', resetErrors, { once: true });
    accountsReceivableInput?.addEventListener('change', resetErrors, { once: true });
    accountsPayableInput?.addEventListener('change', resetErrors, { once: true });

    const filesToUpload: Array<{
      file: File;
      documentType: FinancialDocumentBody['document_type'];
    }> = [];

    // Collect all files (only valid file types)
    if (monthlyInventoryInput?.files && monthlyInventoryInput.files[0]) {
      const file = monthlyInventoryInput.files[0];
      if (ALLOWED_FILE_TYPES.includes(file.type)) {
        filesToUpload.push({
          file: file,
          documentType: 'monthly_inventory_report',
        });
      } else {
        monthlyInventoryHelpText?.classList.add('is-error');
      }
    }

    if (accountsReceivableInput?.files && accountsReceivableInput.files[0]) {
      const file = accountsReceivableInput.files[0];
      if (ALLOWED_FILE_TYPES.includes(file.type)) {
        filesToUpload.push({
          file: file,
          documentType: 'accounts_receivable_aging',
        });
      } else {
        accountsReceivableHelpText?.classList.add('is-error');
      }
    }

    if (accountsPayableInput?.files && accountsPayableInput.files[0]) {
      const file = accountsPayableInput.files[0];
      if (ALLOWED_FILE_TYPES.includes(file.type)) {
        filesToUpload.push({
          file: file,
          documentType: 'accounts_payable_aging',
        });
      } else {
        accountsPayableHelpText?.classList.add('is-error');
      }
    }

    // Check if there are any invalid files
    const hasInvalidFiles =
      (monthlyInventoryInput?.files &&
        monthlyInventoryInput.files[0] &&
        !ALLOWED_FILE_TYPES.includes(monthlyInventoryInput.files[0].type)) ||
      (accountsReceivableInput?.files &&
        accountsReceivableInput.files[0] &&
        !ALLOWED_FILE_TYPES.includes(accountsReceivableInput.files[0].type)) ||
      (accountsPayableInput?.files &&
        accountsPayableInput.files[0] &&
        !ALLOWED_FILE_TYPES.includes(accountsPayableInput.files[0].type));

    if (hasInvalidFiles) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Please upload only Excel (.xls or .xlsx) files';
      return;
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
      if (monthlyInventoryInput) monthlyInventoryInput.value = '';
      if (accountsReceivableInput) accountsReceivableInput.value = '';
      if (accountsPayableInput) accountsPayableInput.value = '';

      // Reset helper text
      if (monthlyInventoryHelpText) {
        monthlyInventoryHelpText.textContent = '';
        monthlyInventoryHelpText.classList.remove('is-error');
      }
      if (accountsReceivableHelpText) {
        accountsReceivableHelpText.textContent = '';
        accountsReceivableHelpText.classList.remove('is-error');
      }
      if (accountsPayableHelpText) {
        accountsPayableHelpText.textContent = '';
        accountsPayableHelpText.classList.remove('is-error');
      }

      setTimeout(() => {
        submitButton.classList.remove('is-success');
        submitButton.value = 'UPLOAD DOCUMENTS';
        submitButton.disabled = false;
        navigateToPath('/finance-docs-ecommerce-performance');
      }, 900);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem uploading the documents';
      submitButton.disabled = false;
    }
  });

  // Prefill helper text if documents are already uploaded
  if (result?.accounts_inventory) {
    const monthlyInventory = result.accounts_inventory.find(
      (document) => document.document_type === 'monthly_inventory_report'
    );
    if (monthlyInventory) {
      monthlyInventoryHelpText.textContent = monthlyInventory.asset_name || '';
    }
    const accountsReceivable = result.accounts_inventory.find(
      (document) => document.document_type === 'accounts_receivable_aging'
    );
    if (accountsReceivable) {
      accountsReceivableHelpText.textContent = accountsReceivable.asset_name || '';
    }
    const accountsPayable = result.accounts_inventory.find(
      (document) => document.document_type === 'accounts_payable_aging'
    );
    if (accountsPayable) {
      accountsPayableHelpText.textContent = accountsPayable.asset_name || '';
    }
  }
};

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    initFinanceDocsAccountsInventoryPage();
  } catch (error) {
    console.error(error);
  }
});
