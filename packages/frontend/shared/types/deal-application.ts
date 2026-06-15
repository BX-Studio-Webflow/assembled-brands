export type DealApplicationStatus = 'active' | 'submitted' | 'archived' | 'superseded';

export type DealApplicationSummary = {
  id: number;
  deal_id: number;
  legal_name: string | null;
  status: DealApplicationStatus;
  created_at: string | null;
  updated_at: string | null;
};

export type DealApplicationsResponse = {
  applications: DealApplicationSummary[];
};
