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

const FILE_TYPES = {
  pdf: 'application/pdf',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

const DOC_RULES: Record<
  'management_bios' | 'cap_table',
  { allowed: string[]; message: string; placeholder: string }
> = {
  management_bios: {
    allowed: [FILE_TYPES.doc, FILE_TYPES.docx, FILE_TYPES.pdf, FILE_TYPES.xls, FILE_TYPES.xlsx],
    message: 'Invalid file type. Allowed: WORD, PDF, or EXCEL',
    placeholder: 'Supported formats: WORD, PDF, EXCEL',
  },
  cap_table: {
    allowed: [FILE_TYPES.pdf, FILE_TYPES.xls, FILE_TYPES.xlsx],
    message: 'Invalid file type. Allowed: PDF or EXCEL',
    placeholder: 'Supported formats: PDF, EXCEL',
  },
};

const initTeamOwnershipPage = async () => {
  constructNavBarClasses();
  processMiddleware();
  initCollapsibleSidebar();

  const form = document.querySelector('[dev-target="team-ownership-form"]');
  if (!form) {
    console.error('Team & Ownership form not found: [dev-target="team-ownership-form"]');
    return;
  }

  const managementBiosBox = queryElement<HTMLElement>(
    '[dev-target="management-bios-upload-box"]',
    form
  );
  const managementBiosInput = queryElement<HTMLInputElement>(
    '[dev-target="file-input"]',
    managementBiosBox ?? form
  );
  const managementBiosHelpText = queryElement<HTMLElement>(
    '[dev-target="management-bios-helper"]',
    form
  );

  const capitalisationTableBox = queryElement<HTMLElement>(
    '[dev-target="capitalisation-table-upload-box"]',
    form
  );
  const capitalisationTableInput = queryElement<HTMLInputElement>(
    '[dev-target="file-input"]',
    capitalisationTableBox ?? form
  );
  const capitalisationTableHelpText = queryElement<HTMLElement>(
    '[dev-target="capitalisation-table-helper"]',
    form
  );

  const submitButton = queryElement<HTMLInputElement>('[dev-target="submit-button"]', form);

  const requiredElements: [string, unknown][] = [
    ['[dev-target="management-bios-upload-box"]', managementBiosBox],
    ['[dev-target="file-input"] inside management-bios-upload-box', managementBiosInput],
    ['[dev-target="management-bios-helper"]', managementBiosHelpText],
    ['[dev-target="capitalisation-table-upload-box"]', capitalisationTableBox],
    ['[dev-target="file-input"] inside capitalisation-table-upload-box', capitalisationTableInput],
    ['[dev-target="capitalisation-table-helper"]', capitalisationTableHelpText],
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
    !managementBiosBox ||
    !managementBiosInput ||
    !managementBiosHelpText ||
    !capitalisationTableBox ||
    !capitalisationTableInput ||
    !capitalisationTableHelpText ||
    !submitButton
  ) {
    return;
  }

  const updateHelperTexts = (progress: FinancialWizardProgressResponse | undefined) => {
    managementBiosHelpText.textContent =
      progress?.team_ownership?.find((d) => d.document_type === 'management_bios')?.asset_name ||
      DOC_RULES.management_bios.placeholder;
    capitalisationTableHelpText.textContent =
      progress?.team_ownership?.find((d) => d.document_type === 'cap_table')?.asset_name ||
      DOC_RULES.cap_table.placeholder;
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

  const updateHelperText = (
    input: HTMLInputElement,
    helperText: HTMLElement,
    documentType: 'management_bios' | 'cap_table'
  ) => {
    const file = input.files?.[0];
    if (!file) return;
    const rule = DOC_RULES[documentType];
    if (!rule.allowed.includes(file.type)) {
      helperText.textContent = rule.message;
      helperText.classList.add('is-error');
    } else {
      helperText.textContent = file.name;
      helperText.classList.remove('is-error');
    }
  };

  const setupDropZone = (
    box: HTMLElement,
    input: HTMLInputElement,
    helperText: HTMLElement,
    documentType: 'management_bios' | 'cap_table'
  ) => {
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
        updateHelperText(input, helperText, documentType);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    input.addEventListener('change', () => updateHelperText(input, helperText, documentType));
  };

  setupDropZone(managementBiosBox, managementBiosInput, managementBiosHelpText, 'management_bios');
  setupDropZone(
    capitalisationTableBox,
    capitalisationTableInput,
    capitalisationTableHelpText,
    'cap_table'
  );

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
    [managementBiosBox, 'management_bios', managementBiosHelpText],
    [capitalisationTableBox, 'cap_table', capitalisationTableHelpText],
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
    const rule =
      documentType === 'management_bios'
        ? DOC_RULES.management_bios
        : documentType === 'cap_table'
          ? DOC_RULES.cap_table
          : undefined;
    if (rule && !rule.allowed.includes(file.type)) {
      throw new Error(rule.message);
    }

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

    if (managementBiosInput.files?.[0]) {
      filesToUpload.push({ file: managementBiosInput.files[0], documentType: 'management_bios' });
    }

    if (capitalisationTableInput.files?.[0]) {
      filesToUpload.push({ file: capitalisationTableInput.files[0], documentType: 'cap_table' });
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

      managementBiosInput.value = '';
      capitalisationTableInput.value = '';
      managementBiosHelpText.textContent = '';
      capitalisationTableHelpText.textContent = '';

      setTimeout(() => {
        navigateToPath('/warm/finance-docs-optional-docs');
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
  initTeamOwnershipPage().catch(console.error);
});
