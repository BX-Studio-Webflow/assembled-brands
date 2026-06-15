import type { FinancialWizardProgressResponse } from './financial-wizard';

export type DealApplicationStatus = 'active' | 'submitted' | 'archived' | 'superseded';

export type DealApplicationSummary = {
  id: number;
  deal_id: number;
  legal_name: string | null;
  application_link: string | null;
  status: DealApplicationStatus;
  created_at: string | null;
  updated_at: string | null;
};

export type DealApplicationsResponse = {
  applications: DealApplicationSummary[];
};

export type WarmLeadSessionResponse = {
  token: string;
  user: Record<string, unknown>;
  teams: { team_id: number }[];
  financialWizardProgress?: FinancialWizardProgressResponse | null;
  onboardingProgress?: {
    legal_name?: string | null;
    incorporation_state?: string | null;
  } | null;
};
