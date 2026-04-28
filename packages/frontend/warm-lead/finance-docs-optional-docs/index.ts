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

const initOptionalDocsPage = async () => {
  constructNavBarClasses();
  processMiddleware();
  initCollapsibleSidebar();

  const form = document.querySelector('[dev-target="optional-docs-form"]');
  if (!form) {
    console.error('Optional docs form not found: [dev-target="optional-docs-form"]');
    return;
  }

  const instoreVelocityBox = queryElement<HTMLElement>(
    '[dev-target="instore-velocity-upload-box"]',
    form
  );
  const instoreVelocityInput = queryElement<HTMLInputElement>(
    '[dev-target="file-input"]',
    instoreVelocityBox ?? form
  );
  const instoreVelocityHelpText = queryElement<HTMLElement>(
    '[dev-target="instore-velocity-helper"]',
    form
  );

  const businessPlanBox = queryElement<HTMLElement>(
    '[dev-target="business-plan-upload-box"]',
    form
  );
  const businessPlanInput = queryElement<HTMLInputElement>(
    '[dev-target="file-input"]',
    businessPlanBox ?? form
  );
  const businessPlanHelpText = queryElement<HTMLElement>(
    '[dev-target="business-plan-helper"]',
    form
  );

  const submitButton = queryElement<HTMLInputElement>('[dev-target="submit-button"]', form);

  const requiredElements: [string, unknown][] = [
    ['[dev-target="instore-velocity-upload-box"]', instoreVelocityBox],
    ['[dev-target="file-input"] inside instore-velocity-upload-box', instoreVelocityInput],
    ['[dev-target="instore-velocity-helper"]', instoreVelocityHelpText],
    ['[dev-target="business-plan-upload-box"]', businessPlanBox],
    ['[dev-target="file-input"] inside business-plan-upload-box', businessPlanInput],
    ['[dev-target="business-plan-helper"]', businessPlanHelpText],
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
    !instoreVelocityBox ||
    !instoreVelocityInput ||
    !instoreVelocityHelpText ||
    !businessPlanBox ||
    !businessPlanInput ||
    !businessPlanHelpText ||
    !submitButton
  ) {
    return;
  }

  const updateHelperTexts = (progress: FinancialWizardProgressResponse | undefined) => {
    const placeholder = 'Supported formats: sheets, excel';
    instoreVelocityHelpText.textContent =
      progress?.team_ownership?.find((d) => d.document_type === 'instore_velocity_reports')
        ?.asset_name || placeholder;
    businessPlanHelpText.textContent =
      progress?.team_ownership?.find((d) => d.document_type === 'business_plan')?.asset_name ||
      placeholder;
  };

  let financialProgress: FinancialWizardProgressResponse | undefined;
  const loadFinancialProgress = async () => {
    const result = await checkProgressUserAndTeams();
    financialProgress = result?.financialProgress;
    updateHelperTexts(financialProgress);
  };

  const getDoc = (documentType: FinancialDocumentBody['document_type']) =>
    financialProgress?.team_ownership?.find((doc) => doc.document_type === documentType);

  await loadFinancialProgress();

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

  setupDropZone(instoreVelocityBox, instoreVelocityInput, instoreVelocityHelpText);
  setupDropZone(businessPlanBox, businessPlanInput, businessPlanHelpText);

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
    helperText.textContent = 'Deleting...';
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
    [instoreVelocityBox, 'instore_velocity_reports', instoreVelocityHelpText],
    [businessPlanBox, 'business_plan', businessPlanHelpText],
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
      page: 'team-ownership',
      document_type: documentType,
      asset_id: asset.id,
      file_data: base64Data,
      file_name: file.name,
      file_mime_type: file.type,
    };

    await apiUploadFinancialDocument(documentPayload);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    submitButton.classList.remove('is-error', 'is-success');
    submitButton.value = 'UPLOAD DOCUMENTS';

    const filesToUpload: Array<{
      file: File;
      documentType: FinancialDocumentBody['document_type'];
    }> = [];

    if (instoreVelocityInput.files?.[0]) {
      filesToUpload.push({
        file: instoreVelocityInput.files[0],
        documentType: 'instore_velocity_reports',
      });
    }
    if (businessPlanInput.files?.[0]) {
      filesToUpload.push({ file: businessPlanInput.files[0], documentType: 'business_plan' });
    }

    if (filesToUpload.length === 0) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Please select at least one file to upload';
      return;
    }

    try {
      submitButton.disabled = true;
      submitButton.value = 'Uploading...';

      await Promise.all(
        filesToUpload.map(({ file, documentType }) => uploadFile(file, documentType))
      );

      submitButton.classList.add('is-success');
      submitButton.value = 'Documents uploaded successfully!';

      instoreVelocityInput.value = '';
      businessPlanInput.value = '';
      instoreVelocityHelpText.textContent = '';
      businessPlanHelpText.textContent = '';

      setTimeout(() => {
        navigateToPath('/onboarding-complete');
      }, 500);
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
  initOptionalDocsPage().catch(console.error);
});
