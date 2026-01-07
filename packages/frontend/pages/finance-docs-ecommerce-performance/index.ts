import type { AxiosError } from 'axios';
import { apiCreateAssetPresignedUrl } from 'shared/services/AssetService';
import { apiUploadFinancialDocument } from 'shared/services/FinancialWizardService';
import type { CreateAssetBody } from 'shared/types/asset';
import type {
  FinancialDocumentBody,
  FinancialWizardProgressResponse,
} from 'shared/types/financial-wizard';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import {
  checkProgressUserAndTeams,
  constructAdminSelect,
  constructNavBarClasses,
  fileToBase64,
} from '$utils/helpers';
import { queryElement } from '$utils/selectors';

const initEcommercePerformancePage = async () => {
  constructNavBarClasses();
  processMiddleware();

  //ONLY SHEET AND XLSX ALLOWED
  const ALLOWED_FILE_TYPES = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const form = document.querySelector('[dev-target="ecommerce-performance-form"]');
  if (!form) {
    console.error(
      'E-Commerce Performance form not found. Element: [dev-target="ecommerce-performance-form"] not found'
    );
    return;
  }

  // Get the two upload boxes and file inputs
  const shopifyRepeatBox = queryElement<HTMLElement>(
    '[dev-target="shopify-repeat-upload-box"]',
    form
  );
  const shopifyRepeatInput = queryElement<HTMLInputElement>(
    '[dev-target="shopify-repeat-input"]',
    form
  );
  const shopifyRepeatHelpText = queryElement<HTMLElement>(
    '[dev-target="shopify-repeat-helper"]',
    form
  );

  const shopifyMonthlyBox = queryElement<HTMLElement>(
    '[dev-target="shopify-monthly-upload-box"]',
    form
  );
  const shopifyMonthlyInput = queryElement<HTMLInputElement>(
    '[dev-target="shopify-monthly-input"]',
    form
  );
  const shopifyMonthlyHelpText = queryElement<HTMLElement>(
    '[dev-target="shopify-monthly-helper"]',
    form
  );

  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);

  if (!shopifyRepeatBox || !shopifyRepeatInput || !shopifyRepeatHelpText) {
    console.error(
      'Ensure [dev-target="shopify-repeat-upload-box"] and [dev-target="shopify-repeat-input"] and [dev-target="shopify-repeat-helper"] are present.'
    );
    return;
  }
  if (!shopifyMonthlyBox || !shopifyMonthlyInput || !shopifyMonthlyHelpText) {
    console.error(
      'Ensure [dev-target="shopify-monthly-upload-box"] and [dev-target="shopify-monthly-input"] and [dev-target="shopify-monthly-helper"] are present.'
    );
    return;
  }
  if (!submitButton) {
    console.error('Ensure [dev-target="submit-button"] is present.');
    return;
  }

  // Function to update helper texts based on financial progress
  const updateHelperTexts = (progress: FinancialWizardProgressResponse | undefined) => {
    if (progress?.ecommerce_performance) {
      const shopifyRepeat = progress.ecommerce_performance.find(
        (document) => document.document_type === 'shopify_repeat_customers'
      );
      if (shopifyRepeat) {
        shopifyRepeatHelpText.textContent = shopifyRepeat.asset_name || '';
      } else {
        shopifyRepeatHelpText.textContent = '';
      }
      const shopifyMonthly = progress.ecommerce_performance.find(
        (document) => document.document_type === 'shopify_monthly_sales'
      );
      if (shopifyMonthly) {
        shopifyMonthlyHelpText.textContent = shopifyMonthly.asset_name || '';
      } else {
        shopifyMonthlyHelpText.textContent = '';
      }
    } else {
      shopifyRepeatHelpText.textContent = '';
      shopifyMonthlyHelpText.textContent = '';
    }
  };

  let financialProgress: FinancialWizardProgressResponse | undefined;
  const loadFinancialProgress = async (userId?: string) => {
    const result = await checkProgressUserAndTeams(userId);
    financialProgress = result?.financialProgress;
    updateHelperTexts(financialProgress);
  };

  await loadFinancialProgress();
  constructAdminSelect(loadFinancialProgress);

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

  // Setup drag-and-drop for Shopify Repeat Customers
  if (shopifyRepeatBox && shopifyRepeatInput && shopifyRepeatHelpText) {
    shopifyRepeatBox.addEventListener('click', () => shopifyRepeatInput.click());

    shopifyRepeatBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      shopifyRepeatBox.classList.add('drag');
    });

    shopifyRepeatBox.addEventListener('dragleave', () => {
      shopifyRepeatBox.classList.remove('drag');
    });

    shopifyRepeatBox.addEventListener('drop', (e) => {
      e.preventDefault();
      shopifyRepeatBox.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        shopifyRepeatInput.files = e.dataTransfer.files;
        updateHelperText(shopifyRepeatInput, shopifyRepeatHelpText);
        shopifyRepeatInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Update helper text when file is selected via file picker
    shopifyRepeatInput.addEventListener('change', () => {
      updateHelperText(shopifyRepeatInput, shopifyRepeatHelpText);
    });
  }

  // Setup drag-and-drop for Shopify Monthly Sales
  if (shopifyMonthlyBox && shopifyMonthlyInput && shopifyMonthlyHelpText) {
    shopifyMonthlyBox.addEventListener('click', () => shopifyMonthlyInput.click());

    shopifyMonthlyBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      shopifyMonthlyBox.classList.add('drag');
    });

    shopifyMonthlyBox.addEventListener('dragleave', () => {
      shopifyMonthlyBox.classList.remove('drag');
    });

    shopifyMonthlyBox.addEventListener('drop', (e) => {
      e.preventDefault();
      shopifyMonthlyBox.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        shopifyMonthlyInput.files = e.dataTransfer.files;
        updateHelperText(shopifyMonthlyInput, shopifyMonthlyHelpText);
        shopifyMonthlyInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Update helper text when file is selected via file picker
    shopifyMonthlyInput.addEventListener('change', () => {
      updateHelperText(shopifyMonthlyInput, shopifyMonthlyHelpText);
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

    const base64 = await fileToBase64(file);

    // Step 3: Create financial document record
    const documentPayload: FinancialDocumentBody = {
      page: 'ecommerce-performance',
      document_type: documentType,
      asset_id: assetId,
      file_data: base64,
      file_name: file.name,
      file_mime_type: file.type,
    };

    await apiUploadFinancialDocument(documentPayload);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      shopifyRepeatBox?.classList.remove('is-error');
      shopifyMonthlyBox?.classList.remove('is-error');
      shopifyRepeatHelpText?.classList.remove('is-error');
      shopifyMonthlyHelpText?.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'UPLOAD DOCUMENTS';
    };

    // Reset errors on file change
    shopifyRepeatInput?.addEventListener('change', resetErrors, { once: true });
    shopifyMonthlyInput?.addEventListener('change', resetErrors, { once: true });

    const filesToUpload: Array<{
      file: File;
      documentType: FinancialDocumentBody['document_type'];
    }> = [];

    // Collect all files (only valid file types)
    if (shopifyRepeatInput?.files && shopifyRepeatInput.files[0]) {
      const file = shopifyRepeatInput.files[0];
      if (ALLOWED_FILE_TYPES.includes(file.type)) {
        filesToUpload.push({
          file: file,
          documentType: 'shopify_repeat_customers',
        });
      } else {
        shopifyRepeatHelpText?.classList.add('is-error');
      }
    }

    if (shopifyMonthlyInput?.files && shopifyMonthlyInput.files[0]) {
      const file = shopifyMonthlyInput.files[0];
      if (ALLOWED_FILE_TYPES.includes(file.type)) {
        filesToUpload.push({
          file: file,
          documentType: 'shopify_monthly_sales',
        });
      } else {
        shopifyMonthlyHelpText?.classList.add('is-error');
      }
    }

    // Check if there are any invalid files
    const hasInvalidFiles =
      (shopifyRepeatInput?.files &&
        shopifyRepeatInput.files[0] &&
        !ALLOWED_FILE_TYPES.includes(shopifyRepeatInput.files[0].type)) ||
      (shopifyMonthlyInput?.files &&
        shopifyMonthlyInput.files[0] &&
        !ALLOWED_FILE_TYPES.includes(shopifyMonthlyInput.files[0].type));

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
      if (shopifyRepeatInput) shopifyRepeatInput.value = '';
      if (shopifyMonthlyInput) shopifyMonthlyInput.value = '';

      // Reset helper text
      if (shopifyRepeatHelpText) {
        shopifyRepeatHelpText.textContent = '';
        shopifyRepeatHelpText.classList.remove('is-error');
      }
      if (shopifyMonthlyHelpText) {
        shopifyMonthlyHelpText.textContent = '';
        shopifyMonthlyHelpText.classList.remove('is-error');
      }

      setTimeout(() => {
        submitButton.classList.remove('is-success');
        submitButton.value = 'UPLOAD DOCUMENTS';
        submitButton.disabled = false;
        navigateToPath('/finance-docs-team-and-ownership');
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

window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    initEcommercePerformancePage();
  } catch (error) {
    console.error(error);
  }
});
