// Subset of the existing backend's financial-wizard + asset types, mirrored so
// this app can talk to the unchanged Hono backend. Source of truth lives in
// packages/frontend/shared/types/{asset,financial-wizard}.ts.

export type FinancePage =
  | "company-profile"
  | "financial-overview"
  | "financial-reports"
  | "accounts-inventory"
  | "ecommerce-performance"
  | "team-ownership";

export type FinanceDocumentType =
  // Financial Reports
  | "monthly_income_statement"
  | "monthly_balance_sheet"
  | "monthly_income_forecast"
  // Financial Forecasts (stored under the financial-reports page)
  | "income_statement_forecast"
  | "balance_sheet_full_year_forecast"
  // Accounts & Inventory
  | "monthly_inventory_report"
  | "accounts_receivable_aging"
  | "accounts_payable_aging"
  // E-Commerce Performance
  | "shopify_sales_over_time"
  | "shopify_first_vs_returning_customers"
  // Team & Ownership
  | "management_bios"
  | "investor_deck"
  | "cap_table"
  // Optional Documents (stored under the team-ownership page)
  | "instore_velocity_reports"
  | "business_plan";

export type FinancialDocument = {
  id: number;
  page: FinancePage;
  document_type: string;
  asset_url: string | null;
  asset_name: string | null;
};

export type BusinessProfile = {
  legal_name?: string | null;
  name?: string | null;
  headquarters?: string | null;
  year_formed?: string | null;
  description?: string | null;
  accounting_software?: string | null;
  other_accounting_software?: string | null;
  inventory_location?: "US-CA" | "International" | null;
  international_location?: string | null;
  raised_external_equity?: "yes" | "no" | null;
};

export type FinancialProgressResponse = {
  current_page: FinancePage;
  is_complete: boolean;
  percentage: number;
  company_profile: BusinessProfile | null;
  business: BusinessProfile | null | undefined;
  financial_reports: FinancialDocument[];
  accounts_inventory: FinancialDocument[];
  ecommerce_performance: FinancialDocument[];
  team_ownership: FinancialDocument[];
};

// Payload for POST /business/my (businessValidator). legal_name and
// accounting_software are required by the backend, so callers must merge the
// existing profile before sending.
export type BusinessUpsertBody = {
  legal_name: string;
  accounting_software: string;
  headquarters?: string;
  year_formed?: string;
  description?: string;
  other_accounting_software?: string;
  inventory_location?: "US-CA" | "International";
  international_location?: string;
  raised_external_equity?: "yes" | "no";
};

export type CreateAssetBody = {
  fileName: string;
  contentType: string;
  assetType: "document";
  fileSize: number;
  duration: number;
};

export type CreateAssetResponse = {
  asset: { id: number; asset_name: string };
  presignedUrl: string;
};

export type FinancialDocumentBody = {
  file_data: string;
  file_name: string;
  file_mime_type: string;
  page: FinancePage;
  document_type: FinanceDocumentType;
  asset_id: number;
};

export type FinancialDocumentResponse = {
  message: string;
  document: FinancialDocument;
};

// MIME constants mirroring WARM_LEAD_MIME in the existing bundle.
const MIME = {
  pdf: "application/pdf",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;

// Excel-only, mirroring WARM_LEAD_EXCEL_MIME_TYPES in the existing bundle.
export const EXCEL_MIME_TYPES = [MIME.xls, MIME.xlsx] as const;

export const EXCEL_ACCEPT = ".xls,.xlsx";
export const EXCEL_FORMAT_LABEL = "Supported formats: .xls, .xlsx";
export const EXCEL_INVALID_MESSAGE = "Invalid file type. Allowed format: Excel";

// A named set of accepted file types per upload zone, mirroring the warm-lead
// helpers. `key` is sent to the server so the upload proxy can re-validate.
export type FileRuleKey =
  | "excel"
  | "team_leadership"
  | "instore_velocity"
  | "business_plan";

export type FileRule = {
  key: FileRuleKey;
  mimeTypes: readonly string[];
  accept: string;
  formatLabel: string;
  invalidMessage: string;
};

export const FILE_RULES: Record<FileRuleKey, FileRule> = {
  excel: {
    key: "excel",
    mimeTypes: [MIME.xls, MIME.xlsx],
    accept: ".xls,.xlsx",
    formatLabel: "Allowed file formats: EXCEL",
    invalidMessage: "Invalid file type. Allowed file formats: EXCEL",
  },
  team_leadership: {
    key: "team_leadership",
    mimeTypes: [MIME.pdf, MIME.ppt, MIME.pptx, MIME.doc, MIME.docx, MIME.xls, MIME.xlsx],
    accept: ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx",
    formatLabel: "Allowed file formats: PDF, PPT, WORD, EXCEL",
    invalidMessage: "Invalid file type. Allowed file formats: PDF, PPT, WORD, EXCEL",
  },
  instore_velocity: {
    key: "instore_velocity",
    mimeTypes: [MIME.xlsx, MIME.xls, MIME.pdf],
    accept: ".xlsx,.xls,.pdf",
    formatLabel: "Allowed file formats: PDF, EXCEL",
    invalidMessage: "Invalid file type. Allowed file formats: PDF, EXCEL",
  },
  business_plan: {
    key: "business_plan",
    mimeTypes: [MIME.pdf, MIME.pptx],
    accept: ".pdf,.pptx",
    formatLabel: "Allowed file formats: PDF, PPT",
    invalidMessage: "Invalid file type. Allowed file formats: PDF, PPT",
  },
};

export const INTERNATIONAL_LOCATION_PLACEHOLDER = "London, UK or Shanghai, China";
