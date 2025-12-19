import type { AxiosError } from 'axios';
import { apiCreateAssetPresignedUrl } from 'shared/services/AssetService';
import { apiUploadFinancialDocument } from 'shared/services/FinancialWizardService';
import type { CreateAssetBody } from 'shared/types/asset';
import type { FinancialDocumentBody } from 'shared/types/financial-wizard';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { queryElement } from '$utils/selectors';

const initTeamOwnershipPage = () => {
  processMiddleware();

  //ONLY SHEET AND XLSX ALLOWED
  const ALLOWED_FILE_TYPES = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const form = document.querySelector('[dev-target="ecommerce-performance-form"]');
  if (!form) {
    console.error(
      'Team & Ownership form not found. Element: [dev-target="ecommerce-performance-form"] not found'
    );
    return;
  }

  // Get the three upload boxes and file inputs
  const managementBiosBox = queryElement<HTMLElement>(
    '[dev-target="management-bios-upload-box"]',
    form
  );
  const managementBiosInput = queryElement<HTMLInputElement>(
    '[dev-target="management-bios-input"]',
    form
  );
  const managementBiosHelpText = queryElement<HTMLElement>(
    '[dev-target="management-bios-helper"]',
    form
  );

  const investorDeckBox = queryElement<HTMLElement>(
    '[dev-target="investor-deck-upload-box"]',
    form
  );
  const investorDeckInput = queryElement<HTMLInputElement>(
    '[dev-target="investor-deck-input"]',
    form
  );
  const investorDeckHelpText = queryElement<HTMLElement>(
    '[dev-target="investor-deck-helper"]',
    form
  );

  const capitalisationTableBox = queryElement<HTMLElement>(
    '[dev-target="capitalisation-table-upload-box"]',
    form
  );
  const capitalisationTableInput = queryElement<HTMLInputElement>(
    '[dev-target="capitalisation-table-input"]',
    form
  );
  const capitalisationTableHelpText = queryElement<HTMLElement>(
    '[dev-target="capitalisation-table-helper"]',
    form
  );

  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);

  if (!managementBiosBox || !managementBiosInput || !managementBiosHelpText) {
    console.error(
      'Ensure [dev-target="management-bios-upload-box"] and [dev-target="management-bios-input"] and [dev-target="management-bios-helper"] are present.'
    );
    return;
  }
  if (!investorDeckBox || !investorDeckInput || !investorDeckHelpText) {
    console.error(
      'Ensure [dev-target="investor-deck-upload-box"] and [dev-target="investor-deck-input"] and [dev-target="investor-deck-helper"] are present.'
    );
    return;
  }
  if (!capitalisationTableBox || !capitalisationTableInput || !capitalisationTableHelpText) {
    console.error(
      'Ensure [dev-target="capitalisation-table-upload-box"] and [dev-target="capitalisation-table-input"] and [dev-target="capitalisation-table-helper"] are present.'
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

  // Setup drag-and-drop for Management Bios
  if (managementBiosBox && managementBiosInput && managementBiosHelpText) {
    managementBiosBox.addEventListener('click', () => managementBiosInput.click());

    managementBiosBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      managementBiosBox.classList.add('drag');
    });

    managementBiosBox.addEventListener('dragleave', () => {
      managementBiosBox.classList.remove('drag');
    });

    managementBiosBox.addEventListener('drop', (e) => {
      e.preventDefault();
      managementBiosBox.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        managementBiosInput.files = e.dataTransfer.files;
        updateHelperText(managementBiosInput, managementBiosHelpText);
        managementBiosInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Update helper text when file is selected via file picker
    managementBiosInput.addEventListener('change', () => {
      updateHelperText(managementBiosInput, managementBiosHelpText);
    });
  }

  // Setup drag-and-drop for Investor Deck
  if (investorDeckBox && investorDeckInput && investorDeckHelpText) {
    investorDeckBox.addEventListener('click', () => investorDeckInput.click());

    investorDeckBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      investorDeckBox.classList.add('drag');
    });

    investorDeckBox.addEventListener('dragleave', () => {
      investorDeckBox.classList.remove('drag');
    });

    investorDeckBox.addEventListener('drop', (e) => {
      e.preventDefault();
      investorDeckBox.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        investorDeckInput.files = e.dataTransfer.files;
        updateHelperText(investorDeckInput, investorDeckHelpText);
        investorDeckInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Update helper text when file is selected via file picker
    investorDeckInput.addEventListener('change', () => {
      updateHelperText(investorDeckInput, investorDeckHelpText);
    });
  }

  // Setup drag-and-drop for Capitalisation Table
  if (capitalisationTableBox && capitalisationTableInput && capitalisationTableHelpText) {
    capitalisationTableBox.addEventListener('click', () => capitalisationTableInput.click());

    capitalisationTableBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      capitalisationTableBox.classList.add('drag');
    });

    capitalisationTableBox.addEventListener('dragleave', () => {
      capitalisationTableBox.classList.remove('drag');
    });

    capitalisationTableBox.addEventListener('drop', (e) => {
      e.preventDefault();
      capitalisationTableBox.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        capitalisationTableInput.files = e.dataTransfer.files;
        updateHelperText(capitalisationTableInput, capitalisationTableHelpText);
        capitalisationTableInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Update helper text when file is selected via file picker
    capitalisationTableInput.addEventListener('change', () => {
      updateHelperText(capitalisationTableInput, capitalisationTableHelpText);
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
      step: 5,
      document_type: documentType,
      asset_id: assetId,
    };

    await apiUploadFinancialDocument(documentPayload);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      managementBiosBox?.classList.remove('is-error');
      investorDeckBox?.classList.remove('is-error');
      capitalisationTableBox?.classList.remove('is-error');
      managementBiosHelpText?.classList.remove('is-error');
      investorDeckHelpText?.classList.remove('is-error');
      capitalisationTableHelpText?.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'UPLOAD DOCUMENTS';
    };

    // Reset errors on file change
    managementBiosInput?.addEventListener('change', resetErrors, { once: true });
    investorDeckInput?.addEventListener('change', resetErrors, { once: true });
    capitalisationTableInput?.addEventListener('change', resetErrors, { once: true });

    const filesToUpload: Array<{
      file: File;
      documentType: FinancialDocumentBody['document_type'];
    }> = [];

    // Collect all files (only valid file types)
    if (managementBiosInput?.files && managementBiosInput.files[0]) {
      const file = managementBiosInput.files[0];
      if (ALLOWED_FILE_TYPES.includes(file.type)) {
        filesToUpload.push({
          file: file,
          documentType: 'management_bios',
        });
      } else {
        managementBiosHelpText?.classList.add('is-error');
      }
    }

    if (investorDeckInput?.files && investorDeckInput.files[0]) {
      const file = investorDeckInput.files[0];
      if (ALLOWED_FILE_TYPES.includes(file.type)) {
        filesToUpload.push({
          file: file,
          documentType: 'investor_deck',
        });
      } else {
        investorDeckHelpText?.classList.add('is-error');
      }
    }

    if (capitalisationTableInput?.files && capitalisationTableInput.files[0]) {
      const file = capitalisationTableInput.files[0];
      if (ALLOWED_FILE_TYPES.includes(file.type)) {
        filesToUpload.push({
          file: file,
          documentType: 'cap_table',
        });
      } else {
        capitalisationTableHelpText?.classList.add('is-error');
      }
    }

    // Check if there are any invalid files
    const hasInvalidFiles =
      (managementBiosInput?.files &&
        managementBiosInput.files[0] &&
        !ALLOWED_FILE_TYPES.includes(managementBiosInput.files[0].type)) ||
      (investorDeckInput?.files &&
        investorDeckInput.files[0] &&
        !ALLOWED_FILE_TYPES.includes(investorDeckInput.files[0].type)) ||
      (capitalisationTableInput?.files &&
        capitalisationTableInput.files[0] &&
        !ALLOWED_FILE_TYPES.includes(capitalisationTableInput.files[0].type));

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
      if (managementBiosInput) managementBiosInput.value = '';
      if (investorDeckInput) investorDeckInput.value = '';
      if (capitalisationTableInput) capitalisationTableInput.value = '';

      // Reset helper text
      if (managementBiosHelpText) {
        managementBiosHelpText.textContent = '';
        managementBiosHelpText.classList.remove('is-error');
      }
      if (investorDeckHelpText) {
        investorDeckHelpText.textContent = '';
        investorDeckHelpText.classList.remove('is-error');
      }
      if (capitalisationTableHelpText) {
        capitalisationTableHelpText.textContent = '';
        capitalisationTableHelpText.classList.remove('is-error');
      }

      setTimeout(() => {
        submitButton.classList.remove('is-success');
        submitButton.value = 'UPLOAD DOCUMENTS';
        submitButton.disabled = false;
        navigateToPath('/invite-team-members');
      }, 900);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem uploading the documents';
      submitButton.disabled = false;
    }
  });
};

initTeamOwnershipPage();
