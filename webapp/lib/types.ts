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

// The launch flow only saves onboarding after a signed link has established a
// session. Deal-ID based creation is intentionally not exposed.
export type SubmitMode = "authenticated";

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
