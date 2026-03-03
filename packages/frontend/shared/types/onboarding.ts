// Step 1: Company Info
export type OnboardingStep1Body = {
  legal_name: string;
  employee_count: 'just_me' | '2-10' | '11-50' | '51-100' | '101-500' | '501+';
  website?: string;
};

// Step 2: Business Details
export type OnboardingStep2Body = {
  years_in_business: string;
  asset_type: 'inventory' | 'accounts_receivable' | 'purchase_orders' | 'not_sure';
  desired_loan_amount: '1-5' | '5-10' | '10-25' | '25+';
};

// Step 3: Qualification
export type OnboardingStep3Body = {
  company_type: 'cpg' | 'distributor_wholesaler' | 'service_provider' | 'other';
  company_type_other?: string;
  revenue_qualification: 'yes' | 'no';
};

// Progress Response
export type OnboardingProgressResponse = {
  current_step: number;
  is_complete: boolean;
  is_qualified: boolean;
  is_rejected: boolean;
  rejection_reason: string | null;
  percentage: number;
  step1: {
    legal_name: string | null;
    employee_count: string | null;
    website: string | null;
  };
  step2: {
    years_in_business: string | null;
    asset_type: string | null;
    desired_loan_amount: string | null;
  };
  step3: {
    company_type: string | null;
    company_type_other: string | null;
    revenue_qualification: string | null;
  };
};

// API Response Types
export type OnboardingStep1Response = {
  message: string;
  application: {
    id: number;
    user_id: number;
    legal_name: string | null;
    employee_count: string | null;
    website: string | null;
    current_step: number;
    is_complete: boolean;
    is_qualified: boolean;
    is_rejected: boolean;
    created_at: string;
    updated_at: string;
  };
  current_step: number;
};

export type OnboardingStep2Response = {
  message: string;
  application: {
    id: number;
    user_id: number;
    years_in_business: string | null;
    asset_type: string | null;
    desired_loan_amount: string | null;
    current_step: number;
    is_complete: boolean;
    is_qualified: boolean;
    is_rejected: boolean;
    created_at: string;
    updated_at: string;
  };
  current_step: number;
};

export type OnboardingStep3Response = {
  success: boolean;
  message: string;
  rejection_reason?: string;
  application: {
    id: number;
    user_id: number;
    company_type: string | null;
    company_type_other: string | null;
    revenue_qualification: string | null;
    current_step: number;
    is_complete: boolean;
    is_qualified: boolean;
    is_rejected: boolean;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
  };
  current_step?: number;
  is_qualified?: boolean;
  is_rejected?: boolean;
};

export type OnboardingProgressApiResponse = {
  progress: OnboardingProgressResponse | null;
  message?: string;
};

export type OnboardingResetResponse = {
  message: string;
};

// Update Step
export type UpdateStepBody = {
  step: number; // 1-3
};

export type UpdateStepResponse = {
  message: string;
  application: {
    id: number;
    user_id: number;
    current_step: number;
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
    current_step: number;
    is_complete: boolean;
    created_at: string;
    updated_at: string;
  };
};
