import type { AxiosError } from 'axios';
import { apiCreateAssetPresignedUrl } from 'shared/services/AssetService';
import { apiUpdateBusiness } from 'shared/services/BusinessService';
import {
  apiDeleteFinancialDocument,
  apiUploadFinancialDocument,
} from 'shared/services/FinancialWizardService';
import type { CreateAssetBody } from 'shared/types/asset';
import type { UpdateBusinessRequest } from 'shared/types/business';
import type {
  FinancialDocumentBody,
  FinancialWizardProgressResponse,
} from 'shared/types/financial-wizard';

import { processMiddleware } from '$utils/auth';
import { navigateToPath } from '$utils/config';
import {
  checkProgressUserAndTeams,
  configureWarmLeadExcelFileInput,
  configureWarmLeadFileInputAccept,
  constructNavBarClasses,
  fileToBase64,
  initCollapsibleSidebar,
  WARM_LEAD_CAP_TABLE_FORMAT_LABEL,
  WARM_LEAD_CAP_TABLE_INVALID_MESSAGE,
  WARM_LEAD_EXCEL_MIME_TYPES,
  WARM_LEAD_TEAM_LEADERSHIP_ACCEPT,
  WARM_LEAD_TEAM_LEADERSHIP_FORMAT_LABEL,
  WARM_LEAD_TEAM_LEADERSHIP_INVALID_MESSAGE,
  WARM_LEAD_TEAM_LEADERSHIP_MIME_TYPES,
} from '$utils/helpers';
import { queryElement } from '$utils/selectors';

type TeamOwnershipDocType = 'management_bios' | 'investor_deck' | 'cap_table';

const DOC_RULES: Record<
  TeamOwnershipDocType,
  { allowed: readonly string[]; message: string; placeholder: string }
> = {
  management_bios: {
    allowed: WARM_LEAD_TEAM_LEADERSHIP_MIME_TYPES,
    message: WARM_LEAD_TEAM_LEADERSHIP_INVALID_MESSAGE,
    placeholder: WARM_LEAD_TEAM_LEADERSHIP_FORMAT_LABEL,
  },
  investor_deck: {
    allowed: WARM_LEAD_TEAM_LEADERSHIP_MIME_TYPES,
    message: WARM_LEAD_TEAM_LEADERSHIP_INVALID_MESSAGE,
    placeholder: WARM_LEAD_TEAM_LEADERSHIP_FORMAT_LABEL,
  },
  cap_table: {
    allowed: WARM_LEAD_EXCEL_MIME_TYPES,
    message: WARM_LEAD_CAP_TABLE_INVALID_MESSAGE,
    placeholder: WARM_LEAD_CAP_TABLE_FORMAT_LABEL,
  },
};

type RaisedExternalEquity = NonNullable<UpdateBusinessRequest['raised_external_equity']>;

const getBusinessProfile = (progress: FinancialWizardProgressResponse | undefined) =>
  progress?.company_profile ?? progress?.business ?? null;

