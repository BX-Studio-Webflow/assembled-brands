import type {
  FileRuleKey,
  FinanceDocumentType,
  FinancePage,
  FinancialProgressResponse,
} from "./financeTypes";

// One config drives every Document Upload Center page. Copy, document types,
// file rules, required-ness, examples and ordering all mirror the production
// warm-lead flow (source: packages/frontend/warm-lead/finance-docs-*).

export type DocumentNavKey =
  | "financial-reports"
  | "financial-forecasts"
  | "accounts-inventory"
  | "ecommerce-performance"
  | "team-ownership"
  | "optional-documents";

export type SectionDef = {
  docType: FinanceDocumentType;
  title: string;
  description: string;
  fileRule: FileRuleKey;
  required: boolean;
  // Example template under /public/examples (optional — omit if no sample).
  exampleFile?: string;
  exampleDownloadName?: string;
  exampleLabel?: string;
  // Only show/require this section when a question equals a value.
  conditionalOn?: { questionId: string; equals: string };
};

export type QuestionOption = { value: string; label: string };

export type QuestionDef = {
  id: string;
  businessField: "inventory_location" | "raised_external_equity";
  title: string;
  description: string;
  options: QuestionOption[];
  // Render this question immediately before the section with this docType.
  // The question always renders even if that section is conditionally hidden.
  anchorBeforeDocType: FinanceDocumentType;
  // Optional free-text field shown when the answer equals `whenValue`.
  freeText?: {
    whenValue: string;
    businessField: "international_location";
    label: string;
    placeholder: string;
  };
};

export type DocumentPageConfig = {
  key: DocumentNavKey;
  navLabel: string;
  route: string;
  title: string;
  // Backend financial-wizard page bucket (note: forecasts persist under
  // financial-reports; optional docs persist under team-ownership).
  backendPage: FinancePage;
  // Which progress array to read existing documents from.
  progressBucket:
    | "financial_reports"
    | "accounts_inventory"
    | "ecommerce_performance"
    | "team_ownership";
  sections: SectionDef[];
  questions?: QuestionDef[];
  // Next page in the flow (Save & Continue target). undefined => final step.
  nextKey?: DocumentNavKey;
};

const SAMPLE = "View a sample";

