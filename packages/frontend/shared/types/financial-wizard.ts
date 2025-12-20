// Step 1: Financial Overview
export type FinancialStep1Body = {
  revenue_last_12_months: string;
  net_income_last_12_months: string;
  projected_revenue_next_12_months: string;
};

// Document Upload
export type FinancialDocumentBody = {
  page:
    | 'company-profile'
    | 'financial-overview'
    | 'financial-reports'
    | 'accounts-inventory'
    | 'ecommerce-performance'
    | 'team-ownership';
  document_type:
    | 'monthly_balance_sheet'
    | 'monthly_income_statement'
    | 'monthly_income_forecast'
    | 'monthly_inventory_report'
    | 'accounts_receivable_aging'
    | 'accounts_payable_aging'
    | 'shopify_repeat_customers'
    | 'shopify_monthly_sales'
    | 'management_bios'
    | 'investor_deck'
    | 'cap_table'
    | 'other';
  asset_id: number;
  notes?: string;
};

// Update Page
export type UpdatePageBody = {
  page:
    | 'company-profile'
    | 'financial-overview'
    | 'financial-reports'
    | 'accounts-inventory'
    | 'ecommerce-performance'
    | 'team-ownership';
};

// Document Type
export type FinancialDocument = {
  id: number;
  application_id: number;
  asset_id: number;
  page: string;
  document_type: string;
  is_current: boolean;
  version: number;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  asset_url: string | null;
  asset_name: string | null;
};

// Progress Response
export type FinancialWizardProgressResponse = {
  current_page: string;
  is_complete: boolean;
  percentage: number;
  step1: {
    revenue_last_12_months: string | null;
    net_income_last_12_months: string | null;
    projected_revenue_next_12_months: string | null;
  } | null;
  step2: FinancialDocument[];
  step3: FinancialDocument[];
  step4: FinancialDocument[];
  step5: FinancialDocument[];
};

// API Response Types
export type FinancialStep1Response = {
  message: string;
  overview: {
    id: number;
    application_id: number;
    revenue_last_12_months: string | null;
    net_income_last_12_months: string | null;
    projected_revenue_next_12_months: string | null;
    created_at: string;
    updated_at: string;
  };
};

export type FinancialDocumentResponse = {
  message: string;
  document: FinancialDocument;
};

export type FinancialDocumentsResponse = {
  documents: FinancialDocument[];
};

export type UpdatePageResponse = {
  message: string;
  application: {
    id: number;
    user_id: number;
    current_page: string;
    is_complete: boolean;
    created_at: string;
    updated_at: string;
  };
};

export type CompleteApplicationResponse = {
  message: string;
  application: {
    id: number;
    user_id: number;
    current_page: string;
    is_complete: boolean;
    created_at: string;
    updated_at: string;
  };
};

export type DeleteDocumentResponse = {
  message: string;
};
