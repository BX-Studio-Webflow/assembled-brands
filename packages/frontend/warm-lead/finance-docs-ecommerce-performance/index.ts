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

const initEcommercePerformancePage = async () => {
  constructNavBarClasses();
  processMiddleware();
  initCollapsibleSidebar();

  const form = document.querySelector('[dev-target="ecommerce-performance-form"]');
  if (!form) {
    console.error(
      'E-Commerce Performance form not found: [dev-target="ecommerce-performance-form"]'
    );
    return;
  }

  const salesOverTimeBox = queryElement<HTMLElement>(
    '[dev-target="shopify-repeat-upload-box"]',
    form
  );
  const salesOverTimeInput = queryElement<HTMLInputElement>(
    '[dev-target="file-input"]',
    salesOverTimeBox ?? form
  );
  const salesOverTimeHelpText = queryElement<HTMLElement>(
    '[dev-target="shopify-repeat-helper"]',
    form
  );

  const firstVsReturningBox = queryElement<HTMLElement>(
    '[dev-target="shopify-returning-upload-box"]',
    form
  );
  const firstVsReturningInput = queryElement<HTMLInputElement>(
    '[dev-target="file-input"]',
    firstVsReturningBox ?? form
  );
  const firstVsReturningHelpText = queryElement<HTMLElement>(
    '[dev-target="shopify-returning-helper"]',
    form
  );

  const submitButton = queryElement<HTMLInputElement>('[dev-target="submit-button"]', form);

  const requiredElements: [string, unknown][] = [
    ['[dev-target="shopify-repeat-upload-box"]', salesOverTimeBox],
    ['[dev-target="file-input"] inside shopify-repeat-upload-box', salesOverTimeInput],
    ['[dev-target="shopify-repeat-helper"]', salesOverTimeHelpText],
    ['[dev-target="shopify-monthly-upload-box"]', firstVsReturningBox],
    ['[dev-target="file-input"] inside shopify-monthly-upload-box', firstVsReturningInput],
    ['[dev-target="shopify-monthly-helper"]', firstVsReturningHelpText],
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
    !salesOverTimeBox ||
    !salesOverTimeInput ||
    !salesOverTimeHelpText ||
    !firstVsReturningBox ||
    !firstVsReturningInput ||
    !firstVsReturningHelpText ||
    !submitButton
  ) {
    return;
  }

  // --- Progress helpers ---

  const updateHelperTexts = (progress: FinancialWizardProgressResponse | undefined) => {
    const placeholder = 'Supported formats: sheets, excel';
    salesOverTimeHelpText.textContent =
      progress?.ecommerce_performance?.find((d) => d.document_type === 'shopify_sales_over_time')
        ?.asset_name || placeholder;
    firstVsReturningHelpText.textContent =
      progress?.ecommerce_performance?.find(
        (d) => d.document_type === 'shopify_first_vs_returning_customers'
      )?.asset_name || placeholder;
  };

  let financialProgress: FinancialWizardProgressResponse | undefined;
  const loadFinancialProgress = async () => {
    const result = await checkProgressUserAndTeams();
    financialProgress = result?.financialProgress;
    updateHelperTexts(financialProgress);
  };

  const getDoc = (documentType: FinancialDocumentBody['document_type']) =>
    financialProgress?.ecommerce_performance?.find((doc) => doc.document_type === documentType);

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

  // --- Drag-and-drop setup ---

  const setupDropZone = (box: HTMLElement, input: HTMLInputElement, helperText: HTMLElement) => {
    box.addEventListener('click', () => input.click());
    box.addEventListener('dragover', (e) => {
      e.preventDefault();
      box.classList.add('drag');
    });
    box.addEventListener('dragleave', () => box.classList.remove('drag'));
    box.addEventListener('drop', (e) => {
      e.preventDefault();
      box.classList.remove('drag');
      if (e.dataTransfer?.files.length) {
        input.files = e.dataTransfer.files;
        updateHelperText(input, helperText);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    input.addEventListener('change', () => updateHelperText(input, helperText));
  };

  setupDropZone(salesOverTimeBox, salesOverTimeInput, salesOverTimeHelpText);
  setupDropZone(firstVsReturningBox, firstVsReturningInput, firstVsReturningHelpText);

  // --- Delete handlers ---

  const handleDeleteDocument = async (
    documentType: FinancialDocumentBody['document_type'],
    helperText: HTMLElement
  ) => {
    const doc = getDoc(documentType);
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
    [salesOverTimeBox, 'shopify_sales_over_time', salesOverTimeHelpText],
    [firstVsReturningBox, 'shopify_first_vs_returning_customers', firstVsReturningHelpText],
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
      page: 'ecommerce-performance',
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

    if (salesOverTimeInput.files?.[0]) {
      filesToUpload.push({
        file: salesOverTimeInput.files[0],
        documentType: 'shopify_sales_over_time',
      });
    }
    if (firstVsReturningInput.files?.[0]) {
      filesToUpload.push({
        file: firstVsReturningInput.files[0],
        documentType: 'shopify_first_vs_returning_customers',
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

      salesOverTimeInput.value = '';
      firstVsReturningInput.value = '';
      salesOverTimeHelpText.textContent = '';
      firstVsReturningHelpText.textContent = '';

      setTimeout(() => {
        navigateToPath('/warm/finance-docs-team-and-ownership');
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
  initEcommercePerformancePage().catch(console.error);
});