const buildBusinessUpdatePayload = (
  profile: NonNullable<ReturnType<typeof getBusinessProfile>>,
  raisedExternalEquity: RaisedExternalEquity
): UpdateBusinessRequest => ({
  legal_name: profile.legal_name,
  headquarters: profile.headquarters ?? '',
  description: profile.description ?? '',
  year_formed: profile.year_formed ?? '',
  accounting_software: profile.accounting_software || 'other',
  other_accounting_software: profile.other_accounting_software ?? '',
  inventory_location: profile.inventory_location ?? undefined,
  international_location: profile.international_location ?? '',
  raised_external_equity: raisedExternalEquity,
});

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

  const investorDeckBox = queryElement<HTMLElement>(
    '[dev-target="investor-deck-upload-box"]',
    form
  );
  const investorDeckInput =
    queryElement<HTMLInputElement>('[dev-target="investor-deck-input"]', investorDeckBox ?? form) ??
    queryElement<HTMLInputElement>('[dev-target="file-input"]', investorDeckBox ?? form);
  const investorDeckHelpText = queryElement<HTMLElement>(
    '[dev-target="investor-deck-helper"]',
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
  const raisedExternalEquitySelect = queryElement<HTMLSelectElement>(
    'select[dev-target="company-raised-equity"]',
    form
  );
  const capTableWrapper = queryElement<HTMLElement>('[dev-target="cap-wrapper"]', form);

  const requiredElements: [string, unknown][] = [
    ['[dev-target="management-bios-upload-box"]', managementBiosBox],
    ['[dev-target="file-input"] inside management-bios-upload-box', managementBiosInput],
    ['[dev-target="management-bios-helper"]', managementBiosHelpText],
    ['[dev-target="investor-deck-upload-box"]', investorDeckBox],
    [
      '[dev-target="investor-deck-input"] or file-input in investor-deck-upload-box',
      investorDeckInput,
    ],
    ['[dev-target="investor-deck-helper"]', investorDeckHelpText],
    ['select[dev-target="company-raised-equity"]', raisedExternalEquitySelect],
    ['[dev-target="cap-wrapper"]', capTableWrapper],
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
    !investorDeckBox ||
    !investorDeckInput ||
    !investorDeckHelpText ||
    !raisedExternalEquitySelect ||
    !capTableWrapper ||
    !capitalisationTableBox ||
    !capitalisationTableInput ||
    !capitalisationTableHelpText ||
    !submitButton
  ) {
    return;
  }

  configureWarmLeadFileInputAccept(managementBiosInput, [...WARM_LEAD_TEAM_LEADERSHIP_ACCEPT]);
  configureWarmLeadFileInputAccept(investorDeckInput, [...WARM_LEAD_TEAM_LEADERSHIP_ACCEPT]);
  configureWarmLeadExcelFileInput(capitalisationTableInput);

  const requiresCapTable = () => raisedExternalEquitySelect.value === 'yes';

  const toggleCapTableSection = () => {
    capTableWrapper.classList.toggle('hide', !requiresCapTable());
  };

  const updateFundingHistoryFields = (progress: FinancialWizardProgressResponse | undefined) => {
    const profile = getBusinessProfile(progress);
    if (profile?.raised_external_equity) {
      raisedExternalEquitySelect.value = profile.raised_external_equity;
    }
    raisedExternalEquitySelect.dispatchEvent(new Event('change', { bubbles: true }));
    toggleCapTableSection();
  };

  raisedExternalEquitySelect.addEventListener('change', toggleCapTableSection);
  toggleCapTableSection();

  const getRaisedExternalEquityValue = (): RaisedExternalEquity | null => {
    raisedExternalEquitySelect.classList.remove('is-error');
    if (!raisedExternalEquitySelect.value) {
      raisedExternalEquitySelect.classList.add('is-error');
      return null;
    }
    return raisedExternalEquitySelect.value as RaisedExternalEquity;
  };

  const saveFundingHistory = async () => {
    const raisedExternalEquity = getRaisedExternalEquityValue();
    if (!raisedExternalEquity) {
      throw new Error('Please select whether your company has raised external equity capital');
    }

    const profile = getBusinessProfile(financialProgress);
    if (!profile?.legal_name) {
      throw new Error('Business profile not found');
    }

    await apiUpdateBusiness(buildBusinessUpdatePayload(profile, raisedExternalEquity));
  };

  const updateHelperTexts = (progress: FinancialWizardProgressResponse | undefined) => {
    managementBiosHelpText.textContent =
      progress?.team_ownership?.find((d) => d.document_type === 'management_bios')?.asset_name ||
      DOC_RULES.management_bios.placeholder;
    investorDeckHelpText.textContent =
      progress?.team_ownership?.find((d) => d.document_type === 'investor_deck')?.asset_name ||
      DOC_RULES.investor_deck.placeholder;
    capitalisationTableHelpText.textContent =
      progress?.team_ownership?.find((d) => d.document_type === 'cap_table')?.asset_name ||
      DOC_RULES.cap_table.placeholder;
  };

  let financialProgress: FinancialWizardProgressResponse | undefined;
  const loadFinancialProgress = async () => {
    const result = await checkProgressUserAndTeams();
    financialProgress = result?.financialProgress;
    updateHelperTexts(financialProgress);
    updateFundingHistoryFields(financialProgress);
  };

  const getDoc = (documentType: FinancialDocumentBody['document_type']) =>
    financialProgress?.team_ownership?.find((doc) => doc.document_type === documentType);

  await loadFinancialProgress();

  const updateHelperText = (
    input: HTMLInputElement,
    helperText: HTMLElement,
    documentType: TeamOwnershipDocType
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
    documentType: TeamOwnershipDocType
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
  setupDropZone(investorDeckBox, investorDeckInput, investorDeckHelpText, 'investor_deck');
  setupDropZone(
    capitalisationTableBox,
    capitalisationTableInput,
    capitalisationTableHelpText,
    'cap_table'
  );

  const getTeamOwnershipDocRule = (
    documentType: FinancialDocumentBody['document_type']
  ): (typeof DOC_RULES)[TeamOwnershipDocType] | undefined => {
    if (
      documentType === 'management_bios' ||
      documentType === 'investor_deck' ||
      documentType === 'cap_table'
    ) {
      return DOC_RULES[documentType];
    }
    return undefined;
  };

  const handleDeleteDocument = async (
    documentType: FinancialDocumentBody['document_type'],
    helperText: HTMLElement
  ) => {
    const doc = getDoc(documentType);
    const rule = getTeamOwnershipDocRule(documentType);
    if (!doc) {
      helperText.textContent = rule?.placeholder ?? '';
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
    [investorDeckBox, 'investor_deck', investorDeckHelpText],
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
    const rule = getTeamOwnershipDocRule(documentType);
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

    if (investorDeckInput.files?.[0]) {
      filesToUpload.push({ file: investorDeckInput.files[0], documentType: 'investor_deck' });
    }

    if (requiresCapTable() && capitalisationTableInput.files?.[0]) {
      filesToUpload.push({ file: capitalisationTableInput.files[0], documentType: 'cap_table' });
    }

    const raisedExternalEquity = getRaisedExternalEquityValue();
    if (!raisedExternalEquity) {
      submitButton.classList.add('is-error');
      submitButton.value = 'Please select whether your company has raised external equity capital';
      return;
    }

    const hasManagementBiosDoc =
      Boolean(managementBiosInput.files?.[0]) || Boolean(getDoc('management_bios'));
    const hasCapitalisationTableDoc =
      Boolean(capitalisationTableInput.files?.[0]) || Boolean(getDoc('cap_table'));
    const capTableRequired = raisedExternalEquity === 'yes';

    if (!hasManagementBiosDoc || (capTableRequired && !hasCapitalisationTableDoc)) {
      submitButton.classList.add('is-error');
      submitButton.value = capTableRequired
        ? 'Please upload all required documents'
        : 'Please upload your management bios';
      return;
    }

    if (filesToUpload.length === 0) {
      try {
        submitButton.disabled = true;
        submitButton.value = 'Saving...';
        await saveFundingHistory();
        submitButton.classList.add('is-success');
        submitButton.value = 'Saved Changes';
        setTimeout(() => {
          navigateToPath('/warm/finance-docs-optional-docs');
        }, 300);
      } catch (error) {
        const { message } = error as AxiosError;
        console.error(error);
        submitButton.classList.add('is-error');
        submitButton.value = message || 'There was a problem saving your funding history';
        submitButton.disabled = false;
      }
      return;
    }

    try {
      submitButton.disabled = true;
      submitButton.value = 'Uploading...';

      await saveFundingHistory();

      await Promise.all(
        filesToUpload.map(({ file, documentType }) => uploadFile(file, documentType))
      );

      submitButton.classList.add('is-success');
      submitButton.value = 'Documents uploaded successfully!';

      managementBiosInput.value = '';
      investorDeckInput.value = '';
      capitalisationTableInput.value = '';
      managementBiosHelpText.textContent = '';
      investorDeckHelpText.textContent = '';
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