export const DOCUMENT_PAGES: Record<DocumentNavKey, DocumentPageConfig> = {
  "financial-reports": {
    key: "financial-reports",
    navLabel: "Financial Reports",
    route: "/documents/financial-reports",
    title: "Financial Reports",
    backendPage: "financial-reports",
    progressBucket: "financial_reports",
    nextKey: "financial-forecasts",
    sections: [
      {
        docType: "monthly_income_statement",
        title: "Monthly Income Statements",
        description:
          "Upload your monthly income statements for the past three (3) calendar years (starting from January).",
        fileRule: "excel",
        required: true,
        exampleFile: "financial-reports/income-statement.xlsx",
        exampleDownloadName: "Example Income Statement.xlsx",
        exampleLabel: `${SAMPLE} income statement`,
      },
      {
        docType: "monthly_balance_sheet",
        title: "Monthly Balance Sheets",
        description:
          "Provide your monthly balance sheets for the past three (3) calendar years (starting from January).",
        fileRule: "excel",
        required: true,
        exampleFile: "financial-reports/balance-sheet.xlsx",
        exampleDownloadName: "Example Balance Sheet.xlsx",
        exampleLabel: `${SAMPLE} balance sheet`,
      },
    ],
  },

  "financial-forecasts": {
    key: "financial-forecasts",
    navLabel: "Financial Forecasts",
    route: "/documents/financial-forecasts",
    title: "Financial Forecasts",
    backendPage: "financial-reports",
    progressBucket: "financial_reports",
    nextKey: "accounts-inventory",
    sections: [
      {
        docType: "income_statement_forecast",
        title: "Forecasted Income Statement",
        description:
          "Provide your projected monthly income statement for the next 12 calendar months (or longer, if available).",
        fileRule: "excel",
        required: true,
        exampleFile: "financial-forecasts/income-statement-projection.xlsx",
        exampleDownloadName: "Example Income Statement Forecast.xlsx",
        exampleLabel: `${SAMPLE} financial forecast`,
      },
      {
        docType: "balance_sheet_full_year_forecast",
        title: "Forecasted Balance Sheet",
        description:
          "Provide your projected monthly balance sheet for the next 12 calendar months (or longer, if available).",
        fileRule: "excel",
        required: true,
        exampleFile: "financial-forecasts/balance-sheet-projection.xlsx",
        exampleDownloadName: "Example Forecasted Balance Sheet.xlsx",
        exampleLabel: `${SAMPLE} forecasted balance sheet`,
      },
    ],
  },

  "accounts-inventory": {
    key: "accounts-inventory",
    navLabel: "Accounts & Inventory",
    route: "/documents/accounts-inventory",
    title: "Accounts & Inventory",
    backendPage: "accounts-inventory",
    progressBucket: "accounts_inventory",
    nextKey: "ecommerce-performance",
    questions: [
      {
        id: "inventory_location",
        businessField: "inventory_location",
        title: "Inventory Location",
        description: "Where is your company-owned inventory currently held?",
        anchorBeforeDocType: "accounts_receivable_aging",
        options: [
          { value: "US-CA", label: "United States / Canada (excluding Quebec)" },
          { value: "International", label: "International" },
        ],
        freeText: {
          whenValue: "International",
          businessField: "international_location",
          label: "City and country",
          placeholder: "London, UK or Shanghai, China",
        },
      },
    ],
    sections: [
      {
        docType: "monthly_inventory_report",
        title: "Inventory Reports",
        description: "Upload your inventory report for the most recent month-end.",
        fileRule: "excel",
        required: true,
        exampleFile: "accounts-inventory/inventory-report.xlsx",
        exampleDownloadName: "Example Inventory Report.xlsx",
        exampleLabel: `${SAMPLE} inventory report`,
      },
      {
        docType: "accounts_receivable_aging",
        title: "Accounts Receivable (A/R) Aging Reports",
        description:
          "Provide your accounts receivable aging report for the most recent month-end.",
        fileRule: "excel",
        required: true,
        exampleFile: "accounts-inventory/ar-aging-summary.xlsx",
        exampleDownloadName: "Example AR Aging Summary.xlsx",
        exampleLabel: `${SAMPLE} A/R aging report`,
      },
      {
        docType: "accounts_payable_aging",
        title: "Accounts Payable (A/P) Aging Reports",
        description:
          "Provide your accounts payable aging report for the most recent month-end.",
        fileRule: "excel",
        required: true,
        exampleFile: "accounts-inventory/ap-aging-summary.xlsx",
        exampleDownloadName: "Example AP Aging Summary.xlsx",
        exampleLabel: `${SAMPLE} A/P aging report`,
      },
    ],
  },

  "ecommerce-performance": {
    key: "ecommerce-performance",
    navLabel: "E-Commerce Performance",
    route: "/documents/ecommerce-performance",
    title: "E-Commerce Performance",
    backendPage: "ecommerce-performance",
    progressBucket: "ecommerce_performance",
    nextKey: "team-ownership",
    sections: [
      {
        docType: "shopify_sales_over_time",
        title: "Shopify Monthly Sales Reports",
        description:
          "Provide your monthly sales reports from Shopify covering at least the last 24 months (or longer, if available).",
        fileRule: "excel",
        required: true,
        exampleFile: "ecommerce-performance/shopify-monthly-sales.xlsx",
        exampleDownloadName: "Example Shopify Sales Report.xlsx",
        exampleLabel: `${SAMPLE} Shopify sales report`,
      },
      {
        docType: "shopify_first_vs_returning_customers",
        title: "Shopify Repeat Customer Reports",
        description:
          "Provide your new vs. repeat-customer breakdown reports from Shopify covering at least the last 24 months (or longer if available).",
        fileRule: "excel",
        required: true,
        exampleFile: "ecommerce-performance/shopify-repeat-customer.xlsx",
        exampleDownloadName: "Example Shopify Customer Report.xlsx",
        exampleLabel: `${SAMPLE} Shopify customer report`,
      },
    ],
  },

  "team-ownership": {
    key: "team-ownership",
    navLabel: "Team and Ownership",
    route: "/documents/team-ownership",
    title: "Team & Ownership",
    backendPage: "team-ownership",
    progressBucket: "team_ownership",
    nextKey: "optional-documents",
    questions: [
      {
        id: "raised_external_equity",
        businessField: "raised_external_equity",
        title: "Funding History",
        description: "Has your company raised external equity capital?",
        anchorBeforeDocType: "cap_table",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ],
    sections: [
      {
        docType: "management_bios",
        title: "Management Bios",
        description:
          "Provide a brief background summary for your core leadership team (including Founders, CEO, COO, CFO, CRO, CMO, etc.).",
        fileRule: "team_leadership",
        required: true,
      },
      {
        docType: "investor_deck",
        title: "Investor Deck",
        description: "Provide your most recent pitch deck or investor presentation.",
        fileRule: "team_leadership",
        required: false,
      },
      {
        docType: "cap_table",
        title: "Capitalization Table",
        description:
          "Provide your most recent capitalization table detailing current equity ownership.",
        fileRule: "excel",
        required: true,
        conditionalOn: { questionId: "raised_external_equity", equals: "yes" },
        exampleFile: "team-ownership/cap-table.xlsx",
        exampleDownloadName: "Example Cap Table.xlsx",
        exampleLabel: `${SAMPLE} cap table`,
      },
    ],
  },

  "optional-documents": {
    key: "optional-documents",
    navLabel: "Optional Documents",
    route: "/documents/optional-documents",
    title: "Optional Documents",
    backendPage: "team-ownership",
    progressBucket: "team_ownership",
    sections: [
      {
        docType: "instore_velocity_reports",
        title: "In-store velocity reports",
        description:
          "Provide any retail velocity data or reports (e.g., SPINS, IRI / Nielsen, Whole Foods Market, Walmart, Target, etc.).",
        fileRule: "instore_velocity",
        required: false,
        exampleFile: "optional-documents/in-store-velocity-report.xlsx",
        exampleDownloadName: "Example Velocity Report.xlsx",
        exampleLabel: `${SAMPLE} velocity report`,
      },
      {
        docType: "business_plan",
        title: "Business Plan",
        description: "Provide your formal business plan or operational summary, if available.",
        fileRule: "business_plan",
        required: false,
      },
    ],
  },
};

// Ordered list for the sidebar's Document Upload Center.
export const DOCUMENT_NAV_ORDER: DocumentNavKey[] = [
  "financial-reports",
  "financial-forecasts",
  "accounts-inventory",
  "ecommerce-performance",
  "team-ownership",
  "optional-documents",
];

export type SectionStatus = "complete" | "progress" | "empty";

// Whether a section's documents count as "required" right now (conditional
// sections like the cap table only count when their gating answer is set).
function isRequiredNow(
  section: SectionDef,
  profile: FinancialProgressResponse["company_profile"],
): boolean {
  if (!section.required) return false;
  if (!section.conditionalOn) return true;
  if (section.conditionalOn.questionId === "raised_external_equity") {
    return profile?.raised_external_equity === section.conditionalOn.equals;
  }
  return true;
}

// Per-page completion status for the sidebar / My Applications, derived from
// uploaded documents in the relevant progress bucket.
export function getDocumentSectionStatuses(
  progress: FinancialProgressResponse | null,
): Record<DocumentNavKey, SectionStatus> {
  const profile = progress?.company_profile ?? progress?.business ?? null;
  const result = {} as Record<DocumentNavKey, SectionStatus>;

  // A submitted application is fully done — every section reads complete.
  const appComplete = progress?.is_complete ?? false;

  for (const key of DOCUMENT_NAV_ORDER) {
    if (appComplete) {
      result[key] = "complete";
      continue;
    }

    const config = DOCUMENT_PAGES[key];
    const bucket = progress?.[config.progressBucket] ?? [];
    const hasDoc = (s: SectionDef) => bucket.some((d) => d.document_type === s.docType);
    const requiredSections = config.sections.filter((s) => isRequiredNow(s, profile));

    if (requiredSections.length > 0) {
      // Pages with required docs: complete only when all required docs are in.
      const uploaded = requiredSections.filter(hasDoc).length;
      result[key] =
        uploaded >= requiredSections.length ? "complete" : uploaded > 0 ? "progress" : "empty";
    } else {
      // Optional-only pages (e.g. Optional Documents): complete when every
      // section has a file, in progress when some do, empty otherwise.
      const uploaded = config.sections.filter(hasDoc).length;
      result[key] =
        config.sections.length > 0 && uploaded >= config.sections.length
          ? "complete"
          : uploaded > 0
            ? "progress"
            : "empty";
    }
  }

  return result;
}
