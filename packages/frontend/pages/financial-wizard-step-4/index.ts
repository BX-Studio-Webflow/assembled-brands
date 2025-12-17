import type { AxiosError } from 'axios';
import { apiCreateAsset } from 'shared/services/AssetService';
import { apiUploadFinancialDocument } from 'shared/services/FinancialWizardService';
import type { CreateAssetBody } from 'shared/types/asset';
import type { FinancialDocumentBody } from 'shared/types/financial-wizard';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import { queryAllElements, queryElement } from '$utils/selectors';

const initFinancialWizardStep4Page = () => {
  processMiddleware();

  const form = document.querySelector('[dev-target="financial-wizard-step4-form"]');
  if (!form) {
    console.error(
      'Financial Wizard Step 4 form not found. Element: [dev-target="financial-wizard-step4-form"] not found'
    );
    return;
  }

  const documentTypeRadios = queryAllElements<HTMLInputElement>(
    'input[name="document_type"]',
    form
  );
  const fileInput = queryElement<HTMLInputElement>('[dev-target="file-input"]', form);
  const notesInput = queryElement<HTMLTextAreaElement>('[dev-target="notes-input"]', form);
  const submitButton = queryElement<HTMLButtonElement>('[dev-target="submit-button"]', form);
  const backButton = queryElement<HTMLButtonElement>('[dev-target="back-button"]', form);
  const continueButton = queryElement<HTMLButtonElement>('[dev-target="continue-button"]', form);

  if (!documentTypeRadios.length) {
    console.error(
      'Ensure [input[name="document_type"]] is present. Found ' +
        documentTypeRadios.length +
        ' elements.'
    );
    return;
  }
  if (!fileInput) {
    console.error('Ensure [dev-target="file-input"] is present.');
    return;
  }
  if (!submitButton) {
    console.error('Ensure [dev-target="submit-button"] is present.');
    return;
  }
  if (!backButton) {
    console.error('Ensure [dev-target="back-button"] is present.');
    return;
  }
  if (!continueButton) {
    console.error('Ensure [dev-target="continue-button"] is present.');
    return;
  }

  backButton.addEventListener('click', () => {
    navigateToPath('/financial-wizard-step-3');
  });

  continueButton.addEventListener('click', () => {
    navigateToPath('/financial-wizard-step-5');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const resetErrors = () => {
      fileInput.classList.remove('is-error');
      submitButton.classList.remove('is-error');
      submitButton.value = 'UPLOAD DOCUMENT';
    };

    fileInput.addEventListener('change', resetErrors, { once: true });
    documentTypeRadios.forEach((radio) => {
      radio.addEventListener('change', resetErrors, { once: true });
    });

    const selectedDocumentType = documentTypeRadios.find((radio) => radio.checked);
    if (!selectedDocumentType) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Document type is required';
      return;
    }

    if (!fileInput.files || !fileInput.files[0]) {
      fileInput.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Please select a file to upload';
      return;
    }

    const file = fileInput.files[0];
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      fileInput.classList.add('is-error');
      submitButton.classList.add('is-error');
      submitButton.value = 'Invalid file type. Please upload PDF, Word, Excel, or CSV files';
      return;
    }

    try {
      // Step 1: Create asset
      const assetPayload: CreateAssetBody = {
        fileName: file.name,
        contentType: file.type,
        assetType: 'document',
        fileSize: file.size,
        duration: 0,
      };

      const assetResponse = await apiCreateAsset(assetPayload);
      const assetId = assetResponse.asset.id;

      // Step 2: Upload file to asset (you'll need to implement multipart upload here)
      // For now, this is a placeholder - you'll need to handle the actual file upload
      // using multipart upload or direct upload based on your backend implementation

      // Step 3: Create financial document record
      const documentPayload: FinancialDocumentBody = {
        step: 4,
        document_type: selectedDocumentType.value as FinancialDocumentBody['document_type'],
        asset_id: assetId,
        ...(notesInput?.value ? { notes: notesInput.value } : {}),
      };

      await apiUploadFinancialDocument(documentPayload);

      submitButton.classList.add('is-success');
      submitButton.value = 'Document uploaded successfully!';

      // Reset form
      fileInput.value = '';
      if (notesInput) notesInput.value = '';
      documentTypeRadios.forEach((radio) => {
        radio.checked = false;
      });

      setTimeout(() => {
        submitButton.classList.remove('is-success');
        submitButton.value = 'UPLOAD DOCUMENT';
      }, 2000);
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
      submitButton.classList.add('is-error');
      submitButton.value = message || 'There was a problem uploading the document';
    }
  });
};

initFinancialWizardStep4Page();
