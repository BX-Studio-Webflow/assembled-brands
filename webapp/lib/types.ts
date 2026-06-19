export type WarmLeadSessionResponse = {
  token: string;
  user: Record<string, unknown>;
  teams: { team_id: number }[];
};

export type OnboardingStep1 = {
  legal_name?: string | null;
  incorporation_state?: string | null;
  net_revenue_last_12_months?: string | null;
  working_with_team_member?: boolean | null;
  team_member_email?: string | null;
};

export type OnboardingProgressResponse = {
  progress?: {
    step1?: OnboardingStep1 | null;
    progress_data?: OnboardingStep1 | null;
  } | null;
};

// Submit mode mirrors the existing warm-lead bundle:
// - "authenticated": user already has a session -> POST /warm-lead/me
// - "create": first-time invite -> POST /warm-lead with deal_id
export type SubmitMode = "authenticated" | "create";

export type OnboardingFormValues = {
  legalName: string;
  incorporationState: string;
  netRevenue: string;
  workingWithTeamMember: boolean | null;
  teamMemberEmail: string;
};

export type OnboardingSubmitRequest = {
  mode: SubmitMode;
  dealId: number | null;
  values: OnboardingFormValues;
};
