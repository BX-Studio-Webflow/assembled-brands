import { getFinancialProgress } from "./financeApi";
import {
  DOCUMENT_PAGES,
  getDocumentSectionStatuses,
  type DocumentNavKey,
  type DocumentPageConfig,
  type SectionStatus,
} from "./documentSections";
import type {
  BusinessProfile,
  FinanceDocumentType,
  FinancialDocument,
  FinancialProgressResponse,
} from "./financeTypes";

export type ExistingDoc = { id: number; name: string };

export type DocumentPageData = {
  config: DocumentPageConfig;
  companyName: string;
  contactEmail: string;
  percentage: number;
  initialDocs: Partial<Record<FinanceDocumentType, ExistingDoc | null>>;
  initialAnswers: Record<string, string>;
  businessProfile: BusinessProfile | null;
  sectionStatuses: Record<DocumentNavKey, SectionStatus>;
};

function findDoc(
  docs: FinancialDocument[] | undefined,
  type: FinanceDocumentType,
): ExistingDoc | null {
  const doc = docs?.find((d) => d.document_type === type);
  if (!doc) return null;
  return { id: doc.id, name: doc.asset_name ?? "Uploaded file" };
}

// Loads everything a Document Upload Center page needs: the page config, the
// already-uploaded documents (so nothing pops in), prior question answers, and
// the sidebar's company/progress data. Runs on the server.
export async function loadDocumentPageData(
  key: DocumentNavKey,
  token: string,
): Promise<DocumentPageData> {
  const config = DOCUMENT_PAGES[key];

  let progress: FinancialProgressResponse | null = null;
  try {
    progress = await getFinancialProgress(token);
  } catch {
    progress = null;
  }

  const profile = progress?.company_profile ?? progress?.business ?? null;
  const companyName =
    profile?.legal_name || profile?.name || "Your application";

  const bucket = progress?.[config.progressBucket];
  const initialDocs: Partial<Record<FinanceDocumentType, ExistingDoc | null>> = {};
  for (const section of config.sections) {
    initialDocs[section.docType] = findDoc(bucket, section.docType);
  }

  const initialAnswers: Record<string, string> = {};
  for (const question of config.questions ?? []) {
    if (question.businessField === "inventory_location" && profile?.inventory_location) {
      initialAnswers[question.id] = profile.inventory_location;
      if (profile.international_location) {
        initialAnswers.international_location = profile.international_location;
      }
    } else if (question.businessField === "raised_external_equity" && profile?.raised_external_equity) {
      initialAnswers[question.id] = profile.raised_external_equity;
    }
  }

  return {
    config,
    companyName,
    contactEmail: "Document Upload Center",
    percentage: progress?.percentage ?? 0,
    initialDocs,
    initialAnswers,
    businessProfile: profile,
    sectionStatuses: getDocumentSectionStatuses(progress),
  };
}
